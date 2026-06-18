import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Calendar, Clock, TrendingUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isPast, parseISO, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

// ── Booking Detail / View Modal ──────────────────────────────────────────────
function BookingModal({ booking, isNew, artist, artistServices, theme, onClose, onSaved }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const [form, setForm] = useState(() => {
    if (isNew) return {
      client_name: '', client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
      session_date: booking?.session_date || format(new Date(), 'yyyy-MM-dd'),
      session_time: '', session_end_time: '', session_duration: 0,
      tattoo_description: '', tattoo_placement: '', estimated_price: '',
      service_id: '', service_name: '', notes: '', status: 'pending', deposit_paid: false,
      artist_id: artist.id, artist_name: artist.name,
    };
    return { ...booking };
  });
  const [showHealthForm, setShowHealthForm] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      await base44.entities.Booking.update(booking.id, { status: 'cancelled' });
      onSaved();
      return;
    }
    await base44.entities.Booking.update(booking.id, { status: newStatus });
    setForm(f => ({ ...f, status: newStatus }));
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '32px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>PODGLĄD SESJI</p>
            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
              {form.client_name}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        {/* Status badges */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: `0.5px solid ${STATUS_COLORS[form.status]}`, color: STATUS_COLORS[form.status] }}>
              {STATUS_LABELS[form.status]}
            </span>
            {form.deposit_paid && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ DEPOZYT</span>}
            {!form.health_form_completed && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', padding: '3px 8px', border: '0.5px solid #FF007F', color: '#FF007F' }}>BRAK ANKIETY</span>}
          </div>

          {/* Quick status change */}
          {form.status !== 'cancelled' && (
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>ZMIEŃ STATUS</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== form.status && k !== 'cancelled').map(([k, lbl]) => (
                  <button key={k} onClick={() => handleStatusChange(k)}
                    style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[k]}`, color: STATUS_COLORS[k], background: 'transparent', cursor: 'pointer' }}>
                    → {lbl}
                  </button>
                ))}
                <button onClick={() => handleStatusChange('cancelled')}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid #9ca3af', color: '#9ca3af', background: 'transparent', cursor: 'pointer' }}>
                  → Anuluj
                </button>
              </div>
            </div>
          )}

          {/* Details view */}
          <div className="space-y-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
            {[
              ['DATA', `${form.session_date || '—'}${form.session_time ? ` · ${form.session_time}${form.session_end_time ? `–${form.session_end_time}` : ''}` : ''}`],
              ['KLIENT', form.client_name],
              ['TELEFON', form.client_phone],
              ['EMAIL', form.client_email],
              ['USŁUGA', form.service_name],
              ['MIEJSCE', form.tattoo_placement],
              ['OPIS', form.tattoo_description],
              ['CENA', form.estimated_price ? `${form.estimated_price} zł` : null],
              ['NOTATKI', form.notes],
            ].filter(([, v]) => v).map(([lbl, val]) => (
              <div key={lbl}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{lbl}</p>
                <p style={{ color: t.text, fontSize: '13px' }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Health form button */}
          {form.health_form_completed && (
            <button onClick={() => setShowHealthForm(true)} className="btn-ghost-parchment" style={{ fontSize: '9px', marginTop: '8px', width: '100%' }}>
              PODGLĄD ANKIETY ZDROWOTNEJ
            </button>
          )}
        </div>
      </motion.div>

      {showHealthForm && (
        <HealthFormPreviewModal
          bookingId={booking?.id}
          clientName={form.client_name}
          onClose={() => setShowHealthForm(false)}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' }
          }
        />
      )}
    </div>
  );
}

export default function ArtistHome() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [artistServices, setArtistServices] = useState([]);

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', value: '#111111', rowHover: 'rgba(0,0,0,0.03)', rowBorder: '#E5E5E5' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', value: '#F5F0EB', rowHover: 'rgba(255,255,255,0.04)', rowBorder: '#262626' };

  useEffect(() => {
    if (!artist?.id) return;
    Promise.all([
      base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100),
      base44.entities.Service.filter({ is_active: true }),
    ]).then(([bk, svcs]) => {
      setBookings(bk);
      setArtistServices(svcs.filter(s => !s.artist_ids?.length || s.artist_ids.includes(artist.id)));
    }).finally(() => setLoading(false));
  }, [artist?.id]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.session_date >= todayStr && (b.status === 'pending' || b.status === 'confirmed'));
  const overdue = bookings.filter(b => b.session_date < todayStr && (b.status === 'pending' || b.status === 'confirmed'));
  const thisMonth = bookings.filter(b => b.session_date?.startsWith(new Date().toISOString().slice(0, 7)) && b.status === 'completed');
  const revenue = thisMonth.reduce((sum, b) => sum + ((b.estimated_price || 0) * (artist.artist_cut_percent || 60) / 100), 0);

  const KPI = [
    { label: 'Nadchodzące sesje', value: upcoming.length, icon: Calendar, link: '/artist/schedule' },
    { label: 'Sesje w tym miesiącu', value: thisMonth.length, icon: TrendingUp, link: '/artist/stats' },
    { label: 'Mój zarobek (mies.)', value: `${Math.round(revenue)} zł`, icon: Clock, link: '/artist/stats' },
  ];

  // All active sessions sorted ascending, max 10 upcoming
  const sortedUpcoming = [...upcoming].sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '') || (a.session_time || '').localeCompare(b.session_time || '')).slice(0, 10);

  // Group by date
  const groupByDate = (list) => {
    const groups = {};
    list.forEach(b => {
      const d = b.session_date || 'brak';
      if (!groups[d]) groups[d] = [];
      groups[d].push(b);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const overdueGroups = groupByDate(overdue.sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '')));
  const upcomingGroups = groupByDate(sortedUpcoming);

  const todayBookings = sortedUpcoming.filter(b => b.session_date === todayStr);
  const todayLabel = format(new Date(), 'EEEE, d MMMM', { locale: pl }).toUpperCase();

  const formatDayHeader = (dateStr) => {
    if (!dateStr || dateStr === 'brak') return 'BRAK DATY';
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `DZIŚ — ${format(d, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}`;
      return format(d, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase();
    } catch { return dateStr; }
  };

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>PANEL ARTYSTY</p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Cześć, {artist.name?.split(' ')[0]}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={kpi.link} className="block p-6 h-full" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                <Icon size={16} color="#FF007F" className="mb-4" />
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.2rem', fontWeight: 400, color: t.value, lineHeight: 1, letterSpacing: '0.04em' }}>
                  {loading ? '—' : kpi.value}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>{kpi.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>NADCHODZĄCE SESJE</p>
          <Link to="/artist/schedule" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>WSZYSTKIE →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#FF007F' }} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue */}
            {overdueGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FF007F', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF007F' }}>DO ROZLICZENIA / PRZETERMINOWANE</p>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,0,127,0.3)' }} />
                </div>
                {overdueGroups.map(([date, items]) => (
                  <div key={date} className="mb-3">
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.7 }}>{formatDayHeader(date)}</p>
                    <div style={{ border: '0.5px solid rgba(255,0,127,0.4)', background: t.cardBg }}>
                      {items.map((b, i) => (
                        <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center justify-between p-4 cursor-pointer" style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }} onMouseEnter={e => e.currentTarget.style.background = t.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                              {b.session_time ? `${b.session_time} · ` : ''}{b.tattoo_placement || ''}
                            </p>
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status] }}>
                            {b.status?.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Today — always show */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#16a34a' }}>DZIŚ — {todayLabel}</p>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(22,163,74,0.3)' }} />
              </div>
              {todayBookings.length === 0 ? (
                <div className="py-5 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK UMÓWIONYCH SESJI DZIŚ</p>
                </div>
              ) : (
                <div style={{ border: `0.5px solid rgba(22,163,74,0.4)`, background: t.cardBg }}>
                  {todayBookings.map((b, i) => (
                    <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center justify-between p-4 cursor-pointer" style={{ borderBottom: i < todayBookings.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }} onMouseEnter={e => e.currentTarget.style.background = t.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div>
                        <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                          {b.session_time ? `${b.session_time} · ` : ''}{b.tattoo_placement || ''}
                        </p>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status] }}>
                        {b.status?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming (excluding today) */}
            {upcomingGroups.filter(([d]) => d !== todayStr).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FF007F', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.muted }}>{formatDayHeader(date)}</p>
                  <div style={{ flex: 1, height: '0.5px', background: t.cardBorder }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{items.length} {items.length === 1 ? 'sesja' : 'sesje'}</span>
                </div>
                <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                  {items.map((b, i) => (
                    <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center justify-between p-4 cursor-pointer" style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }} onMouseEnter={e => e.currentTarget.style.background = t.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div>
                        <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                          {b.session_time ? `${b.session_time} · ` : ''}{b.tattoo_placement || ''}
                        </p>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status] }}>
                        {b.status?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <BookingModal
            booking={selectedBooking}
            isNew={false}
            artist={artist}
            artistServices={artistServices}
            theme={theme}
            onClose={() => setSelectedBooking(null)}
            onSaved={() => {
              base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100).then(setBookings);
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}