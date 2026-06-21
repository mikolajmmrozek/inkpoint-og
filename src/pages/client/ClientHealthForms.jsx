import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FileText, AlertCircle } from 'lucide-react';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';

export default function ClientHealthForms() {
  const { user, theme } = useOutletContext();
  const [forms, setForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState(null);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', mutedLow: 'rgba(0,0,0,0.2)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', mutedLow: 'rgba(245,240,235,0.2)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      base44.entities.HealthForm.filter({ client_email: user.email }, '-form_filled_date', 200),
      base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200),
    ]).then(([f, b]) => {
      setForms(f);
      setBookings(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  // Bookings that need health forms (upcoming, no form)
  const pendingBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    if (b.health_form_completed) return false;
    const d = b.session_date ? parseISO(b.session_date) : null;
    return d && d >= new Date();
  });

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          DOKUMENTY
        </p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Ankiety Zdrowotne
        </h1>
      </div>

      {/* Pending forms */}
      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#f59e0b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            DO WYPEŁNIENIA ({pendingBookings.length})
          </p>
          <div className="space-y-2">
            {pendingBookings.map(b => (
              <a
                key={b.id}
                href={`/health-form?booking_id=${b.id}`}
                className="flex items-center justify-between p-4 transition-all"
                style={{ border: '0.5px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.03)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={14} color="#f59e0b" />
                  <div>
                    <p style={{ fontSize: '13px', color: t.text }}>{b.session_date} {b.session_time && `· ${b.session_time}`}</p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{b.artist_name || '—'}</p>
                  </div>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  WYPEŁNIJ →
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Completed forms */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>
      ) : forms.length === 0 ? (
        <div className="py-16 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <FileText size={24} color={t.mutedLow} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
            BRAK UZUPEŁNIONYCH ANKIET
          </p>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            UZUPEŁNIONE ({forms.length})
          </p>
          <div className="space-y-2">
            {forms.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFormId(f.id)}
                className="w-full text-left p-4 transition-all"
                style={{ border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = t.fuchsia}
                onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: '13px', color: t.text }}>
                      {f.form_filled_date ? format(parseISO(f.form_filled_date), 'd MMMM yyyy', { locale: pl }) : '—'}
                    </p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>
                      {f.procedure_type || '—'}{f.body_placement ? ` · ${f.body_placement}` : ''}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    PODGLĄD →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {selectedFormId && (
        <HealthFormPreviewModal
          healthFormId={selectedFormId}
          onClose={() => setSelectedFormId(null)}
          t={t}
        />
      )}
    </div>
  );
}