import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, Calendar, List } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTheme } from './Dashboard';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';

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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const load = async () => {
    const data = await base44.entities.Booking.list('-session_date', 200);
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Booking.update(id, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  };

  const deleteBooking = async (id) => {
    await base44.entities.Booking.delete(id);
    setBookings(b => b.filter(x => x.id !== id));
    setSelected(null);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
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

  // Bookings to show in list (filtered by date if calendar view + date selected)
  const listBookings = (() => {
    let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    if (viewMode === 'calendar' && selectedDate) {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
    }
    return base;
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            ZARZĄDZANIE
          </p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
            Rezerwacje
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex" style={{ border: `0.5px solid ${t.border}` }}>
            {[{ mode: 'calendar', icon: Calendar }, { mode: 'list', icon: List }].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setSelectedDate(null); }}
                className="p-2.5 transition-all"
                style={{ background: viewMode === mode ? 'rgba(255,0,127,0.1)' : 'transparent', color: viewMode === mode ? '#FF007F' : t.muted, border: 'none', cursor: 'pointer' }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${filter === s ? t.fuchsia : t.border}`, color: filter === s ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}>
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
        <div className="flex gap-6 items-start">
          {/* Main area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Calendar view */}
            {viewMode === 'calendar' && (
              <BookingCalendar
                bookings={filter === 'all' ? bookings : bookings.filter(b => b.status === filter)}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
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
                            {b.session_duration && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>{b.session_duration}h</p>}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}{viewMode === 'list' ? ` · ${b.session_date || ''}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <BookingDetailPanel
                booking={selected}
                onClose={() => setSelected(null)}
                onStatusChange={updateStatus}
                onDelete={deleteBooking}
                onEdit={() => handleEdit(selected)}
                t={t}
              />
            )}
          </AnimatePresence>
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