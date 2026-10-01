import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, User, FileText, AlertCircle, ChevronRight } from 'lucide-react';

const STATUS_LABELS = { pending: 'Oczekująca', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

export default function ClientHome() {
  const { client, user, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', mutedLow: 'rgba(0,0,0,0.55)', fuchsia: 'var(--brand)', panelBg: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', mutedLow: 'rgba(245,240,235,0.65)', fuchsia: 'var(--brand)', panelBg: '#141414' };

  const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#16a34a', completed: '#3b82f6', cancelled: theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)' };

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200)
      .then(res => setBookings(res.filter(b => b.status !== 'cancelled')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Realtime — statystyki i następna sesja odświeżają się na żywo
  useRealtimeSync('Booking', () => {
    if (!user?.email) return;
    base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200)
      .then(res => setBookings(res.filter(b => b.status !== 'cancelled')))
      .catch(() => {});
  }, [user?.email]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>;
  }

  const today = new Date();
  const upcoming = bookings.filter(b => {
    const d = b.session_date ? parseISO(b.session_date) : null;
    return d && (isAfter(d, today) || isToday(d));
  }).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));

  const completed = bookings.filter(b => b.status === 'completed');
  const pendingForms = bookings.filter(b => !b.health_form_completed && b.status !== 'completed' && b.status !== 'cancelled');

  const nextSession = upcoming[0];

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          WITAJ
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          {client?.name || user?.full_name || 'Klient'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Nadchodzące', value: upcoming.length, color: t.fuchsia },
          { label: 'Zakończone', value: completed.length, color: '#16a34a' },
          { label: 'Wszystkie', value: bookings.length, color: t.text },
          { label: 'Ankiety do wypełnienia', value: pendingForms.length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="p-4" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next session */}
      {nextSession ? (
        <div className="mb-8 p-6" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.3)', background: 'rgb(var(--brand-rgb) /0.03)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
            NASTĘPNA SESJA
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>
                {format(parseISO(nextSession.session_date), 'd MMMM yyyy', { locale: pl })}
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                  <Clock size={11} /> {nextSession.session_time}
                </span>
                {nextSession.artist_name && (
                  <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                    <User size={11} /> {nextSession.artist_name}
                  </span>
                )}
              </div>
              {nextSession.tattoo_placement && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.mutedLow, marginTop: '6px' }}>
                  {nextSession.tattoo_placement}
                </p>
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: STATUS_COLORS[nextSession.status], letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[nextSession.status]}` }}>
              {STATUS_LABELS[nextSession.status]}
            </span>
          </div>
          {!nextSession.health_form_completed && (
            <a href={`/health-form?booking_id=${nextSession.id}`} className="btn-oxblood mt-4 inline-flex items-center gap-2" style={{ fontSize: '9px', padding: '8px 16px', textDecoration: 'none' }}>
              <AlertCircle size={12} /> WYPEŁNIJ ANKIETĘ ZDROWOTNĄ
            </a>
          )}
        </div>
      ) : (
        <div className="mb-8 p-8 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg }}>
          <Calendar size={24} color={t.mutedLow} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
            BRAK NADCHODZĄCYCH SESJI
          </p>
          <Link to="/booking" className="btn-oxblood mt-4 inline-block" style={{ fontSize: '9px', padding: '8px 16px', textDecoration: 'none' }}>
            UMÓW SESJĘ
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <Link to="/panel/sessions" className="flex items-center justify-between p-4 transition-all" style={{ border: `0.5px solid ${t.border}` }} onMouseEnter={e => e.currentTarget.style.borderColor = t.fuchsia} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
          <span className="flex items-center gap-3">
            <Calendar size={14} color={t.fuchsia} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Twoje Sesje</span>
          </span>
          <ChevronRight size={14} color={t.mutedLow} />
        </Link>
        <Link to="/panel/health-forms" className="flex items-center justify-between p-4 transition-all" style={{ border: `0.5px solid ${t.border}` }} onMouseEnter={e => e.currentTarget.style.borderColor = t.fuchsia} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
          <span className="flex items-center gap-3">
            <FileText size={14} color={t.fuchsia} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ankiety Zdrowotne</span>
          </span>
          <ChevronRight size={14} color={t.mutedLow} />
        </Link>
      </div>
    </div>
  );
}