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

// ─────────────────────────────────────────────────────────────────────────
// Wydarzenia Google Calendar — pomocniki (szukanie, edycja, usuwanie, duplikaty)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const GCAL_EV_BASE = 'https://www.googleapis.com/calendar/v3/calendars';

function evTimes(ev: any): { date: string; start: number; end: number } | null {
  const sdt = ev?.start?.dateTime;
  if (!sdt) return null;
  const toMin = (t: string) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
  const start = toMin(sdt);
  const end = ev?.end?.dateTime ? toMin(ev.end.dateTime) : start + 60;
  return { date: sdt.slice(0, 10), start, end: end > start ? end : start + 60 };
}

function evClientKey(ev: any): string {
  const summary = (ev.summary || '').trim();
  const sep = summary.indexOf(' — ');
  return (sep >= 0 ? summary.slice(0, sep) : summary).toLowerCase().trim();
}

async function gcalGetEvent(headers: any, calendarId: string, eventId: string): Promise<any | null> {
  const res = await fetch(`${GCAL_EV_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { headers, signal: AbortSignal.timeout(15000) });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}`);
  const ev: any = await res.json();
  return ev.status === 'cancelled' ? null : ev;
}

async function loadBookingByEvent(base44: any, artistId: string, from: string, to: string): Promise<Map<string, any>> {
  const res = await base44.entities.Booking.filter({ artist_id: artistId, session_date: { $gte: from, $lte: to } }, { limit: 500 });
  const map = new Map<string, any>();
  for (const b of asList(res)) {
    if (b.gcal_event_id && !map.has(b.gcal_event_id)) map.set(b.gcal_event_id, b);
  }
  return map;
}

async function findActiveBookingByEvent(base44: any, eventId: string): Promise<any | null> {
  const res = await base44.entities.Booking.filter({ gcal_event_id: eventId }, { limit: 20 }).catch(() => []);
  return asList(res).find((b: any) => b.status !== 'cancelled') || null;
}

function evBrief(ev: any, bookingByEvent: Map<string, any>): any {
  const s = parseSessionFromEvent(ev);
  const linked = bookingByEvent.get(ev.id) || null;
  const desc = (ev.description || '').trim();
  return {
    gcal_event_id: ev.id,
    title: (ev.summary || '').trim(),
    date: s ? s.session_date : (ev.start?.date || null),
    start_time: s ? s.session_time : null,
    end_time: s ? s.session_end_time : null,
    all_day: !s,
    description: desc ? desc.slice(0, 200) : '',
    created: ev.created || null,
    linked_booking: linked ? { id: linked.id, session_id: linked.session_id, client_name: linked.client_name, status: linked.status } : null,
  };
}

// Grupowanie duplikatów w obrębie jednego kalendarza (tylko wydarzenia z godziną).
// Duplikat = ten sam dzień ORAZ (to samo nazwisko klienta z tytułu LUB identyczne godziny).
// ZOSTAW = wydarzenie powiązane z rezerwacją (najpierw aktywną), w przeciwnym razie najstarsze.
function duplicateGroups(events: any[], bookingByEvent: Map<string, any>): any[] {
  const evs = events.filter((ev: any) => ev.start?.dateTime);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r) as string;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const ev of evs) parent.set(ev.id, ev.id);
  for (let i = 0; i < evs.length; i++) {
    for (let j = i + 1; j < evs.length; j++) {
      const ta = evTimes(evs[i]);
      const tb = evTimes(evs[j]);
      if (!ta || !tb || ta.date !== tb.date) continue;
      const ca = evClientKey(evs[i]);
      const cb = evClientKey(evs[j]);
      const nameMatch = !!ca && !!cb && (ca === cb || ca.includes(cb) || cb.includes(ca));
      const sameSlot = ta.start === tb.start && ta.end === tb.end;
      if (nameMatch || sameSlot) union(evs[i].id, evs[j].id);
    }
  }
  const byRoot = new Map<string, any[]>();
  for (const ev of evs) {
    const r = find(ev.id);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(ev);
  }
  const groups: any[] = [];
  for (const members of byRoot.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a: any, b: any) => String(a.created || '').localeCompare(String(b.created || '')));
    const keep = sorted.find((ev: any) => { const bk = bookingByEvent.get(ev.id); return bk && bk.status !== 'cancelled'; })
      || sorted.find((ev: any) => bookingByEvent.has(ev.id))
      || sorted[0];
    groups.push({
      date: evTimes(keep)?.date || null,
      keep: evBrief(keep, bookingByEvent),
      remove_candidates: members.filter((ev: any) => ev.id !== keep.id).map((ev: any) => evBrief(ev, bookingByEvent)),
    });
  }
  return groups;
}

function normalizeItems(raw: any[]): { artist_id: string; gcal_event_id: string }[] {
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : [])
    .map((it: any) => ({ artist_id: String(it?.artist_id || ''), gcal_event_id: String(it?.gcal_event_id || '') }))
    .filter((it: any) => it.artist_id && it.gcal_event_id)
    .filter((it: any) => {
      const k = `${it.artist_id}|${it.gcal_event_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a: any, b: any) => `${a.artist_id}|${a.gcal_event_id}`.localeCompare(`${b.artist_id}|${b.gcal_event_id}`));
}

function addMinutesTo(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

    // ─── WYDARZENIA GOOGLE CALENDAR: szukanie / edycja / usuwanie / duplikaty ───
    // Zakres dostępu jak przy scan/import: administrator — dowolny artysta,
    // artysta — wyłącznie własny kalendarz (serwer ignoruje/odrzuca obce ID).
    // System jest źródłem prawdy: wydarzeń powiązanych z AKTYWNĄ rezerwacją
    // nie edytuje się i nie usuwa bezpośrednio (funkcja zwraca błąd i kieruje
    // do zwykłej edycji rezerwacji). Operacje destrukcyjne są dwuetapowe.
    if ([
      'list_events', 'scan_duplicates',
      'plan_event_edit', 'execute_event_edit',
      'plan_event_delete', 'execute_event_delete',
      'plan_delete_duplicates', 'execute_delete_duplicates',
    ].includes(action)) {
      const evHeaders = await getCalendarHeaders(base44);
      if (!evHeaders) {
        return Response.json({ error: 'Brak połączonego konta Google Calendar — połączenie jest wspólne dla całego studia (zarządza nim administrator).' }, { status: 400 });
      }
      const inScope = (artistId: string) => !!artistId && (!forcedArtistId || artistId === forcedArtistId);
      const scopeError = () => Response.json({ error: 'Forbidden — dostęp ograniczony do własnego kalendarza artysty.' }, { status: 403 });

      // ── SZUKANIE wydarzeń ───────────────────────────────────────────
      if (action === 'list_events') {
        const fromD = (typeof body.date_from === 'string' && DATE_RE.test(body.date_from)) ? body.date_from : from;
        const toD = (typeof body.date_to === 'string' && DATE_RE.test(body.date_to)) ? body.date_to : to;
        const spanOk = fromD <= toD && (new Date(toD).getTime() - new Date(fromD).getTime()) <= 100 * 86400000;
        if (!spanOk) {
          return Response.json({ error: 'Nieprawidłowy zakres dat (date_from/date_to w formacie YYYY-MM-DD, maks. 100 dni, date_from przed date_to).' }, { status: 400 });
        }
        if (body.artist_id && !inScope(String(body.artist_id))) return scopeError();
        const targetIds: string[] | null = forcedArtistId ? [forcedArtistId] : (body.artist_id ? [String(body.artist_id)] : null);
        const artists = await resolveArtists(targetIds);
        const query = body.query ? String(body.query).toLowerCase().trim() : '';
        const out: any[] = [];
        for (const artist of artists) {
          if (!artist.gcal_calendar_id) {
            out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Artysta nie ma dedykowanego kalendarza Google.' });
            continue;
          }
          let events: any[] = [];
          try {
            events = await fetchEvents(evHeaders, artist.gcal_calendar_id, fromD, toD);
          } catch (e: any) {
            out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Nie udało się pobrać wydarzeń z kalendarza Google.' });
            continue;
          }
          const bookingByEvent = await loadBookingByEvent(base44, artist.id, fromD, toD);
          let briefs = events.map((ev: any) => evBrief(ev, bookingByEvent));
          if (query) briefs = briefs.filter((b: any) => `${b.title} ${b.description}`.toLowerCase().includes(query));
          out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: true, events: briefs, count: briefs.length });
        }
        return Response.json({
          status: 'ok', action: 'list_events', range: { from: fromD, to: toD }, artists: out,
          summary: { artists: out.filter((a: any) => a.calendar_ok).length, events: out.reduce((n: number, a: any) => n + (a.count || 0), 0) },
        });
      }

      // ── SKAN DUPLIKATÓW ─────────────────────────────────────────────
      if (action === 'scan_duplicates') {
        if (body.artist_id && !inScope(String(body.artist_id))) return scopeError();
        const targetIds: string[] | null = forcedArtistId ? [forcedArtistId] : (body.artist_id ? [String(body.artist_id)] : null);
        const artists = await resolveArtists(targetIds);
        const out: any[] = [];
        for (const artist of artists) {
          if (!artist.gcal_calendar_id) {
            out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Artysta nie ma dedykowanego kalendarza Google.' });
            continue;
          }
          let events: any[] = [];
          try {
            events = await fetchEvents(evHeaders, artist.gcal_calendar_id, from, to);
          } catch (e: any) {
            out.push({ artist_id: artist.id, artist_name: artist.name, calendar_ok: false, note: 'Nie udało się pobrać wydarzeń z kalendarza Google.' });
            continue;
          }
          const bookingByEvent = await loadBookingByEvent(base44, artist.id, from, to);
          const groups = duplicateGroups(events, bookingByEvent);
          out.push({
            artist_id: artist.id, artist_name: artist.name, calendar_ok: true,
            duplicate_groups: groups,
            group_count: groups.length,
            copies_to_remove: groups.reduce((n: number, g: any) => n + g.remove_candidates.length, 0),
          });
        }
        return Response.json({
          status: 'ok', action: 'scan_duplicates', range: { from, to }, artists: out,
          summary: {
            groups: out.reduce((n: number, a: any) => n + (a.group_count || 0), 0),
            copies_to_remove: out.reduce((n: number, a: any) => n + (a.copies_to_remove || 0), 0),
          },
          hint: 'Przedstaw każdą grupę (data, godzina, tytuł, ZOSTAW vs kopie do usunięcia). Po potwierdzeniu wywołaj plan_delete_duplicates z items=[{artist_id, gcal_event_id}] — TYLKO kopie, nigdy pole keep — a następnie execute_delete_duplicates z identycznymi items + confirm_token.',
        });
      }

      // ── EDYCJA wydarzenia (dwuetapowo) ──────────────────────────────
      if (action === 'plan_event_edit' || action === 'execute_event_edit') {
        const artistId = String(body.artist_id || '');
        if (!inScope(artistId)) {
          return Response.json({ error: 'Forbidden — możesz edytować wyłącznie wydarzenia z własnego kalendarza.' }, { status: 403 });
        }
        const eventId = String(body.gcal_event_id || '');
        if (!eventId) return Response.json({ error: 'Brak gcal_event_id wydarzenia.' }, { status: 400 });
        const artistRes = await base44.entities.Artist.filter({ id: artistId }, { limit: 1 });
        const artist = asList(artistRes)[0] || null;
        if (!artist || !artist.gcal_calendar_id) return Response.json({ error: 'Artysta nie ma dedykowanego kalendarza Google.' }, { status: 400 });

        const raw: any = body.changes || {};
        const changes: any = {};
        for (const k of ['summary', 'date', 'start_time', 'end_time']) {
          if (raw[k] !== undefined) changes[k] = raw[k];
        }
        if (Object.keys(changes).length === 0) {
          return Response.json({ error: 'Brak zmian — changes może zawierać: summary, date, start_time, end_time.' }, { status: 400 });
        }
        if (changes.summary !== undefined && !String(changes.summary).trim()) {
          return Response.json({ error: 'Tytuł (summary) nie może być pusty.' }, { status: 400 });
        }
        if (changes.date !== undefined && !DATE_RE.test(String(changes.date))) {
          return Response.json({ error: 'Data musi być w formacie YYYY-MM-DD.' }, { status: 400 });
        }
        for (const k of ['start_time', 'end_time']) {
          if (changes[k] !== undefined && !TIME_RE.test(String(changes[k]))) {
            return Response.json({ error: 'Godziny muszą być w formacie HH:MM.' }, { status: 400 });
          }
        }

        const ev = await gcalGetEvent(evHeaders, artist.gcal_calendar_id, eventId).catch(() => null);
        if (!ev) return Response.json({ error: 'Wydarzenie nie istnieje w kalendarzu artysty.' }, { status: 404 });
        const activeBk = await findActiveBookingByEvent(base44, eventId);
        if (activeBk) {
          return Response.json({
            error: `Wydarzenie jest powiązane z AKTYWNĄ rezerwacją (${activeBk.client_name}, ${activeBk.session_date} ${activeBk.session_time}). System jest źródłem prawdy — edytuj rezerwację (update Booking), a kalendarz zaktualizuje się automatycznie.`,
          }, { status: 400 });
        }

        const s = parseSessionFromEvent(ev);
        const current = { summary: (ev.summary || '').trim(), date: s ? s.session_date : (ev.start?.date || null), start_time: s ? s.session_time : null, end_time: s ? s.session_end_time : null, all_day: !s };
        const proposed = {
          summary: changes.summary !== undefined ? String(changes.summary).trim() : current.summary,
          date: changes.date !== undefined ? String(changes.date) : current.date,
          start_time: changes.start_time !== undefined ? String(changes.start_time) : current.start_time,
          end_time: changes.end_time !== undefined ? String(changes.end_time) : current.end_time,
        };
        if ((changes.date || changes.start_time || changes.end_time) && (!proposed.date || !proposed.start_time)) {
          return Response.json({ error: 'Wydarzenie całodniowe — do zmiany daty podaj także godziny (start_time, end_time).' }, { status: 400 });
        }

        const dat = { artist_id: artistId, gcal_event_id: eventId, changes };
        if (!body.confirm_token) {
          const confirm_token = await signToken(user.id, 'event_edit', 'CalendarEvent', dat, 'calendar-sync-confirm');
          return Response.json({
            status: 'awaiting_confirmation', action: 'plan_event_edit', artist_name: artist.name,
            current, proposed, changes,
            side_effects: [
              'Zmiana wydarzenia w Google Calendar jest natychmiastowa i bez historii zmian.',
              'Wydarzenie nie jest powiązane z rezerwacją w systemie, więc system pozostanie bez zmian.',
            ],
            confirm_token, expires_in_seconds: TOKEN_TTL_MS / 1000,
            hint: 'Przedstaw użytkownikowi aktualne i proponowane wartości. Po potwierdzeniu wywołaj action=execute_event_edit z DOKŁADNIE tymi samymi artist_id, gcal_event_id, changes oraz confirm_token.',
          });
        }

        const tokenOk = await verifyToken(String(body.confirm_token || ''), user.id, 'event_edit', 'CalendarEvent', dat, 'calendar-sync-confirm');
        if (!tokenOk) {
          return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję (plan_event_edit bez confirm_token) i wykonaj ponownie.' }, { status: 400 });
        }

        const startTime = proposed.start_time || '09:00';
        let endTime = proposed.end_time && proposed.end_time > startTime ? proposed.end_time : addMinutesTo(startTime, 60);
        const patch: any = {
          start: { dateTime: `${proposed.date}T${startTime}:00`, timeZone: 'Europe/Warsaw' },
          end: { dateTime: `${proposed.date}T${endTime}:00`, timeZone: 'Europe/Warsaw' },
        };
        if (changes.summary !== undefined) patch.summary = proposed.summary;
        const res = await fetch(`${GCAL_EV_BASE}/${encodeURIComponent(artist.gcal_calendar_id)}/events/${encodeURIComponent(eventId)}`, {
          method: 'PATCH', headers: evHeaders, body: JSON.stringify(patch), signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          return Response.json({ error: `Google Calendar API ${res.status} ${t.slice(0, 200)}` }, { status: 500 });
        }
        const updated = await res.json();
        // best-effort: odśwież powiązany szkic importu
        const draftsRes = await base44.asServiceRole.entities.CalendarImportDraft.filter({ gcal_event_id: eventId, status: 'open' }, { limit: 20 }).catch(() => []);
        for (const d of asList(draftsRes)) {
          const upd: any = {};
          if (changes.summary !== undefined) upd.event_title = proposed.summary;
          if (changes.date !== undefined) upd.session_date = changes.date;
          if (changes.start_time !== undefined) upd.session_time = changes.start_time;
          if (changes.end_time !== undefined) upd.session_end_time = changes.end_time;
          if (Object.keys(upd).length > 0) await base44.asServiceRole.entities.CalendarImportDraft.update(d.id, upd).catch(() => {});
        }
        return Response.json({ status: 'executed', action: 'execute_event_edit', event: evBrief(updated, new Map()), note: 'Wydarzenie zaktualizowane w Google Calendar. Nie było powiązane z rezerwacją, więc system pozostał bez zmian.' });
      }

      // ── USUWANIE wydarzeń (dwuetapowo, zbiorczo po jednym potwierdzeniu) ──
      if (action === 'plan_event_delete' || action === 'execute_event_delete') {
        const items = normalizeItems(body.items);
        if (items.length === 0) return Response.json({ error: 'Brak pozycji — przekaż items=[{artist_id, gcal_event_id}].' }, { status: 400 });
        if (items.some((it: any) => !inScope(it.artist_id))) return scopeError();
        const dat = { items };

        const artistsRes = await base44.entities.Artist.filter({ id: { $in: [...new Set(items.map((it: any) => it.artist_id))] } }, { limit: 20 });
        const artistMap = new Map(asList(artistsRes).map((a: any) => [a.id, a]));
        const valid: any[] = [];
        const rejected: any[] = [];
        for (const it of items) {
          const artist = artistMap.get(it.artist_id);
          if (!artist) { rejected.push({ ...it, reason: 'artist_not_found', note: 'Nieznany artysta.' }); continue; }
          if (!artist.gcal_calendar_id) { rejected.push({ ...it, reason: 'no_calendar', note: 'Artysta nie ma dedykowanego kalendarza Google.' }); continue; }
          const ev = await gcalGetEvent(evHeaders, artist.gcal_calendar_id, it.gcal_event_id).catch(() => null);
          if (!ev) { rejected.push({ ...it, reason: 'event_not_found', note: 'Wydarzenie nie istnieje w kalendarzu (może już usunięte).' }); continue; }
          const activeBk = await findActiveBookingByEvent(base44, it.gcal_event_id);
          if (activeBk) { rejected.push({ ...it, reason: 'linked_active_booking', note: `Powiązane z AKTYWNĄ rezerwacją (${activeBk.client_name}, ${activeBk.session_date} ${activeBk.session_time}) — anuluj lub edytuj rezerwację w systemie, nie usuwaj wydarzenia.` }); continue; }
          const s = parseSessionFromEvent(ev);
          valid.push({ ...it, artist_name: artist.name, title: (ev.summary || '').trim(), date: s ? s.session_date : (ev.start?.date || null), start_time: s ? s.session_time : null, end_time: s ? s.session_end_time : null });
        }
        if (valid.length === 0) {
          return Response.json({ error: 'Żadna pozycja nie przeszła walidacji.', rejected }, { status: 400 });
        }
        if (!body.confirm_token) {
          const confirm_token = await signToken(user.id, 'event_delete', 'CalendarEvent', dat, 'calendar-sync-confirm');
          return Response.json({
            status: 'awaiting_confirmation', action: 'plan_event_delete', to_delete: valid, rejected,
            side_effects: ['Usunięcie wydarzenia z Google Calendar jest nieodwracalne. System pozostaje bez zmian — usuwane są tylko wydarzenia niepowiązane z aktywnymi rezerwacjami.'],
            confirm_token, expires_in_seconds: TOKEN_TTL_MS / 1000,
            hint: 'Przedstaw pełną listę (data, godzina, tytuł, artysta). Po JEDNYM potwierdzeniu wywołaj action=execute_event_delete z identycznymi items oraz confirm_token.',
          });
        }
        const tokenOk = await verifyToken(String(body.confirm_token || ''), user.id, 'event_delete', 'CalendarEvent', dat, 'calendar-sync-confirm');
        if (!tokenOk) {
          return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nowy plan (plan_event_delete) i uzyskaj ponowne potwierdzenie.' }, { status: 400 });
        }
        const deleted: any[] = [];
        const errors: any[] = [];
        for (const it of valid) {
          const artist = artistMap.get(it.artist_id);
          const res = await fetch(`${GCAL_EV_BASE}/${encodeURIComponent(artist.gcal_calendar_id)}/events/${encodeURIComponent(it.gcal_event_id)}`, {
            method: 'DELETE', headers: evHeaders, signal: AbortSignal.timeout(15000),
          });
          if (res.ok || res.status === 204 || res.status === 404 || res.status === 410) {
            deleted.push({ artist_name: it.artist_name, title: it.title, date: it.date, start_time: it.start_time });
          } else {
            const t = await res.text().catch(() => '');
            errors.push(`${it.title}: DELETE ${res.status} ${t.slice(0, 100)}`);
          }
          // wyczyść powiązanie (tylko anulowane rezerwacje — aktywne zostały odrzucone wyżej)
          const bkRes = await base44.asServiceRole.entities.Booking.filter({ gcal_event_id: it.gcal_event_id }, { limit: 20 }).catch(() => []);
          for (const bk of asList(bkRes)) {
            if (bk.status === 'cancelled') await base44.asServiceRole.entities.Booking.update(bk.id, { gcal_event_id: '' }).catch(() => {});
          }
        }
        return Response.json({
          status: 'executed', action: 'execute_event_delete', deleted, rejected,
          errors: errors.slice(0, 5),
          summary: { deleted: deleted.length, rejected: rejected.length, errors: errors.length },
          note: 'Wydarzenia usunięte z Google Calendar. Rezerwacje w systemie pozostały bez zmian.',
        });
      }

      // ── USUWANIE DUPLIKATÓW (dwuetapowo; nigdy nie usuwa pola ZOSTAW) ──
      if (action === 'plan_delete_duplicates' || action === 'execute_delete_duplicates') {
        const items = normalizeItems(body.items);
        if (items.length === 0) return Response.json({ error: 'Brak pozycji — przekaż items=[{artist_id, gcal_event_id}] z wyniku scan_duplicates (tylko kopie do usunięcia).' }, { status: 400 });
        if (items.some((it: any) => !inScope(it.artist_id))) return scopeError();
        const dat = { items };
        const requested = new Set(items.map((it: any) => `${it.artist_id}|${it.gcal_event_id}`));

        const artistsRes = await base44.entities.Artist.filter({ id: { $in: [...new Set(items.map((it: any) => it.artist_id))] } }, { limit: 20 });
        const artistMap = new Map(asList(artistsRes).map((a: any) => [a.id, a]));
        const valid: any[] = [];
        const rejected: any[] = [];
        for (const [aid, artist] of artistMap) {
          const its = items.filter((x: any) => x.artist_id === aid);
          if (!artist.gcal_calendar_id) {
            for (const it of its) rejected.push({ ...it, reason: 'no_calendar', note: 'Artysta nie ma dedykowanego kalendarza Google.' });
            continue;
          }
          let events: any[] = [];
          try {
            events = await fetchEvents(evHeaders, artist.gcal_calendar_id, from, to);
          } catch (e: any) {
            for (const it of its) rejected.push({ ...it, reason: 'calendar_unavailable', note: 'Nie udało się pobrać kalendarza Google.' });
            continue;
          }
          const bookingByEvent = await loadBookingByEvent(base44, aid, from, to);
          const groups = duplicateGroups(events, bookingByEvent);
          const groupOf = new Map<string, any>();
          for (const g of groups) {
            for (const m of [g.keep, ...g.remove_candidates]) groupOf.set(`${aid}|${m.gcal_event_id}`, g);
          }
          for (const it of its) {
            const ev = events.find((e: any) => e.id === it.gcal_event_id);
            if (!ev) { rejected.push({ ...it, reason: 'event_not_found', note: 'Wydarzenie nie istnieje lub jest poza zakresem skanu.' }); continue; }
            const g = groupOf.get(`${aid}|${it.gcal_event_id}`);
            if (!g) { rejected.push({ ...it, reason: 'not_a_duplicate', note: 'Wydarzenie nie jest częścią grupy duplikatów — użyj plan_event_delete.' }); continue; }
            if (g.keep.gcal_event_id === it.gcal_event_id) { rejected.push({ ...it, reason: 'keep_event', note: 'To wydarzenie jest zalecane do ZACHOWANIA (powiązane z rezerwacją lub najstarsze) — usuwaj kopie, nie je.' }); continue; }
            const remaining = [g.keep, ...g.remove_candidates].filter((m: any) => !requested.has(`${aid}|${m.gcal_event_id}`));
            if (remaining.length === 0) { rejected.push({ ...it, reason: 'group_wiped', note: 'Odmowa — nie można usunąć WSZYSTKICH kopii grupy; zachowaj przynajmniej jedno wydarzenie (pole keep).' }); continue; }
            const activeBk = await findActiveBookingByEvent(base44, it.gcal_event_id);
            if (activeBk) { rejected.push({ ...it, reason: 'linked_active_booking', note: `Powiązane z AKTYWNĄ rezerwacją (${activeBk.client_name}, ${activeBk.session_date}).` }); continue; }
            const s = parseSessionFromEvent(ev);
            valid.push({ ...it, artist_name: artist.name, title: (ev.summary || '').trim(), date: s ? s.session_date : null, start_time: s ? s.session_time : null, end_time: s ? s.session_end_time : null });
          }
        }
        for (const it of items) {
          if (!artistMap.has(it.artist_id)) rejected.push({ ...it, reason: 'artist_not_found', note: 'Nieznany artysta.' });
        }
        if (valid.length === 0) {
          return Response.json({ error: 'Żadna pozycja nie przeszła walidacji.', rejected }, { status: 400 });
        }
        if (!body.confirm_token) {
          const confirm_token = await signToken(user.id, 'dup_delete', 'CalendarEvent', dat, 'calendar-sync-confirm');
          return Response.json({
            status: 'awaiting_confirmation', action: 'plan_delete_duplicates', to_delete: valid, rejected,
            side_effects: ['Usunięcie kopii duplikatów z Google Calendar jest nieodwracalne. Pole keep (zalecane do zachowania) pozostaje w kalendarzu.'],
            confirm_token, expires_in_seconds: TOKEN_TTL_MS / 1000,
            hint: 'Przedstaw listę kopii do usunięcia i które wydarzenie zostaje (pole keep). Po potwierdzeniu wywołaj action=execute_delete_duplicates z identycznymi items oraz confirm_token.',
          });
        }
        const tokenOk = await verifyToken(String(body.confirm_token || ''), user.id, 'dup_delete', 'CalendarEvent', dat, 'calendar-sync-confirm');
        if (!tokenOk) {
          return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nowy plan (plan_delete_duplicates) i uzyskaj ponowne potwierdzenie.' }, { status: 400 });
        }
        const deleted: any[] = [];
        const errors: any[] = [];
        for (const it of valid) {
          const artist = artistMap.get(it.artist_id);
          const res = await fetch(`${GCAL_EV_BASE}/${encodeURIComponent(artist.gcal_calendar_id)}/events/${encodeURIComponent(it.gcal_event_id)}`, {
            method: 'DELETE', headers: evHeaders, signal: AbortSignal.timeout(15000),
          });
          if (res.ok || res.status === 204 || res.status === 404 || res.status === 410) {
            deleted.push({ artist_name: it.artist_name, title: it.title, date: it.date, start_time: it.start_time });
          } else {
            const t = await res.text().catch(() => '');
            errors.push(`${it.title}: DELETE ${res.status} ${t.slice(0, 100)}`);
          }
        }
        return Response.json({
          status: 'executed', action: 'execute_delete_duplicates', deleted, rejected,
          errors: errors.slice(0, 5),
          summary: { deleted: deleted.length, rejected: rejected.length, errors: errors.length },
          note: 'Kopie duplikatów usunięte z Google Calendar. Wydarzenia zalecane do zachowania (keep) pozostały w kalendarzach.',
        });
      }
    }

    return Response.json({ error: `Nieznana akcja: "${action}". Dostępne: scan, plan_import, execute_import, list_events, scan_duplicates, plan_event_edit, execute_event_edit, plan_event_delete, execute_event_delete, plan_delete_duplicates, execute_delete_duplicates.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}