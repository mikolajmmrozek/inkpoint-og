import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, Calendar, List, Clock, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTheme } from './Dashboard';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';
import DailyScheduleView from '@/components/dashboard/DailyScheduleView.jsx';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

function BookingRow({ b, i, items, selected, setSelected, artists, t }) {
  return (
    <div
      className="flex items-center justify-between p-4 cursor-pointer transition-colors"
      style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === b.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
      onClick={() => setSelected(b)}
    >
      <div className="flex items-center gap-6 min-w-0">
        {b.session_time && (
          <div className="flex-shrink-0 text-center" style={{ minWidth: '48px' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
            {b.session_end_time ? (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>→ {b.session_end_time}</p>
            ) : b.session_duration ? (() => {
              const [h, m] = b.session_time.split(':').map(Number);
              const endTotal = h * 60 + m + b.session_duration;
              const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
              const endM = String(endTotal % 60).padStart(2, '0');
              return <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>→ {endH}:{endM}</p>;
            })() : null}
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          {(() => {
            const artist = artists.find(a => a.id === b.artist_id);
            return artist?.photo_url ? (
              <img src={artist.photo_url} alt={artist.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
            ) : b.artist_name ? (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,0,127,0.12)', border: '1px solid rgba(255,0,127,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{b.artist_name.charAt(0)}</span>
              </div>
            ) : null;
          })()}
          <div className="min-w-0">
            <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!b.health_form_completed && (
          <span className="hidden sm:inline" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.08em', border: '0.5px solid #FF007F', padding: '2px 5px' }}>
            ANKIETA
          </span>
        )}
        {b.estimated_price && (
          <span className="hidden sm:inline" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{b.estimated_price} PLN</span>
        )}
        <span className="hidden lg:inline" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[b.status] || t.border}`, color: STATUS_COLORS[b.status] || t.muted }}>
          {b.status}
        </span>
        <div className="lg:hidden" style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function ListContent({ viewMode, searchQuery, selectedDate, listBookings, listPageBookings, listPageCount, listPage, setListPage, listTab, setListTab, selected, setSelected, artists, t, setEditingBooking, setShowModal }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (listBookings.length === 0) {
    return (
      <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}` }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
          {viewMode === 'calendar' ? 'BRAK SESJI W TEN DZIEŃ' : 'BRAK REZERWACJI'}
        </p>
        {viewMode === 'calendar' && selectedDate && (
          <button onClick={() => { setEditingBooking(null); setShowModal(true); }} className="btn-oxblood mt-4" style={{ fontSize: '10px', padding: '8px 20px' }}>
            + DODAJ SESJĘ
          </button>
        )}
      </div>
    );
  }

  if (viewMode === 'list') {
    const grouped = {};
    listPageBookings.forEach(b => {
      const day = b.session_date || 'Brak daty';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(b);
    });

    return (
      <div className="space-y-4">
        {listPageCount > 1 && (
          <div className="flex items-center justify-between" style={{ border: `0.5px solid ${t.border}`, padding: '8px 14px', background: t.bg }}>
            <button
              onClick={() => setListPage(p => Math.max(0, p - 1))}
              disabled={listPage === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: listPage === 0 ? t.muted : t.fuchsia, background: 'none', border: 'none', cursor: listPage === 0 ? 'default' : 'pointer', opacity: listPage === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={12} /> POPRZEDNIE
            </button>
            <button
              onClick={() => setListPage(p => Math.min(listPageCount - 1, p + 1))}
              disabled={listPage >= listPageCount - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: listPage >= listPageCount - 1 ? t.muted : t.fuchsia, background: 'none', border: 'none', cursor: listPage >= listPageCount - 1 ? 'default' : 'pointer', opacity: listPage >= listPageCount - 1 ? 0.4 : 1 }}
            >
              NASTĘPNE <ChevronRight size={12} />
            </button>
          </div>
        )}
        {Object.entries(grouped).map(([date, items]) => {
          const dateObj = date !== 'Brak daty' ? new Date(date) : null;
          const isToday = dateObj && date === todayStr;
          const isPast = dateObj && date < todayStr;
          const dayLabel = dateObj ? format(dateObj, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase() : 'BRAK DATY';
          return (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isPast ? '#9ca3af' : isToday ? '#f59e0b' : '#16a34a', flexShrink: 0 }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: isPast ? t.muted : isToday ? '#f59e0b' : t.muted }}>
                  {isToday ? `DZIŚ — ${dayLabel}` : dayLabel}
                </p>
                <div style={{ flex: 1, height: '0.5px', background: t.border }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>
                  {items.length} {items.length === 1 ? 'sesja' : 'sesji'}
                </span>
              </div>
              <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                {items.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={items} selected={selected} setSelected={setSelected} artists={artists} t={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      {listBookings.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={listBookings} selected={selected} setSelected={setSelected} artists={artists} t={t} />)}
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [listPage, setListPage] = useState(0);
  const [listTab, setListTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (viewMode !== 'list') return;
    setListPage(0);
  }, [viewMode, filter, artistFilter, listTab]);

  const handleBookingClick = useCallback((b) => setSelected(b), []);
  const handleNewBookingRequest = useCallback(({ artist, time, date }) => {
    setEditingBooking({
      _prefill: true,
      artist_id: artist.id,
      artist_name: artist.name,
      session_date: date,
      session_time: time,
    });
    setShowModal(true);
  }, []);

  const handleDayClick = (day) => {
    setSearchQuery('');
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

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (q.trim()) {
      setListPage(0);
    }
  };

  const listBookings = (() => {
    let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    if (artistFilter !== 'all') base = base.filter(b => b.artist_id === artistFilter);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(b =>
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.session_id || '').toLowerCase().includes(q) ||
        (b.client_email || '').toLowerCase().includes(q) ||
        (b.tattoo_placement || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
      base = [...base].sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
      
      if (viewMode === 'day' && base.length > 0) {
        const firstMatchDate = new Date(base[0].session_date);
        setSelectedDate(firstMatchDate);
        base = base.filter(b => b.session_date === base[0].session_date);
        base = [...base].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
      }
      return base;
    }
    
    if (viewMode === 'calendar' && selectedDate) {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
    }
    if (viewMode === 'day') {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate || new Date()));
      base = [...base].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
    }
    if (viewMode === 'list') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (listTab === 'upcoming') {
        base = [...base].filter(b => (b.session_date || '') >= todayStr).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
      } else {
        base = [...base].filter(b => (b.session_date || '') < todayStr).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
      }
    }
    return base;
  })();

  const PAGE_SIZE = 10;
  const listPageCount = Math.ceil(listBookings.length / PAGE_SIZE);
  const listPageBookings = listBookings.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE);

  const calendarBookings = (() => {
    let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    if (artistFilter !== 'all') base = base.filter(b => b.artist_id === artistFilter);
    return base;
  })();

  const showListSection = (viewMode === 'calendar' && searchQuery.trim()) || viewMode === 'list' || viewMode === 'day';

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

        {/* Row 1: view toggle + actions */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
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
          <div className="flex-1" />
          <button
            onClick={() => {
              const today = new Date();
              const todayStr = format(today, 'yyyy-MM-dd');
              setSelectedDate(today);
              if (viewMode === 'list') {
                setListTab('upcoming');
                let base = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
                if (artistFilter !== 'all') base = base.filter(b => b.artist_id === artistFilter);
                const upcoming = [...base].filter(b => (b.session_date || '') >= todayStr).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
                const todayIdx = upcoming.findIndex(b => b.session_date === todayStr);
                setListPage(todayIdx >= 0 ? Math.floor(todayIdx / PAGE_SIZE) : 0);
              }
            }}
            className="btn-oxblood flex items-center gap-2"
            style={{ padding: '10px 20px' }}
          >
            DZISIAJ
          </button>
          <button onClick={handleNewBooking} className="flex items-center gap-2 btn-oxblood" style={{ padding: '10px 20px' }}>
            <Plus size={13} /> NOWA SESJA
          </button>
        </div>

        {/* Row 2: filters */}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          <button onClick={() => setArtistFilter('all')} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilter === 'all' ? t.fuchsia : t.border}`, color: artistFilter === 'all' ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
            Wszyscy
          </button>
          {artists.map(a => (
            <button key={a.id} onClick={() => setArtistFilter(a.id)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilter === a.id ? t.fuchsia : t.border}`, color: artistFilter === a.id ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              {a.name}
            </button>
          ))}
          <div style={{ width: '0.5px', height: '16px', background: t.border, margin: '0 4px' }} />
          {['all', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${filter === s ? t.fuchsia : t.border}`, color: filter === s ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              {s === 'all' ? 'Wszystkie' : s}
            </button>
          ))}
        </div>

        {/* Row 3: search */}
        <div className="flex items-center gap-2 w-full" style={{ border: `0.5px solid ${searchQuery ? '#FF007F' : t.border}`, padding: '8px 14px', background: t.bg }}>
          <Search size={12} color={searchQuery ? '#FF007F' : t.muted} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Szukaj klienta, sesji, emailu, miejsca..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text, letterSpacing: '0.05em' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div>
          <div className="space-y-6">
            {/* Calendar view */}
            {viewMode === 'calendar' && (
              <BookingCalendar
                bookings={calendarBookings}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
                t={t}
                artists={artists}
              />
            )}

            {/* Day view */}
            {viewMode === 'day' && (
              <DailyScheduleView
                bookings={calendarBookings}
                artists={artists}
                selectedDate={selectedDate || new Date()}
                onDateChange={(day) => setSelectedDate(day)}
                onBookingClick={handleBookingClick}
                onNewBookingRequest={handleNewBookingRequest}
                t={t}
              />
            )}

            {/* List section */}
            {showListSection && (
              <div>
                {viewMode === 'calendar' && searchQuery.trim() && (
                  <div className="mb-6">
                    <div style={{ padding: '10px 16px', background: t.bg, border: `0.5px solid ${t.border}` }}>
                      <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.1rem', color: t.title, letterSpacing: '0.08em' }}>
                        WYNIKI WYSZUKIWANIA
                      </p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: listBookings.length > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                        {listBookings.length} {listBookings.length === 1 ? 'SESJA' : listBookings.length >= 2 && listBookings.length <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                    {listBookings.length > 0 ? (
                      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, marginTop: '4px' }}>
                        {listBookings.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={listBookings} selected={selected} setSelected={setSelected} artists={artists} t={t} />)}
                      </div>
                    ) : (
                      <div className="py-6 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                          BRAK PASUJĄCYCH SESJI
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'calendar' && selectedDate && !searchQuery.trim() && (
                  <div className="flex items-center justify-between mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '10px 16px', background: t.bg }}>
                    <button onClick={() => { setSearchQuery(''); setSelectedDate(d => subDays(d, 1)); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
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
                    <button onClick={() => { setSearchQuery(''); setSelectedDate(d => addDays(d, 1)); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {viewMode === 'list' && !searchQuery.trim() && (
                  <div className="flex mb-4" style={{ border: `0.5px solid ${t.border}` }}>
                    {[{ key: 'upcoming', label: 'NADCHODZĄCE' }, { key: 'past', label: 'PRZESZŁE' }].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setListTab(tab.key)}
                        style={{
                          flex: 1, padding: '10px', fontFamily: 'JetBrains Mono', fontSize: '9px',
                          letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                          background: listTab === tab.key ? 'rgba(255,0,127,0.08)' : 'transparent',
                          color: listTab === tab.key ? '#FF007F' : t.muted,
                          borderBottom: listTab === tab.key ? '1px solid #FF007F' : '1px solid transparent',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {viewMode === 'day' && searchQuery.trim() && (
                  <div className="flex items-center justify-between mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '10px 16px', background: t.bg }}>
                    <div className="text-center flex-1">
                      <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.2rem', color: t.title, letterSpacing: '0.08em', lineHeight: 1 }}>
                        {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
                      </p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: listBookings.length > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                        {listBookings.length} {listBookings.length === 1 ? 'SESJA' : listBookings.length >= 2 && listBookings.length <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                  </div>
                )}

                <ListContent
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  selectedDate={selectedDate}
                  listBookings={listBookings}
                  listPageBookings={listPageBookings}
                  listPageCount={listPageCount}
                  listPage={listPage}
                  setListPage={setListPage}
                  listTab={listTab}
                  setListTab={setListTab}
                  selected={selected}
                  setSelected={setSelected}
                  artists={artists}
                  t={t}
                  setEditingBooking={setEditingBooking}
                  setShowModal={setShowModal}
                />
              </div>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <BookingDetailPanel
                booking={selected}
                theme={theme}
                onClose={() => setSelected(null)}
                onStatusChange={updateStatus}
                onDelete={deleteBooking}
                onEdit={() => handleEdit(selected)}
              />
            )}
          </AnimatePresence>

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
      )}
    </div>
  );
}