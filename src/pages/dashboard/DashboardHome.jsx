import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, TrendingUp, AlertCircle, ClipboardList, Wallet, Inbox } from 'lucide-react';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from './Dashboard';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';
import HealthFormBadge from '@/components/booking/HealthFormBadge';
import TodayOverview from '@/components/dashboard/TodayOverview';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildHealthFormStatusMap, resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import { pluralSesji } from '@/utils';
import { formatCompact } from '@/lib/formatNumber';

export default function DashboardHome() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({ bookings: 0, pending: 0, messages: 0, forms: 0, toSettle: 0, changeRequests: 0 });
  const [pendingByDay, setPendingByDay] = useState([]);
  const [draftForms, setDraftForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [healthStatusMap, setHealthStatusMap] = useState({});
  const [previewForm, setPreviewForm] = useState(null); // { id?, bookingId?, clientName }

  useEffect(() => {
    Promise.all([
      base44.entities.Booking.list('-created_date', 5000),
      base44.entities.ContactMessage.filter({ is_read: false }),
      base44.entities.HealthForm.list('-created_date', 10),
      base44.entities.HealthForm.filter({ is_draft: true }, '-created_date', 50),
      base44.entities.Artist.list(),
      base44.entities.HealthForm.list('-created_date', 300),
      base44.entities.ChangeRequest.list('-created_date', 200),
    ]).then(([bookings, messages, forms, drafts, artistData, healthForms, changeRequests]) => {
      setAllBookings(bookings);
      setArtists(artistData);
      setHealthStatusMap(buildHealthFormStatusMap(healthForms));
      setDraftForms(drafts);
      const todayStr = new Date().toISOString().split('T')[0];
      const futureBookings = bookings.filter(b => (b.session_date || '') >= todayStr);
      const pending = bookings.filter(b => b.status === 'pending');
      const completedForms = healthForms.filter(f => !f.is_draft);
      // Sessions needing settlement: past or today, not cancelled, not settled, not completed.
      const toSettle = bookings.filter(b => (b.session_date || '') <= todayStr && b.status !== 'cancelled' && b.status !== 'completed' && !b.is_settled);
      const openChangeRequests = changeRequests.filter(r => r.status === 'pending' || r.status === 'studio_proposed');
      setStats({
        bookings: futureBookings.length,
        pending: pending.length,
        messages: messages.length,
        forms: completedForms.length,
        toSettle: toSettle.length,
        changeRequests: openChangeRequests.length,
      });

      // Today: show ALL sessions (except cancelled) for day-of operations
      // Future: pending + confirmed only, limited to 10
      // Past overdue: only pending/confirmed sessions that still need action
      // Only sessions that still need action: not completed, not cancelled, not settled.
      const needsAction = b => !b.is_settled && b.status !== 'completed' && b.status !== 'cancelled';
      const todayBookings = bookings
        .filter(b => b.session_date === todayStr && needsAction(b))
        .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
      const futureActive = bookings
        .filter(b => (b.session_date || '') > todayStr && needsAction(b))
        .sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '') || (a.session_time || '').localeCompare(b.session_time || ''));
      // No past overdue in the overview — those live in the "Do rozliczenia" filter.
      const futureLimited = futureActive.slice(0, 10);
      const grouped = {};
      [...todayBookings, ...futureLimited].forEach(b => {
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
    ? { label: 'var(--brand)', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)', fuchsia: 'var(--brand)', border: '#E5E5E5', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', value: '#111111', rowHover: 'rgba(0,0,0,0.03)', rowBorder: '#E5E5E5', pageBg: '#D5D5D5' }
    : { label: 'var(--brand)', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)', fuchsia: 'var(--brand)', border: '#262626', cardBg: 'rgba(255,255,255,0.06)', cardBorder: '#262626', value: '#F5F0EB', rowHover: 'rgba(255,255,255,0.05)', rowBorder: '#262626', pageBg: '#0A0A0A' };

  // Połączony kafekl: oczekujące rezerwacje + prośby o zmianę terminu → jeden widok w Rezerwacjach.
  const pendingAndRequests = stats.pending + stats.changeRequests;

  const KPI = [
    { label: 'Wszystkie rezerwacje', value: stats.bookings, icon: Calendar, link: '/dashboard/bookings' },
    { label: 'Do weryfikacji', value: pendingAndRequests, icon: Inbox, link: '/dashboard/bookings?view=pending', sublabel: `${stats.pending} rezerw. · ${stats.changeRequests} zmiany` },
    { label: 'Nowe wiadomości', value: stats.messages, icon: MessageSquare, link: '/dashboard/messages' },
    { label: 'Do rozliczenia', value: stats.toSettle, icon: Wallet, link: '/dashboard/bookings?filter=to_settle&view=list&tab=past' },
  ];

  const buildPendingByDay = (bookingsArr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const needsAction = b => !b.is_settled && b.status !== 'completed' && b.status !== 'cancelled';
    const todayBookings = bookingsArr
      .filter(b => b.session_date === todayStr && needsAction(b))
      .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
    const futureActive = bookingsArr
      .filter(b => (b.session_date || '') > todayStr && needsAction(b))
      .sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '') || (a.session_time || '').localeCompare(b.session_time || ''));
    // No past overdue in the overview — those live in the "Do rozliczenia" filter.
    const futureLimited = futureActive.slice(0, 10);
    const grouped = {};
    [...todayBookings, ...futureLimited].forEach(b => {
      const day = b.session_date || 'Brak daty';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(b);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  };

  return (
    <div>
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
              <Link to={kpi.link} className="block p-6 transition-all duration-300 h-full" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
                <div className="flex items-start justify-between mb-4">
                  <Icon size={16} color="var(--brand)" />
                  <TrendingUp size={12} color={t.muted} />
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.value, lineHeight: 1, letterSpacing: '0.04em' }}>
                  {loading ? '—' : formatCompact(kpi.value)}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>
                  {kpi.label}
                </p>
                {kpi.sublabel && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '3px', opacity: 0.85 }}>
                    {kpi.sublabel}
                  </p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Today's cash + settlement overview */}
      {!loading && (
        <TodayOverview
          bookings={allBookings}
          artists={artists}
          t={t}
          theme={theme}
          onBookingUpdate={(updated) => setAllBookings(prev => prev.map(b => b.id === updated.id ? updated : b))}
        />
      )}

      {/* Draft forms section */}
      {!loading && draftForms.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} color="var(--brand)" />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                NIEDOKOŃCZONE ANKIETY ({draftForms.length})
              </p>
            </div>
            <Link to="/dashboard/health-forms" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              WSZYSTKIE →
            </Link>
          </div>
          <div style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.4)', background: t.cardBg, borderRadius: 'var(--radius)' }}>
            {draftForms.map((f, i) => {
              const clientName = f.client_name || `${f.client_first_name || ''} ${f.client_last_name || ''}`.trim() || 'Brak nazwy';
              return (
                <button
                  key={f.id}
                  onClick={() => setPreviewForm({ healthFormId: f.id, clientName, isDraft: true })}
                  className="flex items-center justify-between p-4 transition-colors w-full text-left"
                  style={{ borderBottom: i < draftForms.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: i < draftForms.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{clientName}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                      {f.client_email || ''}{f.procedure_type ? ` · ${f.procedure_type}` : ''}
                      {f.created_date ? ` · ${new Date(f.created_date).toLocaleDateString('pl-PL')}` : ''}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid var(--brand)', color: 'var(--brand)', flexShrink: 0 }}>
                    DRAFT
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active sessions by day (pending + confirmed) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} color="var(--brand)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              NADCHODZĄCE SESJE
            </p>
          </div>
          <Link to="/dashboard/bookings" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            WSZYSTKIE →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: 'var(--brand)' }} />
          </div>
        ) : pendingByDay.length === 0 ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
              ✓ BRAK SESJI DO POTWIERDZENIA
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
               const now = new Date();
               const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
               const hasToday = pendingByDay.some(d => d.date === todayStr);
              if (!hasToday) {
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                const todayLabel = todayObj.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                return (
                  <div>
                    {/* Day header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a' }}>
                        DZISIAJ — {todayLabel}
                      </p>
                      <div style={{ flex: 1, height: '0.5px', background: t.cardBorder }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>0 sesji</span>
                    </div>
                    {/* No sessions message */}
                    <div className="py-3 px-4 flex items-center justify-center gap-2" style={{ border: `0.5px solid #16a34a`, background: t.cardBg }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        BRAK SESJI DZIŚ
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isPast ? '#9ca3af' : isToday ? '#16a34a' : '#16a34a', flexShrink: 0 }} />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isPast ? t.muted : isToday ? '#16a34a' : t.muted }}>
                      {isToday ? `DZISIAJ — ${dayLabel}` : isPast ? `PRZETERMINOWANE — ${dayLabel}` : dayLabel}
                    </p>
                    <div style={{ flex: 1, height: '0.5px', background: t.cardBorder }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>
                      {items.length} {pluralSesji(items.length)}
                    </span>
                  </div>

                  {/* Sessions */}
                  <div style={{ border: `0.5px solid ${isPast ? 'rgb(var(--brand-rgb) /0.4)' : t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
                    {items.map((b, i) => {
                      const artist = artists.find(a => a.id === b.artist_id);
                      return (
                        <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center justify-between p-4 cursor-pointer transition-colors" style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = t.rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 text-center" style={{ minWidth: isMobile ? '42px' : '52px' }}>
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '13px' : '16px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
                              {b.session_end_time ? (
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '11px', color: t.muted }}>→ {b.session_end_time}</p>
                              ) : b.session_time && b.session_duration ? (() => {
                                const [h, m] = b.session_time.split(':').map(Number);
                                const endTotal = h * 60 + m + b.session_duration;
                                return <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '11px', color: t.muted }}>→ {String(Math.floor(endTotal / 60)).padStart(2, '0')}:{String(endTotal % 60).padStart(2, '0')}</p>;
                              })() : null}
                            </div>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {artist?.photo_url ? (
                                <img src={artist.photo_url} alt={artist.name} loading="lazy" width={40} height={40} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
                              ) : (artist || b.artist_name) ? (
                                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--brand)', letterSpacing: '0.05em' }}>
                                    {(artist?.name || b.artist_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                {isMobile ? (() => {
                                  const parts = (b.client_name || '').split(' ');
                                  const first = parts[0] || '';
                                  const last = parts.slice(1).join(' ');
                                  return (
                                    <>
                                      <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{first}</p>
                                      {last && <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{last}</p>}
                                    </>
                                  );
                                })() : (
                                  <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                                )}
                                {!isMobile && (
                                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                                  </p>
                                )}
                                {isMobile && b.tattoo_placement && (
                                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {b.tattoo_placement}
                                  </p>
                                )}
                                {b.service_name && (
                                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                                    {b.service_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {isMobile ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex flex-col items-end gap-1">
                                {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted, letterSpacing: '0.04em' }}>BEZPŁATNA</span>
                                ) : b.estimated_price > 0 ? (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{b.estimated_price} PLN</span>
                                ) : null}
                                <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="8px" style={{ padding: '1px 4px' }} />
                              </div>
                              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
                              {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted, letterSpacing: '0.06em' }}>BEZPŁATNA</span>
                              ) : b.estimated_price > 0 ? (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>
                              ) : null}
                              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              setAllBookings(prev => {
                const next = prev.map(b => b.id === id ? updated : b);
                setPendingByDay(buildPendingByDay(next));
                return next;
              });
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
            setAllBookings(prev => {
              const next = prev.map(b => b.id === updated.id ? updated : b);
              setPendingByDay(buildPendingByDay(next));
              return next;
            });
            setSelectedBooking(null);
          }}
        />
      )}
      </AnimatePresence>

      {previewForm && (
        <HealthFormPreviewModal
          healthFormId={previewForm.healthFormId}
          bookingId={previewForm.bookingId}
          clientName={previewForm.clientName}
          onClose={() => setPreviewForm(null)}
          extraAction={previewForm.isDraft ? {
            label: '↩ KONTYNUUJ ANKIETĘ',
            onClick: () => window.open(`/health-form?edit_form_id=${previewForm.healthFormId}`, '_blank'),
          } : null}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' }
          }
        />
      )}

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
              setPendingByDay(buildPendingByDay(bookings));
            });
            setEditingBooking(null);
          }}
        />
      )}


    </div>
  );
}