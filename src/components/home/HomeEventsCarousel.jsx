import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useSiteContent from '@/hooks/useSiteContent';
import useEventSettings from '@/hooks/useEventSettings';
import EventCard from '@/components/events/EventCard';
import { nextSession } from '@/lib/events';

const DEFAULT_LABEL = 'OFERTY';
const DEFAULT_HEADING = 'Warsztaty i wydarzenia';
const DEFAULT_TEXT = 'Szkolenia i spotkania prowadzone przez naszych artystów — wybierz termin i zarezerwuj miejsce online.';

const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);

export default function HomeEventsCarousel() {
  const { content } = useSiteContent();
  const settings = useEventSettings();
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState({});

  const enabled = content.show_events !== false;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const list = await base44.entities.Event.filter({ status: 'published' }, 'order', 60).catch(() => []);
      if (cancelled) return;
      // Wyróżnione oferty mają pierwszeństwo; gdy ich brak — losowy wybór.
      const featured = list.filter(e => e.is_featured);
      const chosen = (featured.length > 0 ? featured : shuffle(list)).slice(0, 6);
      setEvents(chosen);
      if (chosen.length === 0) return;
      const [sess, avail] = await Promise.all([
        base44.entities.EventSession.filter({ event_id: { $in: chosen.map(e => e.id) } }).catch(() => []),
        base44.functions.invoke('getEventAvailability', { event_ids: chosen.map(e => e.id) }).then(r => r.data).catch(() => ({ sessions: [] })),
      ]);
      if (cancelled) return;
      setSessions(sess.filter(s => s.status !== 'cancelled'));
      const map = {};
      (avail?.sessions || []).forEach(s => { map[s.id] = s; });
      setAvailability(map);
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled || events.length === 0) return null;

  const label = settings.home_events_label || DEFAULT_LABEL;
  const heading = settings.home_events_heading || DEFAULT_HEADING;
  const text = settings.home_events_text || DEFAULT_TEXT;

  return (
    <section className="pt-10 pb-16 overflow-hidden">
      <div className="px-8 md:px-16 mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {label}
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 0.95, letterSpacing: '0.04em' }}>
              {heading}
            </h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px', lineHeight: 1.7, marginTop: '12px', maxWidth: '520px' }}>
              {text}
            </p>
          </div>
          <Link to="/wydarzenia" className="btn-ghost-parchment self-start md:self-auto inline-flex items-center gap-2">
            ZOBACZ WSZYSTKIE OFERTY <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="flex gap-4 px-8 md:px-16 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        {events.map((event, i) => {
          const session = nextSession(sessions.filter(s => s.event_id === event.id));
          return (
            <div key={event.id} className="flex-shrink-0" style={{ width: '290px' }}>
              <EventCard
                event={event}
                session={session}
                spots={session ? availability[session.id] : null}
                index={i}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}