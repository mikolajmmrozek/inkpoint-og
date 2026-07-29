import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, Calendar, List, Clock, ChevronLeft, ChevronRight, Search, X, Inbox } from 'lucide-react';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTheme } from './Dashboard';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import BookingModal from '@/components/dashboard/BookingModal';
import DailyScheduleView from '@/components/dashboard/DailyScheduleView.jsx';
import { getArtistsOffForDate } from '@/lib/bookingConflicts';
import { recomputeClientTotalSessions } from '@/lib/clientStats';
import { buildHealthFormStatusMap, resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import HealthFormBadge from '@/components/booking/HealthFormBadge';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

function BookingRow({ b, i, items, selected, setSelected, artists, t, healthStatusMap }) {
  return (
    <div
      className="flex items-center justify-between p-4 cursor-pointer transition-colors"
      style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === b.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
      onClick={() => setSelected(b)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 text-center" style={{ minWidth: '52px' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
          {b.session_end_time ? (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted }}>→ {b.session_end_time}</p>
          ) : b.session_time && b.session_duration ? (() => {
            const [h, m] = b.session_time.split(':').map(Number);
            const endTotal = h * 60 + m + b.session_duration;
            const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
            const endM = String(endTotal % 60).padStart(2, '0');
            return <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted }}>→ {endH}:{endM}</p>;
          })() : null}
        </div>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {(() => {
            const artist = artists.find(a => a.id === b.artist_id);
            return artist?.photo_url ? (
              <img src={artist.photo_url} alt={artist.name} loading="lazy" width={40} height={40} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
            ) : (artist || b.artist_name) ? (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,0,127,0.1)', border: '0.5px solid rgba(255,0,127,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '15px', color: '#FF007F', letterSpacing: '0.05em' }}>
                  {(artist?.name || b.artist_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            ) : null;
          })()}
          <div className="min-w-0">
            <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
            </p>
            {b.service_name && (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                {b.service_name}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
        {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: t.muted, letterSpacing: '0.06em' }}>BEZPŁATNA</span>
        ) : b.estimated_price > 0 ? (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>
        ) : null}
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
      </div>
    </div>
  );
}

function ListContent({ viewMode, searchQuery, selectedDate, listBookings, listPageBookings, listPageCount, listPage, setListPage, listTab, setListTab, selected, setSelected, artists, t, setEditingBooking, setShowModal, availabilityRecords, artistFilter, healthStatusMap }) {
  const getOffForDate = (dateStr) => getArtistsOffForDate(availabilityRecords, artists, artistFilter, dateStr);
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
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isPast ? '#9ca3af' : isToday ? '#f59e0b' : '#16a34a', flexShrink: 0 }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isPast ? t.muted : isToday ? '#f59e0b' : t.muted }}>
                  {isToday ? `DZIŚ — ${dayLabel}` : dayLabel}
                </p>
                <div style={{ flex: 1, height: '0.5px', background: t.border }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: t.muted }}>
                  {items.length} {items.length === 1 ? 'sesja' : 'sesji'}
                </span>
              </div>
              {date !== 'Brak daty' && (() => { const off = getOffForDate(date); return off.length > 0 ? (
                <div className="mb-2" style={{ border: '0.5px solid rgba(255,0,127,0.25)', background: 'rgba(255,0,127,0.05)' }}>
                  {off.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: i < off.length - 1 ? '0.5px solid rgba(255,0,127,0.2)' : 'none' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: '#FF007F', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.06em' }}>WOLNE · {o.artist.name}{o.timeRange ? ` · ${o.timeRange}` : ' · cały dzień'}{o.note ? ` · ${o.note}` : ''}</span>
                    </div>
                  ))}
                </div>
              ) : null; })()}
              <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                {items.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={items} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      {listBookings.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={listBookings} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />)}
    </div>
  );
}

export default function DashboardBookings() {
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', pageBg: '#D5D5D5', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)', fuchsia: '#FF007F' }
    : { bg: 'rgba(255,255,255,0.06)', pageBg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)', fuchsia: '#FF007F' };

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [healthStatusMap, setHealthStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilters, setStatusFilters] = useState(() => {
    const f = searchParams.get('filter');
    return f ? [f] : [];
  });
  const [artistFilters, setArtistFilters] = useState([]);

  const toggleStatus = (s) => setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleArtist = (id) => setArtistFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const statusMatch = (b) => statusFilters.length === 0 || statusFilters.includes(b.status);
  const artistMatch = (b) => artistFilters.length === 0 || artistFilters.includes(b.artist_id);
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [listPage, setListPage] = useState(0);
  const [listTab, setListTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  const [loadError, setLoadError] = useState(null);
  const loadedOnce = useRef(false);

  const load = async () => {
    setLoadError(null);
    try {
      const [data, artistData, avail, healthForms] = await Promise.all([
        base44.entities.Booking.list('-session_date', 200),
        base44.entities.Artist.list(),
        base44.entities.ArtistAvailability.list(),
        base44.entities.HealthForm.list('-created_date', 300),
      ]);
      setBookings(data);
      setArtists(artistData);
      setAvailabilityRecords(avail);
      setHealthStatusMap(buildHealthFormStatusMap(healthForms));
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Booking.update(id, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
    // Auto-sync to Google Calendar (silent — no error if not connected)
    base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: id }).catch(() => {});

    const booking = bookings.find(b => b.id === id);
    // Recompute client's completed session count (excludes cancelled)
    if (booking?.client_email) recomputeClientTotalSessions(booking.client_email).catch(() => {});

    if (status === 'completed') {
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
    const bk = bookings.find(b => b.id === id);
    await base44.entities.Booking.delete(id);
    setBookings(b => b.filter(x => x.id !== id));
    setSelected(null);
    if (bk?.client_email) recomputeClientTotalSessions(bk.client_email).catch(() => {});
  };

  useEffect(() => {
    if (viewMode !== 'list') return;
    setListPage(0);
  }, [viewMode, statusFilters, artistFilters, listTab]);

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
    const dayDateStr = format(day, 'yyyy-MM-dd');
    const dayHasResults = listBookings.some(b => b.session_date === dayDateStr);
    
    if (searchQuery.trim()) {
      // W trybie wyszukiwania: jeśli dzień ma wyniki, ustaw go
      if (dayHasResults) {
        setSelectedDate(day);
      }
      // Jeśli dzień nie ma wyników, nic nie rob (nie wymazuj searchQuery)
    } else {
      // Zwykłe zachowanie bez wyszukiwania
      if (selectedDate && isSameDay(selectedDate, day)) {
        setViewMode('day');
      } else {
        setSelectedDate(day);
      }
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
      if (viewMode !== 'calendar') {
        setSelectedDate(null);
        setViewMode('list');
        setListTab('upcoming');
      }
    }
  };

  const listBookings = (() => {
    let base = bookings.filter(b => statusMatch(b) && artistMatch(b));
    
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

  useEffect(() => {
    if (viewMode === 'day' && searchQuery.trim() && listBookings.length > 0) {
      const firstMatchDate = new Date(listBookings[0].session_date);
      setSelectedDate(firstMatchDate);
    }
  }, [viewMode, searchQuery]);

  const dayViewBookings = (() => {
    if (viewMode !== 'day') return [];
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate)) return [];
    let base = bookings.filter(b => statusMatch(b) && artistMatch(b));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(b =>
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.session_id || '').toLowerCase().includes(q) ||
        (b.client_email || '').toLowerCase().includes(q) ||
        (b.tattoo_placement || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
    }
    base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
    return [...base].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
  })();

  const PAGE_SIZE = 10;
  const listPageCount = Math.ceil(listBookings.length / PAGE_SIZE);
  const listPageBookings = listBookings.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE);
  const selectedDateStr = selectedDate && selectedDate instanceof Date && !isNaN(selectedDate) ? format(selectedDate, 'yyyy-MM-dd') : null;

  const calendarBookings = (() => {
    let base = bookings.filter(b => statusMatch(b) && artistMatch(b));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(b =>
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.session_id || '').toLowerCase().includes(q) ||
        (b.client_email || '').toLowerCase().includes(q) ||
        (b.tattoo_placement || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
    }
    return base;
  })();

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  const pendingViewBookings = (() => {
    if (viewMode !== 'pending') return [];
    let base = bookings.filter(b => b.status === 'pending' || b.status === 'cancelled');
    if (statusFilters.length > 0) base = base.filter(b => statusFilters.includes(b.status));
    if (artistFilters.length > 0) base = base.filter(b => artistFilters.includes(b.artist_id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(b =>
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.session_id || '').toLowerCase().includes(q) ||
        (b.client_email || '').toLowerCase().includes(q) ||
        (b.tattoo_placement || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
    }
    return [...base].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  })();

  const showListSection = (viewMode === 'calendar' && searchQuery.trim()) || viewMode === 'list' || viewMode === 'day';

  return (
    <div>
      {loadError && bookings.length === 0 && (
        <div className="mb-6 p-6 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ⚠ Nie udało się pobrać danych (limit zapytań). Spróbuj ponownie za chwilę.
          </p>
          <button onClick={load} className="btn-oxblood" style={{ fontSize: '11px' }}>SPRÓBUJ PONOWNIE</button>
        </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
              ZARZĄDZANIE
            </p>
            <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
              Rezerwacje
            </h2>
          </div>
          <button onClick={handleNewBooking} className="flex items-center gap-2 btn-oxblood md:mt-7" style={{ padding: '10px 20px' }}>
            <Plus size={13} /> NOWA SESJA
          </button>
        </div>

        {/* Row 1: view toggle + actions */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <button
            onClick={() => {
              const today = new Date();
              const todayStr = format(today, 'yyyy-MM-dd');
              setSelectedDate(today);
              if (viewMode === 'list') {
                setListTab('upcoming');
                let base = bookings.filter(b => statusMatch(b) && artistMatch(b));
                const upcoming = [...base].filter(b => (b.session_date || '') >= todayStr).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
                const todayIdx = upcoming.findIndex(b => b.session_date === todayStr);
                setListPage(todayIdx >= 0 ? Math.floor(todayIdx / PAGE_SIZE) : 0);
              }
            }}
            className="btn-oxblood"
            style={{ padding: '8px 14px' }}
          >
            DZISIAJ
          </button>
          <div className="flex" style={{ border: `0.5px solid ${t.border}` }}>
            {[{ mode: 'calendar', icon: Calendar }, { mode: 'day', icon: Clock }, { mode: 'list', icon: List }, { mode: 'pending', icon: Inbox }].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); if (mode !== 'day' && mode !== 'calendar' && mode !== 'pending') setSelectedDate(new Date()); }}
                className="p-2.5 transition-all"
                style={{ background: viewMode === mode ? 'rgba(255,0,127,0.1)' : 'transparent', color: viewMode === mode ? '#FF007F' : t.muted, border: 'none', cursor: 'pointer' }}
                title={mode === 'pending' ? 'Nowe rezerwacje (do weryfikacji)' : ''}
                style={{ position: 'relative', background: viewMode === mode ? 'rgba(255,0,127,0.1)' : 'transparent', color: viewMode === mode ? '#FF007F' : t.muted, border: 'none', cursor: 'pointer' }}
              >
                <Icon size={14} />
                {mode === 'pending' && pendingCount > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '14px', height: '14px', background: '#FF007F', color: '#F5F0EB', fontSize: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', padding: '0 3px', fontFamily: 'JetBrains Mono' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: filters */}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          <button onClick={() => setArtistFilters([])} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilters.length === 0 ? t.fuchsia : t.border}`, color: artistFilters.length === 0 ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
            Wszyscy
          </button>
          {artists.map(a => (
            <button key={a.id} onClick={() => toggleArtist(a.id)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${artistFilters.includes(a.id) ? t.fuchsia : t.border}`, color: artistFilters.includes(a.id) ? t.fuchsia : t.muted, background: artistFilters.includes(a.id) ? 'rgba(255,0,127,0.06)' : 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              {a.name}
            </button>
          ))}
          <div style={{ width: '0.5px', height: '16px', background: t.border, margin: '0 4px' }} />
          {(viewMode === 'pending' ? ['pending', 'cancelled'] : STATUS_OPTIONS).map(s => (
            <button key={s} onClick={() => toggleStatus(s)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${statusFilters.includes(s) ? t.fuchsia : t.border}`, color: statusFilters.includes(s) ? t.fuchsia : t.muted, background: statusFilters.includes(s) ? 'rgba(255,0,127,0.06)' : 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              {s === 'all' ? 'Wszystkie' : s}
            </button>
          ))}
          {statusFilters.length > 0 && (
            <button onClick={() => setStatusFilters([])} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
              ✕ Wszystkie
            </button>
          )}
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
            {/* Search results above calendar */}
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
                    {listBookings.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={listBookings} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />)}
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

            {/* Calendar view */}
            {viewMode === 'calendar' && (
              <BookingCalendar
                bookings={calendarBookings}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
                t={t}
                artists={artists}
                onAddBooking={handleNewBooking}
                searchQuery={searchQuery}
                onBookingClick={handleBookingClick}
                availabilityRecords={availabilityRecords}
                artistFilter={artistFilters}
                healthStatusMap={healthStatusMap}
              />
            )}

            {/* Day view */}
            {viewMode === 'day' && (
              <DailyScheduleView
                bookings={searchQuery.trim() ? dayViewBookings : calendarBookings}
                artists={artists}
                selectedDate={selectedDate || new Date()}
                onDateChange={(day) => setSelectedDate(day)}
                onBookingClick={handleBookingClick}
                onNewBookingRequest={handleNewBookingRequest}
                t={t}
                artistFilter={artistFilters}
                availabilityRecords={availabilityRecords}
              />
            )}

            {/* List section */}
             {showListSection && (
              <div>
                {viewMode === 'calendar' && selectedDate && selectedDate instanceof Date && !isNaN(selectedDate) && (
                  <div className="flex items-center justify-between mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '10px 16px', background: t.bg }}>
                    <button onClick={() => { if (!searchQuery.trim()) setSelectedDate(d => subDays(d, 1)); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', opacity: searchQuery.trim() ? 0.3 : 1 }}>
                      <ChevronLeft size={16} />
                    </button>
                    <div className="text-center">
                      <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.2rem', color: t.title, letterSpacing: '0.08em', lineHeight: 1 }}>
                        {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
                      </p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: selectedDateStr && listBookings.filter(b => b.session_date === selectedDateStr).length > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                        {selectedDateStr ? listBookings.filter(b => b.session_date === selectedDateStr).length : 0} {selectedDateStr && listBookings.filter(b => b.session_date === selectedDateStr).length === 1 ? 'SESJA' : selectedDateStr && listBookings.filter(b => b.session_date === selectedDateStr).length >= 2 && listBookings.filter(b => b.session_date === selectedDateStr).length <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                    <button onClick={() => { if (!searchQuery.trim()) setSelectedDate(d => addDays(d, 1)); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', opacity: searchQuery.trim() ? 0.3 : 1 }}>
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

                {viewMode === 'calendar' && searchQuery.trim() && selectedDateStr ? (() => {
                  const dayBookings = listBookings.filter(b => b.session_date === selectedDateStr);
                  return (
                    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                      {dayBookings.length > 0 ? (
                        dayBookings.map((b, i, arr) => <BookingRow key={b.id} b={b} i={i} items={arr} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />)
                      ) : (
                        <div className="py-6 text-center">
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK SESJI W TEN DZIEŃ</p>
                        </div>
                      )}
                    </div>
                  );
                })() : !(viewMode === 'calendar') && (
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
                    availabilityRecords={availabilityRecords}
                    artistFilter={artistFilters}
                    healthStatusMap={healthStatusMap}
                  />
                )}
              </div>
            )}
          </div>

          {/* Pending view (Nowe rezerwacje — do weryfikacji) */}
          {viewMode === 'pending' && (
            <div>
              <div style={{ padding: '10px 16px', background: t.bg, border: `0.5px solid ${t.border}`, marginBottom: '8px' }}>
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.1rem', color: t.title, letterSpacing: '0.08em' }}>
                  DO WERYFIKACJI
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: pendingViewBookings.length > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                  {pendingViewBookings.length} {pendingViewBookings.length === 1 ? 'REZERWACJA' : pendingViewBookings.length >= 2 && pendingViewBookings.length <= 4 ? 'REZERWACJE' : 'REZERWACJI'}
                </p>
              </div>
              {pendingViewBookings.length === 0 ? (
                <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK REZERWACJI DO WERYFIKACJI</p>
                </div>
              ) : (
                <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
                  {pendingViewBookings.map((b, i) => <BookingRow key={b.id} b={b} i={i} items={pendingViewBookings} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />)}
                </div>
              )}
            </div>
          )}

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