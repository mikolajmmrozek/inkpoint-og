// Wspólna logika porównania kalendarzy Google artystów z sesjami w systemie.
// Używana przez funkcję calendarSync (Gatekeeper admina i artysty).
// Zakres skanowania: miesiąc wstecz i miesiąc naprzód od dnia sprawdzania.

export const SCAN_DAYS = 31;

export function scanWindow(now: Date = new Date()) {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const from = new Date(now);
  from.setDate(from.getDate() - SCAN_DAYS);
  const to = new Date(now);
  to.setDate(to.getDate() + SCAN_DAYS);
  return { from: iso(from), to: iso(to) };
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Wspólne połączenie Google Calendar całego studia (SHARED connector)
export async function getCalendarHeaders(base44: any): Promise<any | null> {
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!conn?.accessToken) return null;
    return { 'Authorization': `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' };
  } catch (_) {
    return null;
  }
}

// Wydarzenia z kalendarza w oknie [from-1d, to+1d] (bufor na strefy czasowe)
export async function fetchEvents(headers: any, calendarId: string, from: string, to: string): Promise<any[]> {
  const timeMin = `${addDays(from, -1)}T00:00:00Z`;
  const timeMax = `${addDays(to, 1)}T23:59:59Z`;
  const items: any[] = [];
  let pageToken: string | null = null;
  for (let i = 0; i < 5; i++) {
    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?singleEvents=true&orderBy=startTime&maxResults=250` +
      `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Google Calendar API ${res.status}`);
    const data: any = await res.json();
    items.push(...(data.items || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return items.filter((ev: any) => ev.status !== 'cancelled');
}

// Parsowanie wydarzenia na dane sesji (format wydarzeń tworzonych przez studio:
// tytuł "Klient — Usługa", opis z liniami "Email:", "Telefon:", "Miejsce:", "Opis:", "Cena: N zł").
// Zwraca null dla wydarzeń całodniowych (nie-sesji).
export function parseSessionFromEvent(ev: any): any | null {
  const startDT = ev?.start?.dateTime;
  if (!startDT) return null;
  const endDT = ev?.end?.dateTime || null;
  const summary = (ev.summary || '').trim();
  const desc = ev.description || '';

  let client_name = summary;
  let service_name = '';
  const sep = summary.indexOf(' — ');
  if (sep >= 0) {
    client_name = summary.slice(0, sep).trim();
    service_name = summary.slice(sep + 3).trim();
  }

  const line = (label: string) => {
    const m = desc.match(new RegExp('^' + label + ':\\s*(.+)$', 'mi'));
    return m ? m[1].trim() : '';
  };
  let client_email = line('Email');
  if (!client_email) {
    const m = desc.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) client_email = m[0].replace(/[.,;)]+$/, '');
  }
  const client_phone = line('Telefon');
  const tattoo_placement = line('Miejsce');
  const tattoo_description = line('Opis');

  let estimated_price: number | undefined;
  const pm = desc.match(/^Cena:\s*([\d\s.,]+)\s*z\u0142/mi);
  if (pm) {
    const n = Number(pm[1].replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) estimated_price = n;
  }

  const session_date = startDT.slice(0, 10);
  const session_time = startDT.slice(11, 16);
  const session_end_time = endDT ? endDT.slice(11, 16) : '';
  let session_duration: number | undefined;
  if (endDT) {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    let d = toMin(session_end_time) - toMin(session_time);
    if (d < 0) d += 24 * 60;
    if (d > 0) session_duration = d;
  }

  const missing: string[] = [];
  if (!client_name) missing.push('client_name');
  if (!client_email) missing.push('client_email');

  return {
    gcal_event_id: ev.id,
    title: summary,
    client_name,
    client_email,
    client_phone,
    service_name,
    tattoo_description,
    tattoo_placement,
    estimated_price,
    session_date,
    session_time,
    session_end_time,
    session_duration,
    missing,
  };
}

// Dopasowanie sesji z kalendarza do aktywnej rezerwacji po treści (ten sam dzień + zgodne nazwisko).
// ambiguous = kilka rezerwacji pasuje naraz.
export function findMatch(s: any, activeBookings: any[]): { booking: any | null; ambiguous: boolean } {
  const cn = (s.client_name || '').toLowerCase().trim();
  if (!cn) return { booking: null, ambiguous: false };
  const cands = activeBookings.filter((b: any) => {
    if (b.session_date !== s.session_date) return false;
    const bn = (b.client_name || '').toLowerCase().trim();
    return bn && (bn.includes(cn) || cn.includes(bn));
  });
  if (cands.length === 1) return { booking: cands[0], ambiguous: false };
  if (cands.length > 1) return { booking: null, ambiguous: true };
  return { booking: null, ambiguous: false };
}

const toMinutes = (t: string) => {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Przedział czasowy rezerwacji { date, start, end } w minutach
export function bookingInterval(b: any): any | null {
  if (!b.session_date || !b.session_time) return null;
  const start = toMinutes(b.session_time);
  let end = b.session_end_time ? toMinutes(b.session_end_time) : start + (b.session_duration || 60);
  if (end <= start) end = start + (b.session_duration || 60);
  return { date: b.session_date, start, end };
}

// Przedział czasowy sesji z kalendarza
export function sessionInterval(s: any): any | null {
  if (!s.session_date || !s.session_time) return null;
  const start = toMinutes(s.session_time);
  let end = s.session_end_time ? toMinutes(s.session_end_time) : start + (s.session_duration || 60);
  if (end <= start) end = start + 60;
  return { date: s.session_date, start, end };
}

export function intervalsOverlap(a: any, b: any): boolean {
  return a.start < b.end && b.start < a.end;
}

// Różnice między wydarzeniem kalendarza a istniejącą rezerwacją
export function diffBooking(s: any, b: any): any[] {
  const diffs: any[] = [];
  if (s.session_time && s.session_time !== (b.session_time || '')) {
    diffs.push({ field: 'session_time', current: b.session_time || null, proposed: s.session_time });
  }
  if (s.session_end_time && s.session_end_time !== (b.session_end_time || '')) {
    diffs.push({ field: 'session_end_time', current: b.session_end_time || null, proposed: s.session_end_time });
  }
  const bn = (b.client_name || '').trim();
  const sn = (s.client_name || '').trim();
  if (sn && bn && !bn.toLowerCase().includes(sn.toLowerCase()) && !sn.toLowerCase().includes(bn.toLowerCase())) {
    diffs.push({ field: 'client_name', current: bn, proposed: sn });
  }
  return diffs;
}

// Kategoryzacja jednego artysty: wydarzenia vs rezerwacje.
// missing = sesja jest w kalendarzu, brak jej w systemie (kandydat do importu)
// mismatch = sesja istnieje, ale dane się różnią
// conflict = kolizja godzin, możliwy duplikat, wydarzenie anulowanej sesji (wymaga indywidualnej decyzji)
export function categorizeArtist(events: any[], bookings: any[]) {
  const active = bookings.filter((b: any) => b.status !== 'cancelled');
  const missing: any[] = [];
  const mismatch: any[] = [];
  const conflict: any[] = [];
  const usedBookings = new Set<string>();
  let ignored_all_day = 0;
  const sessions: any[] = [];

  for (const ev of events) {
    const s = parseSessionFromEvent(ev);
    if (!s) {
      ignored_all_day++;
      continue;
    }
    sessions.push(s);
  }

  for (const s of sessions) {
    let booking = bookings.find((b: any) => b.gcal_event_id && b.gcal_event_id === s.gcal_event_id) || null;
    let ambiguous = false;
    if (!booking) {
      const m = findMatch(s, active);
      booking = m.booking;
      ambiguous = m.ambiguous;
    }
    if (ambiguous) {
      conflict.push({ session: s, reason: 'ambiguous', note: 'Wydarzenie pasuje do kilku sesji tego samego dnia — możliwy duplikat, wymaga indywidualnej weryfikacji.' });
      continue;
    }
    if (booking) {
      if (usedBookings.has(booking.id)) {
        conflict.push({ session: s, reason: 'duplicate_event', note: 'Kilka wydarzeń w kalendarzu pasuje do tej samej sesji — możliwy duplikat wydarzenia.' });
        continue;
      }
      usedBookings.add(booking.id);
      if (booking.status === 'cancelled') {
        conflict.push({ session: s, booking, reason: 'event_for_cancelled', note: 'Wydarzenie odpowiada ANULOWANEJ sesji — wydarzenie powinno zostać usunięte z kalendarza.' });
        continue;
      }
      const diffs = diffBooking(s, booking);
      if (diffs.length > 0) mismatch.push({ booking, session: s, diffs });
      continue;
    }
    // brak rezerwacji — sprawdź kolizje z aktywnymi sesjami artysty
    const si = sessionInterval(s);
    if (si) {
      const overlapped = active.find((b: any) => {
        const bi = bookingInterval(b);
        return bi && bi.date === si.date && intervalsOverlap(bi, si);
      });
      if (overlapped) {
        conflict.push({ session: s, reason: 'time_conflict', note: `Koliduje w czasie z istniejącą sesją: ${overlapped.client_name} (${overlapped.session_date} ${overlapped.session_time}).` });
        continue;
      }
    }
    missing.push(s);
  }

  // kolizje między samymi brakującymi wydarzeniami
  const flagged = new Set<string>();
  for (let i = 0; i < missing.length; i++) {
    for (let j = i + 1; j < missing.length; j++) {
      const a = sessionInterval(missing[i]);
      const b = sessionInterval(missing[j]);
      if (a && b && a.date === b.date && intervalsOverlap(a, b)) {
        conflict.push({ session: missing[i], reason: 'time_conflict', note: `Koliduje w czasie z innym brakującym wydarzeniem: ${missing[j].title}.` });
        conflict.push({ session: missing[j], reason: 'time_conflict', note: `Koliduje w czasie z innym brakującym wydarzeniem: ${missing[i].title}.` });
        flagged.add(missing[i].gcal_event_id);
        flagged.add(missing[j].gcal_event_id);
      }
    }
  }

  const missingClean = missing.filter((s: any) => !flagged.has(s.gcal_event_id));
  const bookings_without_event = active
    .filter((b: any) => !usedBookings.has(b.id))
    .map((b: any) => ({ id: b.id, session_id: b.session_id, client_name: b.client_name, session_date: b.session_date, session_time: b.session_time, status: b.status }));

  return { ignored_all_day, missing: missingClean, mismatch, conflict, bookings_without_event };
}