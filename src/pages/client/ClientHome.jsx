import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, User, FileText, AlertCircle, ChevronRight } from 'lucide-react';

const STATUS_LABELS = { pending: 'Oczekująca', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };
const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#16a34a', completed: '#3b82f6', cancelled: 'rgba(245,240,235,0.3)' };

export default function ClientHome() {
  const { client, user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200)
      .then(res => setBookings(res.filter(b => b.status !== 'cancelled')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} /></div>;
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
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          WITAJ
        </p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em' }}>
          {client?.name || user?.full_name || 'Klient'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Nadchodzące', value: upcoming.length, color: '#FF007F' },
          { label: 'Zakończone', value: completed.length, color: '#16a34a' },
          { label: 'Wszystkie', value: bookings.length, color: '#F5F0EB' },
          { label: 'Ankiety do wypełnienia', value: pendingForms.length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="p-4" style={{ border: '0.5px solid #262626' }}>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2rem', fontWeight: 400, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next session */}
      {nextSession ? (
        <div className="mb-8 p-6" style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.03)' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
            NASTĘPNA SESJA
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>
                {format(parseISO(nextSession.session_date), 'd MMMM yyyy', { locale: pl })}
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.5)' }}>
                  <Clock size={11} /> {nextSession.session_time}
                </span>
                {nextSession.artist_name && (
                  <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.5)' }}>
                    <User size={11} /> {nextSession.artist_name}
                  </span>
                )}
              </div>
              {nextSession.tattoo_placement && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', marginTop: '6px' }}>
                  {nextSession.tattoo_placement}
                </p>
              )}
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: STATUS_COLORS[nextSession.status], letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[nextSession.status]}` }}>
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
        <div className="mb-8 p-8 text-center" style={{ border: '0.5px solid #262626' }}>
          <Calendar size={24} color="rgba(245,240,235,0.2)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>
            BRAK NADCHODZĄCYCH SESJI
          </p>
          <Link to="/booking" className="btn-oxblood mt-4 inline-block" style={{ fontSize: '9px', padding: '8px 16px', textDecoration: 'none' }}>
            UMÓW SESJĘ
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <Link to="/panel/sessions" className="flex items-center justify-between p-4 transition-all" style={{ border: '0.5px solid #262626' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#FF007F'} onMouseLeave={e => e.currentTarget.style.borderColor = '#262626'}>
          <span className="flex items-center gap-3">
            <Calendar size={14} color="#FF007F" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#F5F0EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Twoje Sesje</span>
          </span>
          <ChevronRight size={14} color="rgba(245,240,235,0.3)" />
        </Link>
        <Link to="/panel/health-forms" className="flex items-center justify-between p-4 transition-all" style={{ border: '0.5px solid #262626' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#FF007F'} onMouseLeave={e => e.currentTarget.style.borderColor = '#262626'}>
          <span className="flex items-center gap-3">
            <FileText size={14} color="#FF007F" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#F5F0EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ankiety Zdrowotne</span>
          </span>
          <ChevronRight size={14} color="rgba(245,240,235,0.3)" />
        </Link>
      </div>
    </div>
  );
}