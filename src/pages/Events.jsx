import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import PageLayout from '@/components/layout/PageLayout';
import EventCard from '@/components/events/EventCard';
import { nextSession } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState({});
  const [categories, setCategories] = useState([]);
  const [artists, setArtists] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await base44.entities.Event.filter({ status: 'published' }, 'order', 200);
        if (cancelled) return;
        const sorted = list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setEvents(sorted);

        if (sorted.length > 0) {
          const [sess, cats, avail, arts] = await Promise.all([
            base44.entities.EventSession.filter({ event_id: { $in: sorted.map(e => e.id) } }),
            base44.entities.EventCategory.filter({ is_active: true }),
            base44.functions.invoke('getEventAvailability', { event_ids: sorted.map(e => e.id) }).then(r => r.data).catch(() => ({ sessions: [] })),
            base44.entities.Artist.list(),
          ]);
          if (cancelled) return;
          setSessions(sess.filter(s => s.status !== 'cancelled'));
          setArtists(arts || []);
          setCategories(cats.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
          const map = {};
          (avail?.sessions || []).forEach(s => { map[s.id] = s; });
          setAvailability(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const filtered = category === 'all' ? events : events.filter(e => e.category_id === category);
    return filtered;
  }, [events, category]);

  const sessionsOf = (eventId) => sessions.filter(s => s.event_id === eventId);

  // Prowadzący oferty: artyści studia (ze zdjęciem) + osoby wpisane ręcznie (inicjały).
  const leadersOf = (event) => {
    const internal = (event.leader_ids || [])
      .map(id => artists.find(a => a.id === id))
      .filter(Boolean)
      .map(a => ({ id: a.id, name: a.name, photo_url: a.photo_url }));
    const external = (event.external_leaders || []).map(name => ({ name }));
    return [...internal, ...external];
  };

  return (
    <PageLayout>
      <div className="pt-40 pb-14 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ ...mono, fontSize: '10px', color: 'var(--brand)' }}>WYDARZENIA I WARSZTATY</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.4rem, 9vw, 8rem)', fontWeight: 400, lineHeight: 0.9, letterSpacing: '0.04em', color: 'hsl(var(--foreground))', marginTop: '14px' }}>
            Oferty
          </h1>
          <div className="mt-6" style={{ height: '1px', width: '64px', background: 'linear-gradient(to right, var(--brand), transparent)' }} />
          <p className="mt-6 max-w-2xl" style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgb(var(--foreground-rgb) / 0.6)' }}>
            Szkolenia, warsztaty i spotkania prowadzone przez naszych artystów. Wybierz termin i zarezerwuj miejsce online.
          </p>
        </motion.div>
      </div>

      {categories.length > 0 && (
        <div className="px-8 md:px-16 mb-10 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('all')}
            style={{
              ...mono, fontSize: '10px', padding: '7px 14px', cursor: 'pointer',
              border: `0.5px solid ${category === 'all' ? 'var(--brand)' : 'hsl(var(--border))'}`,
              color: category === 'all' ? 'var(--brand)' : 'rgb(var(--foreground-rgb) / 0.6)',
              background: category === 'all' ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
              borderRadius: 'var(--radius)',
            }}
          >
            Wszystkie
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                ...mono, fontSize: '10px', padding: '7px 14px', cursor: 'pointer',
                border: `0.5px solid ${category === c.id ? 'var(--brand)' : 'hsl(var(--border))'}`,
                color: category === c.id ? 'var(--brand)' : 'rgb(var(--foreground-rgb) / 0.6)',
                background: category === c.id ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                borderRadius: 'var(--radius)',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="px-8 md:px-16 pb-24">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse" style={{ aspectRatio: '4 / 3', background: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '11px', color: 'rgb(var(--foreground-rgb) / 0.5)' }}>
              Brak wydarzeń w tej chwili — zapraszamy wkrótce.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {visible.map((event, i) => {
              const session = nextSession(sessionsOf(event.id));
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  session={session}
                  spots={session ? availability[session.id] : null}
                  index={i}
                  leaders={leadersOf(event)}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}