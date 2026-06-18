import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, MessageSquare, FileText, TrendingUp, Clock, AlertCircle, ClipboardList } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from './Dashboard';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';

export default function DashboardHome() {
  const { theme } = useTheme();
  const [stats, setStats] = useState({ bookings: 0, pending: 0, messages: 0, forms: 0 });
  const [pendingByDay, setPendingByDay] = useState([]);
  const [draftForms, setDraftForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Booking.list('-created_date', 200),
      base44.entities.ContactMessage.filter({ is_read: false }),
      base44.entities.HealthForm.list('-created_date', 10),
      base44.entities.HealthForm.filter({ is_draft: true }, '-created_date', 50),
    ]).then(([bookings, messages, forms, drafts]) => {
      setAllBookings(bookings);
      setDraftForms(drafts);
      const pending = bookings.filter(b => b.status === 'pending');
      setStats({
        bookings: bookings.length,
        pending: pending.length,
        messages: messages.length,
        forms: forms.length,
      });

      // Group pending+confirmed by date, sorted ascending
      const active = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
      const grouped = {};
      active.forEach(b => {
        const day = b.session_date || 'Brak daty';
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(b);
      });
      const sorted = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => ({ date, items }));
      setPendingByDay(sorted);
    }).finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS = {
    pending: '#FF007F',
    confirmed: '#16a34a',
    completed: '#2563eb',
    cancelled: '#9ca3af',
  };

  const t = theme === 'light'
    ? { label: '#FF007F', title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', value: '#111111', rowHover: 'rgba(0,0,0,0.03)', rowBorder: '#E5E5E5', pageBg: '#D5D5D5' }
    : { label: '#FF007F', title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.06)', cardBorder: '#262626', value: '#F5F0EB', rowHover: 'rgba(255,255,255,0.05)', rowBorder: '#262626', pageBg: '#0A0A0A' };

  const KPI = [
    { label: 'Wszystkie rezerwacje', value: stats.bookings, icon: Calendar, link: '/dashboard/bookings' },
    { label: 'Oczekujące', value: stats.pending, icon: Clock, link: '/dashboard/bookings?filter=pending&view=list' },
    { label: 'Nowe wiadomości', value: stats.messages, icon: MessageSquare, link: '/dashboard/messages' },
    { label: 'Ankiety zdrowotne', value: stats.forms, icon: FileText, link: '/dashboard/health-forms' },
  ];

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.label, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          PANEL GŁÓWNY
        </p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Przegląd
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link to={kpi.link} className="block p-6 transition-all duration-300 h-full" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                <div className="flex items-start justify-between mb-4">
                  <Icon size={16} color="#FF007F" />
                  <TrendingUp size={12} color={t.muted} />
                </div>
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.value, lineHeight: 1, letterSpacing: '0.04em' }}>
                  {loading ? '—' : kpi.value}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>
                  {kpi.label}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Draft forms section */}
      {!loading && draftForms.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} color="#FF007F" />
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                NIEDOKOŃCZONE ANKIETY ({draftForms.length})
              </p>
            </div>
            <Link to="/dashboard/health-forms" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              WSZYSTKIE →
            </Link>
          </div>
          <div style={{ border: '0.5px solid rgba(255,0,127,0.4)', background: t.cardBg }}>
            {draftForms.map((f, i) => (
              <Link
                key={f.id}
                to={`/dashboard/health-forms`}
                className="flex items-center justify-between p-4 transition-colors"
                style={{ borderBottom: i < draftForms.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{f.client_name || `${f.client_first_name || ''} ${f.client_last_name || ''}`.trim() || 'Brak nazwy'}</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                    {f.client_email || ''}{f.procedure_type ? ` · ${f.procedure_type}` : ''}
                    {f.created_date ? ` · ${new Date(f.created_date).toLocaleDateString('pl-PL')}` : ''}
                  </p>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid #FF007F', color: '#FF007F' }}>
                  DRAFT
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions by day (pending + confirmed) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} color="#FF007F" />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              NADCHODZĄCE SESJE
            </p>
          </div>
          <Link to="/dashboard/bookings" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            WSZYSTKIE →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#FF007F' }} />
          </div>
        ) : pendingByDay.length === 0 ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
              ✓ BRAK SESJI DO POTWIERDZENIA
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingByDay.map(({ date, items }) => {
              const dateObj = date !== 'Brak daty' ? new Date(date) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = dateObj && dateObj < today;
              const isToday = dateObj && dateObj.toDateString() === today.toDateString();

              const dayLabel = dateObj
                ? dateObj.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Brak daty';

              return (
                <div key={date}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isPast ? '#FF007F' : isToday ? '#f59e0b' : '#16a34a', flexShrink: 0 }} />
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: isPast ? '#FF007F' : isToday ? '#f59e0b' : t.muted }}>
                      {isToday ? `DZIŚ — ${dayLabel}` : isPast ? `PRZETERMINOWANE — ${dayLabel}` : dayLabel}
                    </p>
                    <div style={{ flex: 1, height: '0.5px', background: isPast ? 'rgba(255,0,127,0.3)' : t.cardBorder }} />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: isPast ? '#FF007F' : t.muted, letterSpacing: '0.08em', textAlign: 'right', display: 'block' }}>
                      {items.length} {items.length === 1 ? 'sesja' : 'sesje'}
                    </span>
                  </div>

                  {/* Sessions */}
                  <div style={{ border: `0.5px solid ${isPast ? 'rgba(255,0,127,0.4)' : t.cardBorder}`, background: t.cardBg }}>
                    {items.map((b, i) => (
                      <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center justify-between p-4 cursor-pointer transition-colors" style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = t.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="flex items-center gap-4">
                          <div>
                            <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                              {b.artist_name && `${b.artist_name} · `}{b.session_time && `${b.session_time}${b.session_end_time ? `–${b.session_end_time}` : ''}`}
                              {b.tattoo_placement && ` · ${b.tattoo_placement}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!b.health_form_completed && (
                            <span title="Brak ankiety zdrowotnej" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: '0.5px solid #FF007F', color: '#FF007F', background: 'rgba(255,0,127,0.08)' }}>
                              ANKIETA
                            </span>
                          )}
                          {b.estimated_price && (
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>
                              {b.estimated_price} zł
                            </span>
                          )}
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status] || '#FF007F'}`, color: STATUS_COLORS[b.status] || '#FF007F' }}>
                            {b.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
      {selectedBooking && (
        <BookingDetailPanel
          booking={selectedBooking}
          theme={theme}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={(id, status) => {
            base44.entities.Booking.update(id, { status }).then((updated) => {
              setAllBookings(prev => prev.map(b => b.id === id ? updated : b));
              const active = allBookings.map(b => b.id === id ? updated : b).filter(b => b.status === 'pending' || b.status === 'confirmed');
              const grouped = {};
              active.forEach(b => {
                const day = b.session_date || 'Brak daty';
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(b);
              });
              setPendingByDay(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items })));
            });
          }}
          onEdit={() => { setEditingBooking(selectedBooking); setSelectedBooking(null); }}
          onDelete={async (id) => {
            await base44.entities.Booking.delete(id);
            setAllBookings(prev => prev.filter(b => b.id !== id));
            setPendingByDay(prev => prev.map(({ date, items }) => ({ date, items: items.filter(b => b.id !== id) })).filter(({ items }) => items.length > 0));
            setSelectedBooking(null);
          }}
          onUpdate={(updated) => {
            setAllBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
            // Refresh active list
            const pending = allBookings.map(b => b.id === updated.id ? updated : b).filter(b => b.status === 'pending' || b.status === 'confirmed');
            const grouped = {};
            pending.forEach(b => {
              const day = b.session_date || 'Brak daty';
              if (!grouped[day]) grouped[day] = [];
              grouped[day].push(b);
            });
            setPendingByDay(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items })));
            setSelectedBooking(null);
          }}
        />
      )}
      </AnimatePresence>

      {editingBooking && (
        <BookingModal
          booking={editingBooking}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)' }
          }
          onClose={() => setEditingBooking(null)}
          onSaved={() => {
            base44.entities.Booking.list('-created_date', 200).then(bookings => {
              setAllBookings(bookings);
              const pending = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
              const grouped = {};
              pending.forEach(b => {
                const day = b.session_date || 'Brak daty';
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(b);
              });
              setPendingByDay(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items })));
            });
            setEditingBooking(null);
          }}
        />
      )}


    </div>
  );
}