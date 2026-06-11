import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, Calendar, List, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTheme } from './Dashboard';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';
import DailyScheduleView from '@/components/dashboard/DailyScheduleView';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function DashboardBookings() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', pageBg: '#F8F8F8', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
    : { bg: 'rgba(10,10,10,0.8)', pageBg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' };

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [artistFilter, setArtistFilter] = useState('all');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list' | 'day'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const load = async () => {
    const [data, artistData] = await Promise.all([
      base44.entities.Booking.list('-session_date', 200),
      base44.entities.Artist.list(),
    ]);
    setBookings(data);
    setArtists(artistData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Booking.update(id, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));

    // Send feedback survey email when booking is completed
    if (status === 'completed') {
      const booking = bookings.find(b => b.id === id);
      if (booking?.client_email) {
        const surveyLink = `${window.location.origin}/feedback?booking_id=${id}`;
        const configRes = await base44.entities.FeedbackSurveyConfig.filter({ key: 'default' }).catch(() => []);
        const cfg = configRes.length > 0 ? configRes[0] : {};
        const subject = cfg.email_subject || 'Jak minęła Twoja sesja? Podziel się opinią!';
        const bodyTemplate = cfg.email_body || 'Cześć {client_name},\n\nDziękujemy za wizytę!\n\nOcena: {link}';
        const body = bodyTemplate.replace('{client_name}', booking.client_name || '').replace('{link}', surveyLink);
        await base44.integrations.Core.SendEmail({ to: booking.client_email, subject, body }).catch(() => {});
      }
    }
  };

  const deleteBooking = async (id) => {
    await base44.entities.Booking.delete(id);
    setBookings(b => b.filter(x => x.id !== id));
    setSelected(null);
  };

  const handleDayClick = (day) => {
    if (selectedDate && isSameDay(selectedDate, day)) {
      setViewMode('day');
    } else {
      setSelectedDate(day);
    }
    setSelected(null);
  };

  const handleNewBooking = () => {
    setEditingBooking(null);
    setShowModal(true);
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setShowModal(true);
  };

  const handleModalSaved = () => {
    setShowModal(false);
    setEditingBooking(null);
    load();
  };

  // Bookings to show in list (filtered by date if calendar or day view + date selected)
  const listBookings = (() => {
    let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    if (artistFilter !== 'all') base = base.filter(b => b.artist_id === artistFilter);
    if ((viewMode === 'calendar' || viewMode === 'day') && selectedDate) {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
    }
    return base;
  })();

  const calendarBookings = (() => {
    let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    if (artistFilter !== 'all') base = base.filter(b => b.artist_id === artistFilter);
    return base;
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-6">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            ZARZĄDZANIE
          </p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
            Rezerwacje
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex" style={{ border: `0.5px solid ${t.border}` }}>
            {[{ mode: 'calendar', icon: Calendar }, { mode: 'day', icon: Clock }, { mode: 'list', icon: List }].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); if (mode !== 'day' && mode !== 'calendar') setSelectedDate(new Date()); }}
                className="p-2.5 transition-all"
                style={{ background: viewMode === mode ? 'rgba(255,0,127,0.1)' : 'transparent', color: viewMode === mode ? '#FF007F' : t.muted, border: 'none', cursor: 'pointer' }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          {/* Artist filter */}
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setArtistFilter('all')} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilter === 'all' ? t.fuchsia : t.border}`, color: artistFilter === 'all' ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              Wszyscy
            </button>
            {artists.map(a => (
              <button key={a.id} onClick={() => setArtistFilter(a.id)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilter === a.id ? t.fuchsia : t.border}`, color: artistFilter === a.id ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                {a.name}
              </button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${filter === s ? t.fuchsia : t.border}`, color: filter === s ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                {s === 'all' ? 'Wszystkie' : s}
              </button>
            ))}
          </div>
          {/* New booking */}
          <button onClick={handleNewBooking} className="flex items-center gap-2 btn-oxblood" style={{ padding: '10px 20px' }}>
            <Plus size={13} /> NOWA SESJA
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Calendar view */}
            {viewMode === 'calendar' && (
              <BookingCalendar
                bookings={calendarBookings}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
                t={t}
              />
            )}

            {/* Day view */}
            {viewMode === 'day' && (
              <DailyScheduleView
                bookings={calendarBookings}
                artists={artists}
                selectedDate={selectedDate || new Date()}
                onDateChange={(day) => setSelectedDate(day)}
                onBookingClick={(b) => setSelected(b)}
                t={t}
              />
            )}

            {/* List */}
            <div>
              {viewMode === 'calendar' && selectedDate && (
                <p className="mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {format(selectedDate, 'dd MMMM yyyy', { locale: pl }).toUpperCase()} — {listBookings.length} SESJI
                </p>
              )}
              {viewMode === 'day' && (
                <div className="flex items-center justify-between mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '10px 16px', background: t.bg }}>
                  <button
                    onClick={() => setSelectedDate(d => subDays(d, 1))}
                    style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-center">
                    <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.2rem', color: t.title, letterSpacing: '0.08em', lineHeight: 1 }}>
                      {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
                    </p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: listBookings.length > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                      {listBookings.length} {listBookings.length === 1 ? 'SESJA' : listBookings.length >= 2 && listBookings.length <= 4 ? 'SESJE' : 'SESJI'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(d => addDays(d, 1))}
                    style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              {listBookings.length === 0 ? (
                <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}` }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                    {viewMode === 'calendar' && selectedDate ? 'BRAK SESJI W TEN DZIEŃ' : 'BRAK REZERWACJI'}
                  </p>
                  {viewMode === 'calendar' && selectedDate && (
                    <button onClick={() => { setEditingBooking(null); setShowModal(true); }} className="btn-oxblood mt-4" style={{ fontSize: '10px', padding: '8px 20px' }}>
                      + DODAJ SESJĘ
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                  {listBookings.map((b, i) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-4 cursor-pointer transition-colors"
                      style={{ borderBottom: i < listBookings.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === b.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
                      onClick={() => setSelected(b)}
                    >
                      <div className="flex items-center gap-6 min-w-0">
                        {/* Time badge */}
                        {b.session_time && (
                          <div className="flex-shrink-0 text-center" style={{ minWidth: '48px' }}>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
                            {b.session_time && (() => {
                              if (b.session_end_time) return <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>→ {b.session_end_time}</p>;
                              if (b.session_duration) {
                                const [h, m] = b.session_time.split(':').map(Number);
                                const endTotal = h * 60 + m + b.session_duration;
                                const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
                                const endM = String(endTotal % 60).padStart(2, '0');
                                return <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>→ {endH}:{endM}</p>;
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const artist = artists.find(a => a.id === b.artist_id);
                            return artist?.photo_url ? (
                              <img src={artist.photo_url} alt={artist.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
                            ) : b.artist_name ? (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,0,127,0.12)', border: `1px solid rgba(255,0,127,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '10px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{b.artist_name.charAt(0)}</span>
                              </div>
                            ) : null;
                          })()}
                          <div className="min-w-0">
                            <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}{viewMode === 'list' ? ` · ${b.session_date || ''}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        {!b.health_form_completed && (
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.08em', border: '0.5px solid #FF007F', padding: '2px 5px' }}>
                            ANKIETA
                          </span>
                        )}
                        {b.estimated_price && (
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{b.estimated_price} PLN</span>
                        )}
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[b.status] || t.border}`, color: STATUS_COLORS[b.status] || t.muted }}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
                        {!b.health_form_completed && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF007F', flexShrink: 0 }} />
                        )}
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 6px', border: `0.5px solid ${STATUS_COLORS[b.status] || t.border}`, color: STATUS_COLORS[b.status] || t.muted }}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel - right sidebar on desktop */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <AnimatePresence>
              {selected ? (
                <BookingDetailPanel
                  booking={selected}
                  onClose={() => setSelected(null)}
                  onStatusChange={updateStatus}
                  onDelete={deleteBooking}
                  onEdit={() => handleEdit(selected)}
                  t={t}
                />
              ) : (
                <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>WYBIERZ SESJĘ</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <BookingModal
            booking={editingBooking}
            defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
            onClose={() => { setShowModal(false); setEditingBooking(null); }}
            onSaved={handleModalSaved}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}