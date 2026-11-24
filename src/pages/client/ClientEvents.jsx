import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CalendarDays, MapPin, Loader2, X } from 'lucide-react';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, formatPrice, formatSessionDate, formatSessionTime } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

export default function ClientEvents() {
  const { user, theme } = useOutletContext();
  const t = theme === 'light'
    ? { cardBg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)' }
    : { cardBg: 'rgba(255,255,255,0.04)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)' };

  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    await base44.functions.invoke('claimEventBookings', {}).catch(() => null);
    const rows = await base44.entities.EventBooking.filter({ user_email: user.email }, '-created_date', 100);
    setBookings(rows);
    const ids = [...new Set(rows.map(b => b.event_id))];
    if (ids.length > 0) {
      const evts = await base44.entities.Event.filter({ id: { $in: ids } }).catch(() => []);
      setEvents(evts);
    } else {
      setEvents([]);
    }
  };

  useEffect(() => { load().catch(() => setLoading(false)).finally(() => setLoading(false)); }, [user?.email]);

  const cancel = async (booking) => {
    if (!window.confirm(`Anulować zapis na „${booking.event_title}”?`)) return;
    setBusy(booking.id);
    setError('');
    try {
      const res = await base44.functions.invoke('manageEventBooking', { action: 'cancel_own', booking_id: booking.id });
      if (res.data?.error) setError(res.data.error);
      else await load();
    } catch (e) {
      setError(e?.response?.data?.error || 'Nie udało się anulować zapisu.');
    } finally { setBusy(''); }
  };

  const eventOf = (id) => events.find(e => e.id === id);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin" color="var(--brand)" /></div>;

  return (
    <div>
      <div className="mb-6">
        <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>MOJE WARSZTATY</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1, marginTop: '4px' }}>
          Zapisane wydarzenia
        </h1>
      </div>

      {error && <p style={{ ...mono, fontSize: '9px', color: '#ef4444', marginBottom: '14px' }}>{error}</p>}

      {bookings.length === 0 ? (
        <div className="py-14 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <CalendarDays size={22} color="var(--brand)" className="mx-auto mb-3" />
          <p style={{ ...mono, fontSize: '10px', color: t.muted }}>Nie masz jeszcze zapisów na wydarzenia.</p>
          <Link to="/wydarzenia" className="btn-ghost-parchment inline-block mt-5" style={{ fontSize: '9px' }}>ZOBACZ OFERTĘ</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => {
            const event = eventOf(b.event_id);
            const canCancel = ['pending', 'confirmed'].includes(b.status) && b.session_date >= new Date().toISOString().slice(0, 10);
            return (
              <div key={b.id} className="p-4 flex flex-wrap gap-4 items-start" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
                {event?.main_image_url && (
                  <img src={event.main_image_url} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                )}
                <div className="flex-1 min-w-[180px]">
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                    {b.event_title}
                  </p>
                  <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '6px' }}>
                    {formatSessionDate(b.session_date)} · {b.session_start_time ? `${b.session_start_time}${b.session_end_time ? `–${b.session_end_time}` : ''}` : formatSessionTime({ start_time: b.session_start_time })}
                  </p>
                  {b.leader_names?.length > 0 && (
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '3px' }}>PROWADZENIE: {b.leader_names.join(', ')}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {event?.location && (
                      <span style={{ ...mono, fontSize: '8px', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={9} /> {event.location}
                      </span>
                    )}
                    {event && <span style={{ ...mono, fontSize: '8px', color: 'var(--brand)' }}>{formatPrice(event.price)}</span>}
                  </div>
                  {b.notes && <p style={{ fontSize: '11px', color: t.muted, marginTop: '5px' }}>{b.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span style={{ ...mono, fontSize: '8px', color: BOOKING_STATUS_COLORS[b.status], border: `0.5px solid ${BOOKING_STATUS_COLORS[b.status]}`, padding: '3px 8px', borderRadius: 'var(--radius)' }}>
                    {BOOKING_STATUS_LABELS[b.status]}
                  </span>
                  {canCancel && (
                    <button
                      onClick={() => cancel(b)}
                      disabled={busy === b.id}
                      style={{ ...mono, fontSize: '8px', color: t.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      {busy === b.id ? <Loader2 size={9} className="animate-spin" /> : <X size={9} />} ANULUJ ZAPIS
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}