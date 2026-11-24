import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CalendarDays, Users, Mail, Phone, ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, formatSessionDate, formatSessionTime, sessionSpots } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

export default function ArtistEvents() {
  const { artist, theme } = useOutletContext();
  const t = theme === 'light'
    ? { cardBg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)' }
    : { cardBg: 'rgba(255,255,255,0.04)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)' };

  const [data, setData] = useState({ events: [], sessions: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('getEventParticipants', {})
      .then(res => {
        if (res.data?.error) setError(res.data.error);
        else setData({ events: res.data.events || [], sessions: res.data.sessions || [], bookings: res.data.bookings || [] });
      })
      .catch(e => setError(e?.response?.data?.error || 'Nie udało się pobrać wydarzeń.'))
      .finally(() => setLoading(false));
  }, [artist?.id]);

  const upcoming = [...data.events]
    .filter(e => e.status !== 'draft')
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  if (loading) {
    return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin" color="var(--brand)" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>MOJE WARSZTATY</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1, marginTop: '4px' }}>
          Prowadzone wydarzenia
        </h1>
      </div>

      {error && <p style={{ ...mono, fontSize: '9px', color: '#ef4444', marginBottom: '14px' }}>{error}</p>}

      {upcoming.length === 0 ? (
        <div className="py-14 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <p style={{ ...mono, fontSize: '10px', color: t.muted }}>Nie jesteś jeszcze przypisany do żadnego wydarzenia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.map(event => {
            const evSessions = data.sessions.filter(s => s.event_id === event.id);
            const evBookings = data.bookings.filter(b => b.event_id === event.id);
            const confirmed = evBookings.filter(b => b.status === 'confirmed');
            const pending = evBookings.filter(b => b.status === 'pending');
            const open = openId === event.id;
            return (
              <div key={event.id} style={{ border: `0.5px solid ${t.border}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
                <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>{event.title}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '4px' }}>{event.category_name || 'wydarzenie'}</p>
                    {event.short_description && (
                      <p style={{ fontSize: '12px', color: t.muted, marginTop: '6px', lineHeight: 1.6, maxWidth: '520px' }}>{event.short_description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>{confirmed.length} potwierdzonych</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '3px' }}>{pending.length} oczekuje</p>
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-2">
                  {evSessions.map(s => {
                    const spots = sessionSpots(s, evBookings);
                    return (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                        <p className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: t.text }}>
                          <CalendarDays size={11} color="var(--brand)" />
                          {formatSessionDate(s.date)} · {formatSessionTime(s)}
                        </p>
                        <p style={{ ...mono, fontSize: '9px', color: spots.full ? '#ef4444' : t.muted }}>
                          {spots.taken}/{spots.capacity} miejsc
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setOpenId(open ? null : event.id)}
                    style={{ ...mono, fontSize: '9px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Users size={11} /> {open ? 'Ukryj uczestników' : 'Pokaż uczestników'}
                    <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  <Link to="/artist/messages" style={{ ...mono, fontSize: '9px', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <MessageSquare size={11} /> Wiadomości
                  </Link>
                </div>

                {open && (
                  <div style={{ borderTop: `0.5px solid ${t.border}` }}>
                    {evBookings.length === 0 ? (
                      <p style={{ ...mono, fontSize: '9px', color: t.muted, padding: '14px 16px' }}>Brak zapisanych uczestników.</p>
                    ) : evBookings.map((b, i) => (
                      <div key={b.id} className="px-4 py-2.5 flex flex-wrap items-start justify-between gap-2" style={{ borderTop: i === 0 ? 'none' : `0.5px solid ${t.border}` }}>
                        <div className="min-w-0">
                          <p style={{ fontSize: '13px', color: t.text, fontWeight: 600 }}>{b.client_name}</p>
                          <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '3px' }}>
                            {formatSessionDate(b.session_date, false)} · {b.session_start_time || '—'} · {b.participants || 1} os.
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {b.email && <a href={`mailto:${b.email}`} style={{ ...mono, fontSize: '8px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Mail size={9} /> {b.email}</a>}
                            {b.phone && <a href={`tel:${String(b.phone).replace(/\s/g, '')}`} style={{ ...mono, fontSize: '8px', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Phone size={9} /> {b.phone}</a>}
                          </div>
                          {b.notes && <p style={{ fontSize: '11px', color: t.muted, marginTop: '4px', lineHeight: 1.5 }}>{b.notes}</p>}
                        </div>
                        <span style={{ ...mono, fontSize: '8px', color: BOOKING_STATUS_COLORS[b.status], border: `0.5px solid ${BOOKING_STATUS_COLORS[b.status]}`, padding: '3px 7px', borderRadius: 'var(--radius)' }}>
                          {BOOKING_STATUS_LABELS[b.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}