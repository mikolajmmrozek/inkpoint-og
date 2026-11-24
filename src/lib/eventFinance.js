// Finanse ofert (wydarzeń i warsztatów): przychód z potwierdzonych zapisów
// oraz wynagrodzenie artystów prowadzących.

export const LEADER_PAY_TYPES = [
  { value: 'none', label: 'Brak wynagrodzenia' },
  { value: 'percent', label: 'Procent od kwoty' },
  { value: 'fixed', label: 'Kwota za termin' },
];

export function payTypeLabel(type) {
  return LEADER_PAY_TYPES.find(p => p.value === type)?.label || 'Brak wynagrodzenia';
}

// Zapis liczy się do przychodu, gdy jest potwierdzony (pending i odrzucone pomijamy).
export function isPaidEventBooking(b) {
  return b && b.status === 'confirmed';
}

export function paidEventBookings(bookings, sessionIds) {
  const ids = new Set(sessionIds);
  return (bookings || []).filter(b => ids.has(b.session_id) && isPaidEventBooking(b));
}

// Przychód = cena wydarzenia × liczba miejsc z potwierdzonych zapisów.
export function eventRevenue(event, sessions, bookings) {
  const sessionIds = (sessions || []).filter(s => s.event_id === event.id).map(s => s.id);
  const paid = paidEventBookings(bookings, sessionIds);
  const price = Number(event.price || 0);
  const participants = paid.reduce((s, b) => s + Number(b.participants || 1), 0);
  const sessionsWithBookings = new Set(paid.map(b => b.session_id)).size;
  return { revenue: price * participants, participants, sessionsWithBookings, bookings: paid.length };
}

// Wynagrodzenie prowadzącego: procent od przychodu albo stała kwota za termin.
export function leaderPayout(event, revenue, sessionsWithBookings) {
  const type = event.leader_pay_type || 'none';
  const value = Number(event.leader_pay_value || 0);
  if (type === 'percent') return Math.round(revenue * value / 100);
  if (type === 'fixed') return Math.round(value * (sessionsWithBookings || 0));
  return 0;
}

// Podział wynagrodzenia między prowadzących wydarzenia.
export function payoutPerLeader(event, payout) {
  const count = (event.leader_ids || []).length;
  if (!count) return 0;
  return Math.round(payout / count);
}

export function eventSummary(event, sessions, bookings) {
  const stats = eventRevenue(event, sessions, bookings);
  const payout = leaderPayout(event, stats.revenue, stats.sessionsWithBookings);
  return { ...stats, payout, perLeader: payoutPerLeader(event, payout) };
}