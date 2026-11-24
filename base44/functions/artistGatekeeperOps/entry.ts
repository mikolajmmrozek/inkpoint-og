import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { TOKEN_TTL_MS, signToken, verifyToken } from '../../shared/gatekeeperConfirm.ts';
import { builtinFields, maskRecord, pick, genSessionId, asList, HEALTH_FORM_MASK, HEALTH_FORM_MASK_PATTERN } from '../../shared/gatekeeperData.ts';
import { previewSale, normalizePayments, recordSale, r2 } from '../../shared/shopSale.ts';

// ─────────────────────────────────────────────────────────────────────────
// artistGatekeeperOps — narzędzie Gatekeepera artysty.
// Serwer sam wyznacza artystę z zalogowanego użytkownika (user.artist_id) —
// identyfikatory artysty przekazane przez model są ZAWSZE ignorowane.
// Zakres: wyłącznie sesje przypisane do tego artysty i dane z nimi powiązane
// (klienci, ankiety, log audytu). Usuwanie sesji jest trwale zablokowane.
// Zwykła edycja i utworzenie sesji wykonuje się od razu; zmiany istotne
// wymagają dwuetapowego potwierdzenia (confirm_token, analogicznie do gatekeeperOps).
// ─────────────────────────────────────────────────────────────────────────

const HEALTH_CFG = { mask: HEALTH_FORM_MASK, maskPattern: HEALTH_FORM_MASK_PATTERN };

const BOOKING_REGULAR_FIELDS = ['tattoo_description', 'tattoo_placement', 'reference_images', 'notes', 'estimated_price'];
const BOOKING_SENSITIVE_FIELDS = [
  'client_name', 'client_email', 'client_phone', 'service_id', 'service_name',
  'session_date', 'session_time', 'session_end_time', 'session_duration',
  'status', 'deposit_amount', 'final_amount', 'payment_breakdown', 'is_settled',
];
const BOOKING_CREATE_FIELDS = ['session_id', 'gcal_event_id', ...BOOKING_REGULAR_FIELDS, ...BOOKING_SENSITIVE_FIELDS.filter(f => f !== 'status')];
const BOOKING_UPDATE_FIELDS = [...BOOKING_REGULAR_FIELDS, ...BOOKING_SENSITIVE_FIELDS];

const FILTERS: Record<string, string[]> = {
  Booking: ['session_id', 'client_name', 'client_email', 'client_phone', 'session_date', 'status', 'is_settled', 'health_form_completed'],
  Client: ['email', 'search'],
  HealthForm: ['booking_id', 'client_email', 'is_draft', 'is_read', 'procedure_type', 'form_number'],
  GuardianConsentForm: ['booking_id', 'guardian_name'],
  BookingAuditLog: ['booking_id', 'session_id', 'action', 'actor_type', 'client_name'],
  ArtistAvailability: ['type', 'day_of_week', 'date', 'end_date', 'is_available'],
  Service: ['name', 'category', 'is_active'],
  Artist: [],
  CalendarImportDraft: ['status', 'session_date', 'gcal_event_id'],
  ShopProduct: ['name', 'sku', 'category_name', 'is_active', 'price', 'order'],
  Event: [],
  EventSession: ['event_id', 'date', 'status'],
  EventBooking: ['event_id', 'session_id', 'status', 'session_date', 'email'],
};

// Terminy ofert, w których artysta jest prowadzącym (serwerowe zawężenie zakresu)
async function ownEventSessions(base44: any, artistId: string): Promise<any[]> {
  const res: any = await base44.asServiceRole.entities.EventSession.list('date', 500).catch(() => []);
  return asList(res).filter((s: any) => (s.leader_ids || []).includes(artistId));
}

function notFound(entityName: string) {
  return Response.json({ error: `Rekord ${entityName} nie istnieje lub nie należy do Twoich sesji.` }, { status: 404 });
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'artist' || !user.artist_id) {
      return Response.json({ error: 'Forbidden — narzędzie dostępne wyłącznie dla artystów z powiązanym profilem.' }, { status: 403 });
    }
    let artist: any = null;
    try { artist = await base44.entities.Artist.get(user.artist_id); } catch (_) {}
    if (!artist) return Response.json({ error: 'Forbidden — brak powiązania konta z profilem artysty.' }, { status: 403 });
    const artistId = user.artist_id;
    const artistName = artist.name || '';

    const body = await req.json();
    const action = String(body.action || '');
    const entityName = String(body.entity || '');

    // Wszystkie własne sesje (podstawa zakresu; paginacja do 1000 rekordów)
    async function ownBookings(): Promise<any[]> {
      const out: any[] = [];
      let cursor: any = null;
      for (let i = 0; i < 5; i++) {
        const opts: any = { sort: '-created_date', limit: 500 };
        if (cursor) opts.cursor = cursor;
        const res: any = await base44.entities.Booking.filter({ artist_id: artistId }, opts);
        out.push(...(Array.isArray(res) ? res : (res?.items || [])));
        if (Array.isArray(res) || !res?.has_more || !res?.next_cursor) break;
        cursor = res.next_cursor;
      }
      return out;
    }

    // ── ODCZYT ─────────────────────────────────────────────────────
    if (action === 'search' || action === 'get') {
      const allowedFilters = FILTERS[entityName];
      if (!allowedFilters) {
        return Response.json({ error: `Nieznana lub niedostępna encja: "${entityName}". Dostępne: ${Object.keys(FILTERS).join(', ')}` }, { status: 400 });
      }

      if (action === 'search') {
        const filters = body.filters || {};
        const bad = Object.keys(filters).filter(k => !allowedFilters.includes(k));
        if (bad.length > 0) {
          return Response.json({ error: `Niedozwolone pola filtra: ${bad.join(', ')}. Dozwolone: ${allowedFilters.join(', ')}` }, { status: 400 });
        }
        const rawSort = typeof body.sort === 'string' ? body.sort : '-created_date';
        const sortField = rawSort.replace(/^-/, '');
        const allowedSort = [...new Set([...allowedFilters, ...builtinFields, 'session_time', 'form_filled_date'])];
        if (!allowedSort.includes(sortField)) return Response.json({ error: `Niedozwolone sortowanie: ${rawSort}` }, { status: 400 });
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);

        let items: any[] = [];
        let masked = false;

        if (entityName === 'Booking') {
          const res: any = await base44.entities.Booking.filter({ artist_id: artistId, ...filters }, { sort: rawSort, limit });
          items = (Array.isArray(res) ? res : (res?.items || [])).slice(0, limit);
        } else if (entityName === 'Client') {
          // Artyści mają dostęp do wszystkich klientów studia (nie tylko własnych sesji)
          const res: any = await base44.entities.Client.filter({}, { sort: rawSort, limit: 500 });
          let out = Array.isArray(res) ? res : (res?.items || []);
          if (filters.email) out = out.filter(c => (c.email || '').toLowerCase() === String(filters.email).toLowerCase());
          if (filters.search) {
            const q = String(filters.search).toLowerCase();
            out = out.filter(c => `${c.first_name || ''} ${c.last_name || ''} ${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(q));
          }
          items = out.slice(0, limit);
        } else if (entityName === 'HealthForm' || entityName === 'GuardianConsentForm') {
          const bookings = await ownBookings();
          const ids = bookings.map(b => b.id);
          if (filters.booking_id && !ids.includes(filters.booking_id)) {
            items = [];
          } else {
            const query: any = { booking_id: { $in: ids } };
            if (filters.booking_id) query.booking_id = filters.booking_id;
            if (filters.client_email) query.client_email = filters.client_email;
            if (filters.is_draft !== undefined) query.is_draft = filters.is_draft;
            if (filters.is_read !== undefined) query.is_read = filters.is_read;
            if (filters.procedure_type) query.procedure_type = filters.procedure_type;
            if (filters.form_number) query.form_number = filters.form_number;
            if (filters.guardian_name) query.guardian_name = filters.guardian_name;
            const res: any = await base44.entities[entityName].filter(query, { sort: rawSort, limit });
            items = (Array.isArray(res) ? res : (res?.items || [])).slice(0, limit);
          }
          masked = !body.include_sensitive;
        } else if (entityName === 'BookingAuditLog') {
          const bookings = await ownBookings();
          const ids = bookings.map(b => b.id);
          const query: any = { booking_id: { $in: ids } };
          if (filters.session_id) query.session_id = filters.session_id;
          if (filters.action) query.action = filters.action;
          if (filters.actor_type) query.actor_type = filters.actor_type;
          if (filters.client_name) query.client_name = filters.client_name;
          // Log audytu jest admin-only na poziomie RLS — odczyt przez service role z serwerowym zawężeniem do własnych sesji
          const res: any = await base44.asServiceRole.entities.BookingAuditLog.filter(query, { sort: rawSort, limit });
          items = (Array.isArray(res) ? res : (res?.items || [])).slice(0, limit);
        } else if (entityName === 'ArtistAvailability') {
          const res: any = await base44.entities.ArtistAvailability.filter({ artist_id: artistId, ...filters }, { sort: rawSort, limit });
          items = (Array.isArray(res) ? res : (res?.items || [])).slice(0, limit);
        } else if (entityName === 'Service') {
          const query: any = {};
          if (filters.category) query.category = filters.category;
          if (filters.is_active !== undefined) query.is_active = filters.is_active;
          const res: any = await base44.entities.Service.filter(query, { sort: rawSort, limit: 200 });
          let out = (Array.isArray(res) ? res : (res?.items || []));
          if (filters.name) out = out.filter(s => (s.name || '').toLowerCase().includes(String(filters.name).toLowerCase()));
          items = out.slice(0, limit);
        } else if (entityName === 'CalendarImportDraft') {
          // Szkice importu z kalendarza własnych sesji — odczyt przez service role z serwerowym zawężeniem
          const query: any = { artist_id: artistId };
          if (filters.status) query.status = filters.status;
          if (filters.session_date) query.session_date = filters.session_date;
          if (filters.gcal_event_id) query.gcal_event_id = filters.gcal_event_id;
          const res: any = await base44.asServiceRole.entities.CalendarImportDraft.filter(query, { sort: rawSort, limit });
          items = (Array.isArray(res) ? res : (res?.items || [])).slice(0, limit);
        } else if (entityName === 'ShopProduct') {
          // Artysta widzi katalog (nazwa, cena, stan) — wyłącznie do sprzedaży.
          const query: any = {};
          if (filters.is_active !== undefined) query.is_active = filters.is_active;
          if (filters.category_name) query.category_name = filters.category_name;
          const res: any = await base44.entities.ShopProduct.filter(query, { sort: rawSort, limit: 300 });
          let out = asList(res);
          if (filters.name) out = out.filter((p: any) => (p.name || '').toLowerCase().includes(String(filters.name).toLowerCase()));
          if (filters.price !== undefined) out = out.filter((p: any) => Number(p.price) === Number(filters.price));
          // SKU = kod kreskowy produktu albo wariantu — sprzedaż i wyszukiwanie po kodzie
          if (filters.sku) {
            const code = String(filters.sku).trim();
            out = out.filter((p: any) => String(p.sku || '').trim() === code
              || (p.variants || []).some((v: any) => String(v.sku || '').trim() === code));
          }
          items = out.slice(0, limit);
        } else if (entityName === 'Artist') {
          items = [artist];
        } else if (entityName === 'Event') {
          // Oferty prowadzone przez artystę (RLS ofert dopuszcza artystom tylko opublikowane — czytamy przez service role z zawężeniem)
          const res: any = await base44.asServiceRole.entities.Event.list('order', 200).catch(() => []);
          items = asList(res).filter((e: any) => (e.leader_ids || []).includes(artistId)).slice(0, limit);
        } else if (entityName === 'EventSession') {
          const own = await ownEventSessions(base44, artistId);
          items = own.filter((s: any) =>
            (!filters.event_id || s.event_id === filters.event_id) &&
            (!filters.date || s.date === filters.date) &&
            (!filters.status || s.status === filters.status)
          ).slice(0, limit);
        } else if (entityName === 'EventBooking') {
          const own = await ownEventSessions(base44, artistId);
          const ids = own.map((s: any) => s.id);
          const query: any = { session_id: { $in: ids } };
          if (filters.session_id) query.session_id = filters.session_id;
          if (filters.event_id) query.event_id = filters.event_id;
          if (filters.status) query.status = filters.status;
          if (filters.session_date) query.session_date = filters.session_date;
          if (filters.email) query.email = filters.email;
          // Zapisy na oferty: RLS czyta tylko własne konta/adminowi — artysta przez service role z zawężeniem do własnych terminów
          const res: any = await base44.asServiceRole.entities.EventBooking.filter(query, { sort: rawSort, limit });
          items = asList(res).slice(0, limit);
        }

        return Response.json({
          entity: entityName, items: masked ? items.map(r => maskRecord(r, HEALTH_CFG, !!body.include_sensitive)) : items,
          count: items.length, next_cursor: null, has_more: false,
          note: masked ? 'Pola wrażliwe (PESEL, adres, dane medyczne, podpisy) ukryte — przekaż include_sensitive=true, aby je pobrać.' : undefined,
        });
      }

      // action === 'get'
      if (!body.id) return Response.json({ error: 'Brak id rekordu' }, { status: 400 });
      const bookings = await ownBookings();
      const ownIds = bookings.map(b => b.id);

      let record: any = null;
      if (entityName === 'Booking') {
        record = await base44.entities.Booking.get(body.id).catch(() => null);
        if (!record || record.artist_id !== artistId) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'Client') {
        record = await base44.entities.Client.get(body.id).catch(() => null);
        if (!record) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'HealthForm' || entityName === 'GuardianConsentForm') {
        record = await base44.entities[entityName].get(body.id).catch(() => null);
        if (!record || !ownIds.includes(record.booking_id)) return notFound(entityName);
        return Response.json({ entity: entityName, record: maskRecord(record, HEALTH_CFG, !!body.include_sensitive), note: body.include_sensitive ? undefined : 'Pola wrażliwe ukryte — przekaż include_sensitive=true, aby je pobrać.' });
      }
      if (entityName === 'BookingAuditLog') {
        record = await base44.asServiceRole.entities.BookingAuditLog.get(body.id).catch(() => null);
        if (!record || !ownIds.includes(record.booking_id)) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'ArtistAvailability') {
        record = await base44.entities.ArtistAvailability.get(body.id).catch(() => null);
        if (!record || record.artist_id !== artistId) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'Service') {
        record = await base44.entities.Service.get(body.id).catch(() => null);
        if (!record) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'CalendarImportDraft') {
        record = await base44.asServiceRole.entities.CalendarImportDraft.get(body.id).catch(() => null);
        if (!record || record.artist_id !== artistId) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'ShopProduct') {
        record = await base44.entities.ShopProduct.get(body.id).catch(() => null);
        if (!record) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'Artist') {
        return Response.json({ entity: entityName, record: artist });
      }
      if (entityName === 'Event') {
        record = await base44.asServiceRole.entities.Event.get(body.id).catch(() => null);
        if (!record || !(record.leader_ids || []).includes(artistId)) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'EventSession') {
        record = await base44.asServiceRole.entities.EventSession.get(body.id).catch(() => null);
        if (!record || !(record.leader_ids || []).includes(artistId)) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
      if (entityName === 'EventBooking') {
        record = await base44.asServiceRole.entities.EventBooking.get(body.id).catch(() => null);
        if (!record) return notFound(entityName);
        const own = await ownEventSessions(base44, artistId);
        if (!own.some((s: any) => s.id === record.session_id)) return notFound(entityName);
        return Response.json({ entity: entityName, record });
      }
    }

    // ── SPRZEDAŻ SKLEPOWA — jedyna operacja zapisu poza sesjami ─────
    // Artysta tylko sprzedaje (jak przy rozliczeniu): nie edytuje produktów,
    // kategorii ani stanów magazynowych. Sprzedaż zawsze na własny profil.
    if (action === 'sale') {
      const dat = {
        items: (Array.isArray(body.items) ? body.items : []).map((i: any) => ({
          product_id: String(i?.product_id || ''),
          sku: String(i?.sku || ''),
          variant_key: String(i?.variant_key || ''),
          qty: Math.max(1, Math.round(Number(i?.qty) || 1)),
          price: i?.price != null && i.price !== '' ? r2(i.price) : null,
        })),
        payments: (Array.isArray(body.payments) ? body.payments : []).map((p: any) => ({
          method: String(p?.method || ''),
          amount: r2(p?.amount),
        })),
        client_name: String(body.client_name || ''),
      };

      // Błędy w danych sprzedaży (brak produktu, niezgodna suma wpłat) to nie awaria —
      // wracają jako status 'invalid', żeby asystent poprawił dane zamiast pokazywać błąd.
      let preview: any = null;
      try { preview = await previewSale(base44, dat.items); } catch (e: any) {
        return Response.json({ status: 'invalid', action: 'sale', problem: e.message, hint: 'Popraw dane sprzedaży (produkt / SKU / ilość) i wywołaj ponownie.' });
      }
      let payments: any[] = [];
      try { payments = normalizePayments(dat.payments, preview.total); } catch (e: any) {
        return Response.json({ status: 'invalid', action: 'sale', problem: e.message, razem: preview.total, hint: 'Popraw wpłaty tak, aby ich suma równała się kwocie sprzedaży, i wywołaj ponownie.' });
      }

      if (!body.confirm_token) {
        const confirm_token = await signToken(user.id, 'sale', 'ShopSale', dat, 'artist-gatekeeper-confirm');
        return Response.json({
          status: 'awaiting_confirmation',
          action: 'sale',
          entity: 'ShopSale',
          proposed: {
            pozycje: preview.lines.map((l: any) => `${l.name}${l.variant_label ? ` (${l.variant_label})` : ''} × ${l.qty} — ${r2(l.price * l.qty)} PLN`),
            razem: `${preview.total} PLN`,
            platnosci: payments.map((p: any) => `${p.method}: ${p.amount} PLN`),
            klient: dat.client_name || 'Sprzedaż sklepowa',
            artysta: artistName,
          },
          sensitive: true,
          side_effects: [
            'Sprzedaż zdejmie sprzedane sztuki ze stanu magazynowego i zapisze ruch magazynowy.',
            'Naliczona zostanie prowizja pracownika wg stawek kategorii sklepu.',
            'Sprzedaż wejdzie do statystyk sklepu jako sprzedaż produktów.',
          ],
          confirm_token,
          expires_in_seconds: TOKEN_TTL_MS / 1000,
          hint: 'Przedstaw artyście podsumowanie i po uzyskaniu potwierdzenia wywołaj ponownie z identycznymi danymi oraz confirm_token.',
        });
      }

      const saleTokenOk = await verifyToken(body.confirm_token, user.id, 'sale', 'ShopSale', dat, 'artist-gatekeeper-confirm');
      if (!saleTokenOk) {
        return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję bez confirm_token, uzyskaj potwierdzenie artysty i wykonaj ponownie.' }, { status: 400 });
      }
      try {
        const sale = await recordSale(base44, {
          items: dat.items,
          payments: dat.payments,
          clientName: dat.client_name,
          artistId,
          artistName,
          seller: user.full_name || user.email || '',
        });
        return Response.json({ status: 'executed', action: 'sale', entity: 'ShopSale', total: sale.total, booking_id: sale.booking.id, lines: sale.lines, payments: sale.payments });
      } catch (e: any) {
        return Response.json({ error: `Sprzedaż NIE została zapisana: ${e.message}` }, { status: 500 });
      }
    }

    // ── USUWANIE — trwale zablokowane dla asystenta artysty ──────────
    if (action === 'delete') {
      return Response.json({ error: 'Usunięcie sesji jest trwale zablokowane dla asystenta artysty. Zamiast tego możesz (po potwierdzeniu) anulować sesję zmieniając status.' }, { status: 400 });
    }

    // ── TWORZENIE SESJI (Booking) — dwuetapowo, ZAWSZE wymaga potwierdzenia ──
    if (action === 'create') {
      if (entityName !== 'Booking') return Response.json({ error: `Tworzenie rekordów ${entityName} nie jest dostępne dla asystenta artysty — możesz tworzyć wyłącznie własne sesje (Booking).` }, { status: 400 });
      const dat = body.data || {};
      const bad = Object.keys(dat).filter(k => !BOOKING_CREATE_FIELDS.includes(k) && !builtinFields.includes(k));
      if (bad.length > 0) return Response.json({ error: `Niedozwolone pola: ${bad.join(', ')}. Dozwolone: ${BOOKING_CREATE_FIELDS.join(', ')}` }, { status: 400 });
      const missing = ['client_name', 'session_date'].filter(f => !dat[f]); // client_email opcjonalny — nie każdy klient ma e-mail
      if (missing.length > 0) return Response.json({ error: `Brak wymaganych pól: ${missing.join(', ')}` }, { status: 400 });

      // Token wiąże się wyłącznie z danymi przekazanymi przez artystę (bez pól nadawanych przez serwer)
      const clean = pick(dat, BOOKING_CREATE_FIELDS);
      const tokenData = { data: clean };

      if (!body.confirm_token) {
        const confirm_token = await signToken(user.id, 'create', 'Booking', tokenData, 'artist-gatekeeper-confirm');
        return Response.json({
          status: 'awaiting_confirmation', entity: 'Booking', action,
          proposed: clean,
          sensitive: true,
          side_effects: [
            'Nowa rezerwacja uruchamia powiadomienia studia, konwersację z klientem i synchronizację z Google Calendar.',
            'Sesja powstanie ze statusem confirmed — artysta sam potwierdza swoje sesje.',
          ],
          confirm_token,
          expires_in_seconds: TOKEN_TTL_MS / 1000,
          hint: 'Przedstaw artyście podsumowanie i po uzyskaniu potwierdzenia wywołaj ponownie z identycznymi danymi oraz confirm_token.',
        });
      }

      const tokenOk = await verifyToken(body.confirm_token, user.id, 'create', 'Booking', tokenData, 'artist-gatekeeper-confirm');
      if (!tokenOk) {
        return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję bez confirm_token, uzyskaj potwierdzenie artysty i wykonaj ponownie.' }, { status: 400 });
      }

      const payload: any = { ...clean };
      payload.artist_id = artistId;
      payload.artist_name = artistName;
      if (!payload.session_id) payload.session_id = genSessionId();
      payload.source = 'dashboard';
      // Sesje tworzone przez artystę (również przez asystenta) zawsze startują jako confirmed
      payload.status = 'confirmed';
      if (payload.deposit_amount !== undefined) payload.deposit_paid = Number(payload.deposit_amount) > 0;
      payload.last_editor = 'dashboard';
      payload.last_editor_id = user.id;
      payload.last_editor_name = user.full_name || user.email || '';
      payload.last_editor_role = 'user';

      const created = await base44.entities.Booking.create(payload);
      // Rezerwacja powiązana z wydarzeniem kalendarza zamyka otwarte szkice importu
      if (payload.gcal_event_id) {
        const draftsRes = await base44.asServiceRole.entities.CalendarImportDraft
          .filter({ artist_id: artistId, gcal_event_id: payload.gcal_event_id, status: 'open' }, { limit: 50 })
          .catch(() => []);
        for (const d of asList(draftsRes)) {
          await base44.asServiceRole.entities.CalendarImportDraft
            .update(d.id, { status: 'imported', imported_booking_id: created.id })
            .catch(() => {});
        }
      }
      return Response.json({
        status: 'executed', entity: 'Booking', action, record: created,
        note: 'Nowa rezerwacja uruchamia automatycznie powiadomienia studia, konwersację z klientem i synchronizację z Google Calendar. Status sesji to confirmed — artysta sam potwierdza swoje sesje.',
      });
    }

    // ── ZAPISY NA OFERTY (EventBooking) — potwierdzanie uczestników ─
    if (action === 'update' && entityName === 'EventBooking') {
      if (!body.id) return Response.json({ error: 'Brak id zapisu' }, { status: 400 });
      const booking = await base44.asServiceRole.entities.EventBooking.get(body.id).catch(() => null);
      if (!booking) return notFound(entityName);
      const own = await ownEventSessions(base44, artistId);
      if (!own.some((s: any) => s.id === booking.session_id)) return notFound(entityName);

      const changes = body.changes || {};
      const allowed = ['status', 'notes'];
      const bad = Object.keys(changes).filter(k => !allowed.includes(k));
      if (bad.length > 0) {
        return Response.json({ error: `Niedozwolone pola edycji zapisu: ${bad.join(', ')}. Dozwolone: ${allowed.join(', ')}. Edycja ofert i terminów należy do administratora.` }, { status: 400 });
      }
      if (Object.keys(changes).length === 0) return Response.json({ error: 'Brak zmian do wykonania' }, { status: 400 });
      if (changes.status !== undefined && !['pending', 'confirmed', 'rejected', 'cancelled'].includes(changes.status)) {
        return Response.json({ error: 'Status zapisu musi być jednym z: pending, confirmed, rejected, cancelled.' }, { status: 400 });
      }

      const dat = { id: body.id, changes };
      if (!body.confirm_token) {
        const confirm_token = await signToken(user.id, 'update', 'EventBooking', dat, 'artist-gatekeeper-confirm');
        return Response.json({
          status: 'awaiting_confirmation', entity: 'EventBooking', action,
          current: {
            id: booking.id, event_title: booking.event_title, session_date: booking.session_date,
            client_name: booking.client_name, email: booking.email,
            participants: booking.participants, status: booking.status,
          },
          proposed: changes,
          sensitive: true,
          sensitive_fields: Object.keys(changes),
          side_effects: ['Status decyduje o zajęciu miejsca: confirmed zajmuje miejsce, rejected i cancelled je zwalniają. Uczestnik widzi nowy status w swoim panelu.'],
          confirm_token,
          expires_in_seconds: TOKEN_TTL_MS / 1000,
          hint: 'Przedstaw artyście podsumowanie i po uzyskaniu potwierdzenia wywołaj ponownie z identycznymi danymi oraz confirm_token.',
        });
      }
      const tokenOk = await verifyToken(body.confirm_token, user.id, 'update', 'EventBooking', dat, 'artist-gatekeeper-confirm');
      if (!tokenOk) {
        return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję bez confirm_token, uzyskaj potwierdzenie artysty i wykonaj ponownie.' }, { status: 400 });
      }
      const apply: any = { ...changes };
      if (apply.status === 'confirmed') {
        apply.confirmed_at = new Date().toISOString();
        apply.confirmed_by_name = user.full_name || user.email || '';
      }
      const updated = await base44.asServiceRole.entities.EventBooking.update(body.id, apply);
      return Response.json({ status: 'executed', entity: 'EventBooking', action, record: updated });
    }

    // ── EDYCJA SESJI (Booking) ──────────────────────────────────────
    if (action === 'update') {
      if (entityName !== 'Booking') return Response.json({ error: `Edycja rekordów ${entityName} nie jest dostępna dla asystenta artysty — możesz edytować wyłącznie własne sesje (Booking).` }, { status: 400 });
      if (!body.id) return Response.json({ error: 'Brak id rekordu' }, { status: 400 });
      const record = await base44.entities.Booking.get(body.id).catch(() => null);
      if (!record || record.artist_id !== artistId) return notFound(entityName);

      const changes = body.changes || {};
      const bad = Object.keys(changes).filter(k => !BOOKING_UPDATE_FIELDS.includes(k) && !builtinFields.includes(k));
      if (bad.length > 0) {
        return Response.json({ error: `Niedozwolone pola edycji: ${bad.join(', ')}. Dozwolone: ${BOOKING_UPDATE_FIELDS.join(', ')}. Status, daty, usługa, dane klienta i rozliczenia są zmianami istotnymi (wymagają potwierdzenia). Usuwanie sesji jest zablokowane.` }, { status: 400 });
      }
      if (Object.keys(changes).length === 0) return Response.json({ error: 'Brak zmian do wykonania' }, { status: 400 });

      const touched = Object.keys(changes);
      const sensitiveFields = touched.filter(f => BOOKING_SENSITIVE_FIELDS.includes(f));
      const dat = { id: body.id, changes };

      // Zwykła edycja — wykonanie od razu, bez potwierdzenia
      if (sensitiveFields.length === 0) {
        const apply: any = { ...changes };
        apply.last_editor = 'dashboard';
        apply.last_editor_id = user.id;
        apply.last_editor_name = user.full_name || user.email || '';
        apply.last_editor_role = 'user';
        const updated = await base44.entities.Booking.update(body.id, apply);
        return Response.json({ status: 'executed', entity: 'Booking', action, record: updated });
      }

      // Zmiana istotna — dwuetapowo
      if (!body.confirm_token) {
        const confirm_token = await signToken(user.id, 'update', 'Booking', dat, 'artist-gatekeeper-confirm');
        return Response.json({
          status: 'awaiting_confirmation', entity: 'Booking', action,
          current: { id: record.id, session_id: record.session_id, client_name: record.client_name, session_date: record.session_date, session_time: record.session_time, status: record.status },
          proposed: changes,
          sensitive: true,
          sensitive_fields: sensitiveFields,
          side_effects: sideEffectsFor(changes),
          confirm_token,
          expires_in_seconds: TOKEN_TTL_MS / 1000,
          hint: 'Przedstaw artyście podsumowanie i po uzyskaniu potwierdzenia wywołaj ponownie z identycznymi danymi oraz confirm_token.',
        });
      }

      const tokenOk = await verifyToken(body.confirm_token, user.id, 'update', 'Booking', dat, 'artist-gatekeeper-confirm');
      if (!tokenOk) {
        return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję bez confirm_token, uzyskaj potwierdzenie artysty i wykonaj ponownie.' }, { status: 400 });
      }

      const apply: any = { ...changes };
      if (apply.deposit_amount !== undefined) apply.deposit_paid = Number(apply.deposit_amount) > 0;
      if (apply.is_settled === true) {
        apply.settled_by_id = user.id;
        apply.settled_by_name = user.full_name || user.email;
        apply.settled_date = new Date().toISOString();
      }
      apply.last_editor = 'dashboard';
      apply.last_editor_id = user.id;
      apply.last_editor_name = user.full_name || user.email || '';
      apply.last_editor_role = 'user';
      const updated = await base44.entities.Booking.update(body.id, apply);
      return Response.json({ status: 'executed', entity: 'Booking', action, record: updated });
    }

    return Response.json({ error: `Nieznana akcja: "${action}". Dostępne: search, get, create, update.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function sideEffectsFor(changes: any): string[] {
  const fx: string[] = [];
  const touched = Object.keys(changes);
  if (touched.some(f => ['session_date', 'session_time', 'session_end_time', 'session_duration', 'service_id', 'service_name'].includes(f))) {
    fx.push('Zmiana daty, godziny lub usługi wyśle klientowi e-mail z aktualizacją i zsynchronizuje Google Calendar.');
  }
  if (touched.includes('status')) fx.push('Zmiana statusu (zwłaszcza anulowanie) ma skutki dla klienta i kalendarza.');
  if (touched.some(f => ['deposit_amount', 'final_amount', 'payment_breakdown', 'is_settled'].includes(f))) {
    fx.push('Rozliczenie sesji (is_settled=true) zapisze automatycznie osobę i datę rozliczenia.');
  }
  if (touched.some(f => ['client_name', 'client_email', 'client_phone'].includes(f))) {
    fx.push('Zmiana danych klienta zaktualizuje dane kontaktowe tej sesji.');
  }
  return fx;
}