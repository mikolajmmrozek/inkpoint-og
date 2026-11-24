import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

// ── Wspólne helpery modułu wydarzeń ─────────────────────────────────────────

export const EVENT_STATUS_LABELS = {
  draft: 'Szkic',
  published: 'Opublikowane',
  hidden: 'Ukryte',
};

export const EVENT_STATUS_COLORS = {
  draft: '#9ca3af',
  published: '#16a34a',
  hidden: '#f59e0b',
};

export const BOOKING_STATUS_LABELS = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  rejected: 'Odrzucona',
};

export const BOOKING_STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#16a34a',
  cancelled: '#9ca3af',
  rejected: '#ef4444',
};

// Miejsca zajęte liczą tylko zapisy oczekujące i potwierdzone.
export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function timeToMinutes(time) {
  const [h, m] = String(time || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function sessionTaken(sessionId, bookings = []) {
  return bookings
    .filter(b => b.session_id === sessionId && ACTIVE_BOOKING_STATUSES.includes(b.status))
    .reduce((s, b) => s + (Number(b.participants) || 1), 0);
}

export function sessionSpots(session, bookings = []) {
  const capacity = Number(session?.capacity) || 0;
  const taken = sessionTaken(session?.id, bookings);
  return { capacity, taken, left: Math.max(0, capacity - taken), full: capacity > 0 && taken >= capacity };
}

export function formatSessionDate(dateStr, withYear = true) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), withYear ? 'd MMMM yyyy' : 'd MMMM', { locale: pl });
  } catch {
    return dateStr;
  }
}

export function formatSessionTime(session) {
  if (!session?.start_time) return '';
  return session.end_time ? `${session.start_time}–${session.end_time}` : session.start_time;
}

export function formatPrice(value, currency = 'PLN') {
  const n = Number(value) || 0;
  return `${n.toLocaleString('pl-PL')} ${currency}`;
}

export function nextSession(sessions = []) {
  const today = new Date().toISOString().slice(0, 10);
  return [...sessions]
    .filter(s => s.status !== 'cancelled' && s.date && s.date >= today)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''))[0] || null;
}

// Eksport listy uczestników do CSV (średnik — polski Excel).
export function downloadBookingsCsv(eventTitle, bookings = []) {
  const header = ['Imię', 'Nazwisko', 'E-mail', 'Telefon', 'Termin', 'Godzina', 'Miejsca', 'Status', 'Uwagi'];
  const rows = bookings.map(b => [
    b.first_name || (b.client_name || '').split(' ')[0] || '',
    b.last_name || (b.client_name || '').split(' ').slice(1).join(' ') || '',
    b.email || '',
    b.phone || '',
    b.session_date || '',
    b.session_start_time || '',
    b.participants || 1,
    BOOKING_STATUS_LABELS[b.status] || b.status || '',
    b.notes || '',
  ]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map(r => r.map(escape).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(eventTitle || 'uczestnicy')}-uczestnicy.csv`;
  a.click();
  URL.revokeObjectURL(url);
}