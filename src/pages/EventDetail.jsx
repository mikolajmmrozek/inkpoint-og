import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, Users, ArrowLeft, Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import EventBookingForm from '@/components/events/EventBookingForm';
import { formatPrice, formatSessionDate, formatSessionTime, nextSession } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' };

// Inicjały prowadzącego spoza organizacji (wpis ręczny — bez profilu artysty).
const initials = (name) => String(name || '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(w => w[0])
  .join('')
  .toUpperCase();

const Section = ({ title, children }) => (
  <div className="py-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
    <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '14px' }}>{title}</p>
    <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'rgb(var(--foreground-rgb) / 0.75)', whiteSpace: 'pre-line' }}>
      {children}
    </div>
  </div>
);

export default function EventDetail() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState({});
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [bookingSession, setBookingSession] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [user, setUser] = useState(null);

  const load = async () => {
    const bySlug = await base44.entities.Event.filter({ slug });
    const found = bySlug[0] || (await base44.entities.Event.filter({ id: slug }).catch(() => []))[0] || null;
    if (!found) {
      setLoading(false);
      return;
    }
    setEvent(found);
    const [sess, avail] = await Promise.all([
      base44.entities.EventSession.filter({ event_id: found.id }),
      base44.functions.invoke('getEventAvailability', { event_ids: [found.id] }).then(r => r.data).catch(() => ({ sessions: [] })),
    ]);
    const active = sess.filter(s => s.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    setSessions(active);
    const map = {};
    (avail?.sessions || []).forEach(s => { map[s.id] = s; });
    setAvailability(map);
    setSelectedSession(nextSession(active));
    if ((found.leader_ids || []).length > 0) {
      const all = await base44.entities.Artist.list();
      setLeaders(all.filter(a => (found.leader_ids || []).includes(a.id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    setEvent(null);
    setSessions([]);
    load().catch(() => setLoading(false));
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, [slug]);

  useEffect(() => {
    if (!event) return;
    const previous = document.title;
    document.title = `${event.title} — Romans Tattoo`;
    return () => { document.title = previous; };
  }, [event]);

  if (loading) {
    return (
      <PageLayout>
        <div className="pt-40 flex justify-center">
          <Loader2 size={22} className="animate-spin" color="var(--brand)" />
        </div>
      </PageLayout>
    );
  }

  if (!event) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-8 md:px-16 text-center">
          <p style={{ ...mono, fontSize: '10px', color: 'var(--brand)' }}>WYDARZENIE NIEDOSTĘPNE</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', letterSpacing: '0.04em', color: 'hsl(var(--foreground))', marginTop: '10px' }}>
            Nie znaleziono wydarzenia
          </h1>
          <Link to="/wydarzenia" className="btn-ghost-parchment inline-block mt-8">WRÓĆ DO OFERTY</Link>
        </div>
      </PageLayout>
    );
  }

  const spots = selectedSession ? availability[selectedSession.id] : null;
  const gallery = [event.main_image_url, ...(event.gallery_images || [])].filter(Boolean);
  const externalLeaders = event.external_leaders || [];
  const leaderNames = [...new Set([
    ...(event.leader_names || []),
    ...leaders.map(a => a.name),
    ...externalLeaders,
  ].filter(Boolean))];

  return (
    <PageLayout>
      <div className="pt-32 pb-24 px-6 md:px-16 max-w-6xl mx-auto">
        <Link to="/wydarzenia" className="inline-flex items-center gap-2 mb-8" style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
          <ArrowLeft size={12} /> WSZYSTKIE WYDARZENIA
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {event.category_name && (
              <span style={{ ...mono, fontSize: '9px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '3px 9px' }}>{event.category_name}</span>
            )}
            {leaderNames.length > 0 && (
              <span style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>PROWADZĄCY: {leaderNames.join(', ')}</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 7vw, 5.2rem)', lineHeight: 0.95, letterSpacing: '0.03em', color: 'hsl(var(--foreground))' }}>
            {event.title}
          </h1>
          {event.short_description && (
            <p className="mt-5 max-w-3xl" style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgb(var(--foreground-rgb) / 0.62)' }}>
              {event.short_description}
            </p>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10 mt-10">
          <div>
            <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10', borderRadius: 'var(--radius)', background: 'hsl(var(--border))' }}>
              {event.main_image_url ? (
                <img src={event.main_image_url} alt={event.title} className="w-full h-full object-cover media-darken-soft media-border" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><CalendarDays size={30} color="var(--brand)" /></div>
              )}
            </div>

            {event.full_description && <Section title="O WYDARZENIU">{event.full_description}</Section>}
            {event.program && <Section title="PROGRAM">{event.program}</Section>}
            {event.requirements && <Section title="WYMAGANIA">{event.requirements}</Section>}
            {event.materials && <Section title="CO JEST ZAPEWNIONE">{event.materials}</Section>}
            {event.organizer_info && <Section title="INFORMACJE ORGANIZACYJNE">{event.organizer_info}</Section>}

            {gallery.length > 1 && (
              <div className="py-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '14px' }}>GALERIA</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gallery.map((url, i) => (
                    <button key={`${url}-${i}`} onClick={() => setLightbox(i)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                      <img src={url} alt={`${event.title} ${i + 1}`} className="w-full object-cover media-darken-soft" style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(event.video_urls || []).length > 0 && (
              <div className="py-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '14px' }}>WIDEO</p>
                <div className="space-y-4">
                  {(event.video_urls || []).map((url, i) => (
                    <video key={`${url}-${i}`} src={url} controls className="w-full" style={{ borderRadius: 'var(--radius)', border: '0.5px solid hsl(var(--border))' }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="p-6 sticky top-28" style={{ border: '0.5px solid hsl(var(--border))', background: 'rgb(var(--foreground-rgb) / 0.02)', borderRadius: 'var(--radius)' }}>
              <p style={{ ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.5)' }}>CENA ZA OSOBĘ</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', lineHeight: 1, color: 'var(--brand)', letterSpacing: '0.03em', marginTop: '4px' }}>
                {formatPrice(event.price)}
              </p>

              <div className="mt-6">
                <p style={{ ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginBottom: '8px' }}>WYBIERZ TERMIN</p>
                {sessions.length === 0 ? (
                  <p style={{ ...mono, fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.5)' }}>Brak zaplanowanych terminów.</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map(s => {
                      const sp = availability[s.id];
                      const active = selectedSession?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSession(s)}
                          className="w-full text-left p-3"
                          style={{
                            border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`,
                            background: active ? 'rgb(var(--brand-rgb) / 0.07)' : 'transparent',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius)',
                          }}
                        >
                          <p style={{ ...mono, fontSize: '10px', color: 'hsl(var(--foreground))' }}>{formatSessionDate(s.date)}</p>
                          <p style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginTop: '3px' }}>
                            {formatSessionTime(s) || 'godzina wkrótce'}
                          </p>
                          <p style={{ ...mono, fontSize: '9px', marginTop: '5px', color: sp?.full ? '#ef4444' : '#16a34a' }}>
                            {sp ? (sp.full ? 'Brak wolnych miejsc' : `Wolne: ${sp.left} / ${sp.capacity}`) : 'Sprawdzanie miejsc...'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => selectedSession && !availability[selectedSession.id]?.full && setBookingSession(selectedSession)}
                disabled={!selectedSession || availability[selectedSession.id]?.full}
                className="btn-oxblood w-full mt-6 flex items-center justify-center gap-2"
                style={{ opacity: (!selectedSession || availability[selectedSession.id]?.full) ? 0.45 : 1 }}
              >
                <Users size={13} />
                {!selectedSession ? 'BRAK TERMINÓW' : availability[selectedSession.id]?.full ? 'BRAK WOLNYCH MIEJSC' : 'ZAREZERWUJ MIEJSCE'}
              </button>

              <div className="mt-6 space-y-2">
                {event.location && (
                  <p className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
                    <MapPin size={12} color="var(--brand)" /> {selectedSession?.location || event.location}
                  </p>
                )}
                {selectedSession?.start_time && (
                  <p className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
                    <Clock size={12} color="var(--brand)" /> {formatSessionTime(selectedSession)}
                  </p>
                )}
                {Number(event.min_participants) > 0 && (
                  <p style={{ ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.4)', lineHeight: 1.7 }}>
                    Minimalna liczba uczestników: {event.min_participants}
                  </p>
                )}
              </div>
            </div>

            {(leaders.length > 0 || externalLeaders.length > 0) && (
              <div className="mt-6 p-6" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
                <p style={{ ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginBottom: '12px' }}>PROWADZĄCY</p>
                <div className="space-y-3">
                  {leaders.map(a => (
                    <Link key={a.id} to={`/artists/${a.slug || a.id}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgb(var(--brand-rgb) / 0.12)' }} />
                      )}
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'hsl(var(--foreground))' }}>{a.name}</span>
                    </Link>
                  ))}
                  {externalLeaders.map((name, i) => (
                    <div key={`external-${name}-${i}`} className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgb(var(--brand-rgb) / 0.12)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.06em', color: 'var(--brand)' }}
                      >
                        {initials(name)}
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'hsl(var(--foreground))' }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {bookingSession && (
        <EventBookingForm
          event={event}
          session={bookingSession}
          spots={availability[bookingSession.id]}
          user={user}
          onClose={() => setBookingSession(null)}
          onBooked={load}
        />
      )}

      {lightbox !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setLightbox(null)}>
          <img src={gallery[lightbox]} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }} />
          <div className="absolute bottom-8 flex items-center gap-4">
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length); }} className="btn-ghost-parchment">←</button>
            <span style={{ ...mono, fontSize: '10px', color: '#F5F0EB' }}>{lightbox + 1} / {gallery.length}</span>
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length); }} className="btn-ghost-parchment">→</button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}