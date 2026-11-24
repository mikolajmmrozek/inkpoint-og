import { ACTIVE_BOOKING_STATUSES } from '@/lib/events';

// Kolor wpisów ofert w kalendarzu — odróżnia je od statusów rezerwacji.
export const EVENT_COLOR = '#f59e0b';

/**
 * Zamienia terminy ofert (EventSession + Event + zapisy) na wpisy kalendarza
 * o wspólnym kształcie. Pokazujemy wszystkie terminy — także szkice i ukryte
 * oferty — bo kalendarz jest wewnętrzny.
 */
export function buildCalendarEvents({ events = [], sessions = [], bookings = [], artists = [] }) {
  const eventById = new Map((events || []).map(e => [e.id, e]));
  const artistById = new Map((artists || []).map(a => [a.id, a]));

  const takenBySession = {};
  (bookings || []).forEach(b => {
    if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) return;
    takenBySession[b.session_id] = (takenBySession[b.session_id] || 0) + (Number(b.participants) || 1);
  });

  return (sessions || [])
    .filter(s => s && s.date)
    .map(s => {
      const ev = eventById.get(s.event_id) || {};
      const ids = (s.leader_ids && s.leader_ids.length ? s.leader_ids : ev.leader_ids) || [];
      const leaders = ids
        .map(id => artistById.get(id))
        .filter(Boolean)
        .map(a => ({ id: a.id, name: a.name, photo_url: a.photo_url }));
      const capacity = Number(s.capacity) || 0;
      const taken = takenBySession[s.id] || 0;

      return {
        id: s.id,
        kind: 'event',
        event_id: s.event_id,
        title: ev.title || s.event_title || 'Oferta',
        slug: ev.slug || '',
        event_status: ev.status || 'draft',
        published: ev.status === 'published',
        session_date: s.date,
        start_time: s.start_time || '',
        end_time: s.end_time || '',
        location: s.location || ev.location || '',
        cancelled: s.status === 'cancelled',
        leader_ids: ids,
        leaders,
        external_leaders: ev.external_leaders || [],
        capacity,
        taken,
        left: Math.max(0, capacity - taken),
        full: capacity > 0 && taken >= capacity,
      };
    });
}

export function eventTimeLabel(entry) {
  if (!entry?.start_time) return 'godzina wkrótce';
  return entry.end_time ? `${entry.start_time}–${entry.end_time}` : entry.start_time;
}

export function eventLeaderNames(entry) {
  return [
    ...((entry?.leaders || []).map(l => l.name)),
    ...((entry?.external_leaders || [])),
  ].filter(Boolean);
}