import { serviceRevenue } from '@/lib/trends';
import { eventRevenue, leaderPayout } from '@/lib/eventFinance';

const dayOf = (value) => String(value || '').slice(0, 10);
const inRange = (value, range) => {
  const day = dayOf(value);
  return !!day && day >= range.start && day <= range.end;
};

// Finanse studia w zakresie dat — źródło kafli pulpitu.
// Usługi: przychód z sesji bez produktów, dochód po wypłacie artystów.
// Sklep: zamówienia online + produkty sprzedane w sesjach; dochód tylko z pozycji o znanym koszcie.
// Warsztaty: przychód z potwierdzonych zapisów, dochód po wynagrodzeniach prowadzących.
export function financeTotals({
  bookings = [], orders = [], events = [], sessions = [], eventBookings = [], artists = [],
}, range) {
  const cuts = {};
  artists.forEach(a => { cuts[a.id] = a.artist_cut_percent != null ? a.artist_cut_percent : 60; });

  const completed = bookings.filter(b => b.status === 'completed' && inRange(b.session_date, range));

  const services = completed.reduce((s, b) => s + serviceRevenue(b), 0);
  const servicePayout = completed.reduce((s, b) => {
    const cut = cuts[b.artist_id] != null ? cuts[b.artist_id] : 60;
    return s + Math.round(serviceRevenue(b) * cut / 100);
  }, 0);

  const onlineOrders = orders.filter(o => o.status !== 'cancelled' && inRange(o.created_date, range));
  const onlineRevenue = onlineOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const sessionProducts = completed.reduce((s, b) => s + Number(b.products_total || 0), 0);
  const shopProfit = completed.reduce((s, b) => s + (b.sold_products || []).reduce((x, p) => (
    p.cost_known ? x + (Number(p.price || 0) - Number(p.cost || 0)) * Number(p.qty || 0) : x
  ), 0), 0);

  const rangeSessions = sessions.filter(s => s.status !== 'cancelled' && inRange(s.date, range));
  const eventTotals = events.reduce((acc, e) => {
    const evSessions = rangeSessions.filter(s => s.event_id === e.id);
    const ev = eventRevenue(e, evSessions, eventBookings);
    return {
      revenue: acc.revenue + ev.revenue,
      participants: acc.participants + ev.participants,
      payout: acc.payout + leaderPayout(e, ev.revenue, ev.sessionsWithBookings),
    };
  }, { revenue: 0, participants: 0, payout: 0 });

  const shopRevenue = onlineRevenue + sessionProducts;
  const servicesProfit = services - servicePayout;
  const eventsProfit = eventTotals.revenue - eventTotals.payout;

  return {
    sessions: completed.length,
    orders: onlineOrders.length,
    participants: eventTotals.participants,
    services,
    servicesProfit,
    shopRevenue,
    shopProfit,
    eventsRevenue: eventTotals.revenue,
    eventsProfit,
    totalRevenue: services + shopRevenue + eventTotals.revenue,
    totalProfit: servicesProfit + shopProfit + eventsProfit,
  };
}