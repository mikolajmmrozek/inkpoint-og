import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { TOKEN_TTL_MS, signToken, verifyToken } from '../../shared/gatekeeperConfirm.ts';
import { asList, genSessionId } from '../../shared/gatekeeperData.ts';
import {
  scanWindow, getCalendarHeaders, fetchEvents, parseSessionFromEvent,
  findMatch, bookingInterval, sessionInterval, intervalsOverlap, categorizeArtist,
} from '../../shared/calendarSyncCore.ts';

// ─────────────────────────────────────────────────────────────────────────
// calendarSync — porównanie kalendarzy Google artystów z sesjami w systemie
// (zakres: miesiąc wstecz i miesiąc naprzód) oraz zbiorczy import brakujących
// sesji po JEDNYM potwierdzeniu całej listy (dwuetapowo, jak gatekeeperOps).
// Zakres dostępu weryfikowany po stronie serwera:
// - administrator: dowolny artysta (scan z artist_id lub wszyscy),
// - artysta: wyłącznie własny kalendarz i własne sesje.
// Wydarzenia bez wymaganych danych (e-mail klienta) zapisują się jako szkice
// (CalendarImportDraft) — szkice nie wysyłają powiadomień o rezerwacji.
// ─────────────────────────────────────────────────────────────────────────

function presentSession(s: any) {
  return {
    gcal_event_id: s.gcal_event_id,
    date: s.session_date,
    time: s.session_time,
    end_time: s.session_end_time,
    title: s.title,
    client_name: s.client_name,
    client_email: s.client_email,
    client_phone: s.client_phone,
    missing_fields: s.missing,
  };
}

async function closeDrafts(base44: any, gcalEventId: string, bookingId: string, artistId: string) {
  const res = await base44.asServiceRole.entities.CalendarImportDraft
    .filter({ gcal_event_id: gcalEventId, status: 'open' }, { limit: 50 })
    .catch(() => []);
  for (const d of asList(res)) {
    if (artistId && d.artist_id && d.artist_id !== artistId) continue;
    await base44.asServiceRole.entities.CalendarImportDraft
      .update(d.id, { status: 'imported', imported_booking_id: bookingId })
      .catch(() => {});
  }
}

// Buduje plan importu: waliduje każdą pozycję na świeżo (idempotentnie),
// odrzuca konflikty i duplikaty, dzieli na kompletne rezerwacje i szkice.
async function buildPlan(base44: any, items: any[], user: any) {
  const headers = await getCalendarHeaders(base44);
  if (!headers) throw new Error('Brak połączonego konta Google Calendar — połączenie jest wspólne dla całego studia.');

  const { from, to } = scanWindow();
  const isAdmin = user.role === 'admin';

  const byArtist = new Map<string, any[]>();
  for (const it of items) {
    if (!byArtist.has(it.artist_id)) byArtist.set(it.artist_id, []);
    byArtist.get(it.artist_id).push(it);
  }
  const artistsRes = await base44.entities.Artist.filter({ id: { $in: [...byArtist.keys()] } }, { limit: 20 });
  const artistMap = new Map(asList(artistsRes).map((a: any) => [a.id, a]));
  for (const aid of byArtist.keys()) {
    if (!artistMap.has(aid)) throw new Error(`Nieznany artysta: ${aid}`);
  }

  const to_create: any[] = [];
  const to_draft: any[] = [];
  const rejected: any[] = [];

  for (const [aid, its] of byArtist) {
    const artist: any = artistMap.get(aid);
    if (!artist.gcal_calendar_id) {
      for (const it of its) rejected.push({ ...it, reason: 'no_calendar', note: 'Artysta nie ma dedykowanego kalendarza Google.' });
      continue;
    }
    let events: any[] = [];
    try {
      events = await fetchEvents(headers, artist.gcal_calendar_id, from, to);
    } catch (e: any) {
      for (const it of its) rejected.push({ ...it, reason: 'calendar_unavailable', note: 'Nie udało się pobrać kalendarza Google.' });
      continue;
    }
    const evById = new Map(events.map((ev: any) => [ev.id, ev]));
    const bkRes = await base44.entities.Booking.filter({ artist_id: aid, session_date: { $gte: from, $lte: to } }, { limit: 500 });
    const bookings = asList(bkRes);
    const active = bookings.filter((b: any) => b.status !== 'cancelled');
    const cat = categorizeArtist(events, bookings);
    const conflictIds = new Set(cat.conflict.map((c: any) => (c.session ? c.session.gcal_event_id : null)).filter(Boolean));

    const planned: any[] = [];
    for (const it of its) {
      const ev: any = evById.get(it.gcal_event_id);
      if (!ev) {
        rejected.push({ ...it, reason: 'event_not_found', note: 'Wydarzenie nie istnieje w kalendarzu lub jest poza zakresem miesiąca wstecz/naprzód.' });
        continue;
      }
      const s: any = parseSessionFromEvent(ev);
      if (!s) {
        rejected.push({ ...it, reason: 'event_ignored', note: 'Wydarzenie całodniowe — nie jest sesją.' });
        continue;
      }
      const exists = bookings.some((b: any) => b.gcal_event_id === it.gcal_event_id) || !!findMatch(s, active).booking;
      if (exists) {
        rejected.push({ ...it, reason: 'already_in_system', note: 'Sesja istnieje już w systemie — nie tworzę duplikatu.' });
        continue;
      }
      if (conflictIds.has(it.gcal_event_id)) {
        rejected.push({ ...it, reason: 'conflict', note: 'Wydarzenie oznaczone jako konflikt — wymaga indywidualnej decyzji.' });
        continue;
      }
      const si = sessionInterval(s);
      if (si) {
        const overlapBk = active.find((b: any) => {
          const bi = bookingInterval(b);
          return bi && bi.date === si.date && intervalsOverlap(bi, si);
        });
        if (overlapBk) {
          rejected.push({ ...it, reason: 'time_conflict', note: `Koliduje z istniejącą sesją: ${overlapBk.client_name} (${overlapBk.session_date} ${overlapBk.session_time}).` });
          continue;
        }
        const intra = planned.some((p: any) => p.date === si.date && intervalsOverlap(p, si));
        if (intra) {
          rejected.push({ ...it, reason: 'time_conflict', note: 'Koliduje w czasie z inną pozycją tego importu.' });
          continue;
        }
        planned.push(si);
      }

      if (s.missing.length > 0) {
        to_draft.push({
          gcal_event_id: s.gcal_event_id,
          payload: {
            artist_id: aid,
            artist_name: artist.name,
            gcal_event_id: s.gcal_event_id,
            event_title: s.title,
            session_date: s.session_date,
            session_time: s.session_time,
            session_end_time: s.session_end_time,
            client_name: s.client_name || '',
            client_email: s.client_email || '',
            client_phone: s.client_phone || '',
            service_name: s.service_name || '',
            tattoo_description: s.tattoo_description || '',
            missing_fields: s.missing,
            status: 'open',
          },
        });
      } else {
        const payload: any = {
          session_id: genSessionId(),
          client_name: s.client_name,
          client_email: s.client_email,
          artist_id: aid,
          artist_name: artist.name,
          session_date: s.session_date,
          session_time: s.session_time,
          session_end_time: s.session_end_time || '',
          gcal_event_id: s.gcal_event_id,
          source: 'dashboard',
          status: 'confirmed',
          last_editor: 'dashboard',
          last_editor_id: user.id,
          last_editor_name: user.full_name || user.email || '',
          last_editor_role: isAdmin ? 'admin' : 'user',
        };
        if (s.client_phone) payload.client_phone = s.client_phone;
        if (s.service_name) payload.service_name = s.service_name;
        if (s.tattoo_description) payload.tattoo_description = s.tattoo_description;
        if (s.tattoo_placement) payload.tattoo_placement = s.tattoo_placement;
        if (s.estimated_price !== undefined) payload.estimated_price = s.estimated_price;
        if (s.session_duration) payload.session_duration = s.session_duration;
        to_create.push({ gcal_event_id: s.gcal_event_id, title: s.title, payload });
      }
    }
  }
  return { to_create, to_draft, rejected };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin';
    const forcedArtistId = !isAdmin ? (user.artist_id || null) : null;
    if (!isAdmin && !forcedArtistId) {
      return Response.json({ error: 'Forbidden — narzędzie dostępne dla administratorów oraz artystów z powiązanym profilem.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const { from, to } = scanWindow();

    async function resolveArtists(targetIds: string[] | null): Promise<any[]> {
      if (targetIds) {
        const res = await base44.entities.Artist.filter({ id: { $in: targetIds } }, { limit: 20 });
        return asList(res);
      }
      const res = await base44.entities.Artist.filter({ is_active: true }, { sort: 'order', limit: 100 });
      return asList(res);
    }

    // ── SCAN ───────────────────────────────────────────────────────
    if (action === 'scan') {
      if (forcedArtistId && body.artist_id && String(body.artist_id) !== forcedArtistId) {
        return Response.json({ error: 'Forbidden — możesz sprawdzać wyłącznie własny kalendarz.' }, { status: 403 });
      }
      const headers = await getCalendarHeaders(base44);
      if (!headers) {
        return Response.json({ error: 'Brak połączonego konta Google Calendar — połączenie jest wspólne dla całego studia (zarządza nim administrator).' }, { status: 400 });
      }
      const targetIds: string[] | null = forcedArtistId ? [forcedArtistId] : (body.artist_id ? [String(body.artist_id)] : null);
      const artists = await resolveArtists(targetIds);
      if (targetIds && artists.length === 0) return Response.json({ error: 'Nie znaleziono artysty o podanym identyfikatorze.' }, { status: 404 });

      const out: any[] = [];
      for (const artist of artists) {
        if (!artist.gcal_calendar_id) {
          out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Artysta nie ma dedykowanego kalendarza Google.' });
          continue;
        }
        let events: any[] = [];
        try {
          events = await fetchEvents(headers, artist.gcal_calendar_id, from, to);
        } catch (e: any) {
          out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Nie udało się pobrać wydarzeń z kalendarza Google.' });
          continue;
        }
        const bkRes = await base44.entities.Booking.filter({ artist_id: artist.id, session_date: { $gte: from, $lte: to } }, { limit: 500 });
        const bookings = asList(bkRes);
        const cat = categorizeArtist(events, bookings);
        const draftRes = await base44.asServiceRole.entities.CalendarImportDraft
          .filter({ artist_id: artist.id, status: 'open' }, { limit: 200 })
          .catch(() => []);
        const openDraftIds = new Set(asList(draftRes).map((d: any) => d.gcal_event_id));

        out.push({
          artist_id: artist.id,
          artist_name: artist.name,
          calendar_ok: true,
          missing: cat.missing.map((s: any) => ({ ...presentSession(s), has_open_draft: openDraftIds.has(s.gcal_event_id) })),
          mismatch: cat.mismatch.map((m: any) => ({
            booking_id: m.booking.id,
            session_id: m.booking.session_id,
            client_name: m.booking.client_name,
            event_title: m.session.title,
            event_date: m.session.session_date,
            event_time: m.session.session_time,
            gcal_event_id: m.session.gcal_event_id,
            diffs: m.diffs,
          })),
          conflict: cat.conflict.map((c: any) => ({
            gcal_event_id: c.session ? c.session.gcal_event_id : null,
            date: c.session ? c.session.session_date : null,
            time: c.session ? c.session.session_time : null,
            title: c.session ? c.session.title : (c.booking ? c.booking.client_name : ''),
            reason: c.reason,
            note: c.note,
            booking_id: c.booking ? c.booking.id : null,
          })),
          ignored_all_day: cat.ignored_all_day,
          bookings_without_event: cat.bookings_without_event,
        });
      }

      return Response.json({
        status: 'ok',
        action: 'scan',
        range: { from, to },
        artists: out,
        summary: {
          artists_scanned: out.filter((a: any) => a.calendar_ok).length,
          missing: out.reduce((n: number, a: any) => n + (a.missing?.length || 0), 0),
          mismatch: out.reduce((n: number, a: any) => n + (a.mismatch?.length || 0), 0),
          conflict: out.reduce((n: number, a: any) => n + (a.conflict?.length || 0), 0),
          bookings_without_event: out.reduce((n: number, a: any) => n + (a.bookings_without_event?.length || 0), 0),
        },
        hint: 'Brakujące sesje bez konfliktów można zaproponować do zbiorczego importu (action=plan_import, items=[{artist_id, gcal_event_id}]). Rozbieżności poprawia się zwykłą edycją rezerwacji (dwuetapowo). Konfliktów nie importuje się zbiorczo.',
      });
    }

    // ── PLAN_IMPORT / EXECUTE_IMPORT ────────────────────────────────
    if (action === 'plan_import' || action === 'execute_import') {
      const rawItems: any[] = Array.isArray(body.items) ? body.items : [];
      const items = rawItems
        .map((it: any) => ({ artist_id: String(it?.artist_id || ''), gcal_event_id: String(it?.gcal_event_id || '') }))
        .filter((it: any) => it.artist_id && it.gcal_event_id)
        .sort((a: any, b: any) => `${a.artist_id}|${a.gcal_event_id}`.localeCompare(`${b.artist_id}|${b.gcal_event_id}`));
      if (items.length === 0) {
        return Response.json({ error: 'Brak pozycji do importu — przekaż items=[{artist_id, gcal_event_id}] z wyniku skanu (bez konfliktów).' }, { status: 400 });
      }
      if (forcedArtistId && items.some((it: any) => it.artist_id !== forcedArtistId)) {
        return Response.json({ error: 'Forbidden — możesz importować wyłącznie wydarzenia z własnego kalendarza.' }, { status: 403 });
      }

      if (action === 'plan_import') {
        let plan;
        try {
          plan = await buildPlan(base44, items, user);
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 400 });
        }
        const confirm_token = await signToken(user.id, 'import', 'CalendarSync', { items }, 'calendar-sync-confirm');
        return Response.json({
          status: 'awaiting_confirmation',
          action: 'plan_import',
          to_create: plan.to_create.map((c: any) => ({
            artist_name: c.payload.artist_name,
            client_name: c.payload.client_name,
            client_email: c.payload.client_email,
            date: c.payload.session_date,
            time: c.payload.session_time,
            gcal_event_id: c.gcal_event_id,
          })),
          to_draft: plan.to_draft.map((d: any) => ({
            artist_name: d.payload.artist_name,
            event_title: d.payload.event_title,
            client_name: d.payload.client_name || null,
            date: d.payload.session_date,
            time: d.payload.session_time,
            missing_fields: d.payload.missing_fields,
            gcal_event_id: d.gcal_event_id,
          })),
          rejected: plan.rejected,
          confirm_token,
          expires_in_seconds: TOKEN_TTL_MS / 1000,
          hint: 'Przedstaw użytkownikowi pełną listę i po JEDNYM potwierdzeniu całej listy wywołaj action=execute_import z DOKŁADNIE tymi samymi items oraz confirm_token. Wydarzenia bez e-maila klienta zapiszą się jako szkice.',
        });
      }

      // execute_import
      const tokenOk = await verifyToken(String(body.confirm_token || ''), user.id, 'import', 'CalendarSync', { items }, 'calendar-sync-confirm');
      if (!tokenOk) {
        return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nowy plan (plan_import bez confirm_token), uzyskaj ponowne potwierdzenie i wykonaj ponownie.' }, { status: 400 });
      }
      let plan;
      try {
        plan = await buildPlan(base44, items, user);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
      }

      const created_bookings: any[] = [];
      const created_drafts: any[] = [];
      const skipped: any[] = [];
      for (const c of plan.to_create) {
        try {
          const created = await base44.entities.Booking.create(c.payload);
          created_bookings.push({ session_id: created.session_id, client_name: created.client_name, date: created.session_date, time: created.session_time });
          await closeDrafts(base44, c.payload.gcal_event_id, created.id, c.payload.artist_id);
        } catch (e: any) {
          skipped.push({ gcal_event_id: c.gcal_event_id, title: c.payload.client_name, reason: e.message });
        }
      }
      for (const d of plan.to_draft) {
        try {
          const created = await base44.entities.CalendarImportDraft.create(d.payload);
          created_drafts.push({ id: created.id, event_title: d.payload.event_title, date: d.payload.session_date, time: d.payload.session_time, missing_fields: d.payload.missing_fields });
        } catch (e: any) {
          skipped.push({ gcal_event_id: d.gcal_event_id, title: d.payload.event_title, reason: e.message });
        }
      }

      return Response.json({
        status: 'executed',
        action: 'execute_import',
        created_bookings,
        created_drafts,
        rejected: plan.rejected,
        skipped,
        summary: {
          created_bookings: created_bookings.length,
          created_drafts: created_drafts.length,
          rejected: plan.rejected.length,
          skipped: skipped.length,
        },
        note: 'Nowe rezerwacje uruchamiają standardowe procesy studia (powiadomienia, konwersacja z klientem, aktualizacja istniejącego wydarzenia w kalendarzu — bez duplikatów). Szkice nie wysyłają powiadomień.',
      });
    }

    return Response.json({ error: `Nieznana akcja: "${action}". Dostępne: scan, plan_import, execute_import.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}