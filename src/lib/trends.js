import { sessionAmount } from '@/lib/settlement';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Przychód z samych usług: kwota sesji bez sprzedanych produktów.
export const serviceRevenue = (b) => Math.max(0, sessionAmount(b) - (Number(b.products_total) || 0));

// Procentowa zmiana względem okresu bazowego. Zerowa baza = brak porównania.
export function pctChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev <= 0) return { pct: null, dir: 'flat', current: cur, previous: prev };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', current: cur, previous: prev };
}

// Bieżący miesiąc: od 1. do dziś, a poprzedni do tego samego dnia
// (nie dalej niż do jego ostatniego dnia). Miesiąc zamknięty: pełny do pełnego.
export function monthBounds(year, month, now = new Date()) {
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const daysInPrev = new Date(year, month, 0).getDate();
  const day = isCurrent ? Math.min(now.getDate(), daysInPrev) : daysInPrev;
  return {
    isCurrent,
    current: {
      start: iso(new Date(year, month, 1)),
      end: isCurrent ? iso(now) : iso(new Date(year, month + 1, 0)),
    },
    previous: {
      start: iso(new Date(year, month - 1, 1)),
      end: iso(new Date(year, month - 1, day)),
    },
  };
}

// Bieżący rok: od 1 stycznia do dziś vs analogiczny okres roku poprzedniego.
// Rok zamknięty: pełny do pełnego.
export function yearBounds(year, now = new Date()) {
  const isCurrent = year === now.getFullYear();
  const endCur = isCurrent ? iso(now) : `${year}-12-31`;
  return {
    isCurrent,
    current: { start: `${year}-01-01`, end: endCur },
    previous: { start: `${year - 1}-01-01`, end: `${year - 1}${endCur.slice(4)}` },
  };
}

// Sumy sesji i przychodu (tylko zakończone sesje) w podanym zakresie dat.
export function periodTotals(bookings, range, { artistId = 'all', amountOf = serviceRevenue } = {}) {
  const rows = bookings.filter(b =>
    b.session_date &&
    b.session_date >= range.start &&
    b.session_date <= range.end &&
    b.status === 'completed' &&
    (artistId === 'all' || b.artist_id === artistId)
  );
  return { sessions: rows.length, revenue: rows.reduce((s, b) => s + amountOf(b), 0), rows };
}

// Porównanie zakresów: sesje i przychód vs okres bazowy.
export function comparePeriods(bookings, bounds, opts = {}) {
  const current = periodTotals(bookings, bounds.current, opts);
  const previous = periodTotals(bookings, bounds.previous, opts);
  return {
    sessions: pctChange(current.sessions, previous.sessions),
    revenue: pctChange(current.revenue, previous.revenue),
  };
}