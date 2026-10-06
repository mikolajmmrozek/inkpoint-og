import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { AnimatePresence } from 'framer-motion';
import { Calendar, List, Clock, ChevronLeft, ChevronRight, Search, X, Inbox, Wallet } from 'lucide-react';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useTheme } from './Dashboard';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import DailyScheduleView from '@/components/dashboard/DailyScheduleView.jsx';
import { getArtistsOffForDate } from '@/lib/bookingConflicts';
import { recomputeClientTotalSessions } from '@/lib/clientStats';
import { buildHealthFormStatusMap, resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import HealthFormBadge from '@/components/booking/HealthFormBadge';
import GroupedBookingList from '@/components/booking/GroupedBookingList';
import BookingFilters from '@/components/dashboard/BookingFilters';
import PendingRequestsView from '@/components/dashboard/PendingRequestsView';
import { getThumbnailUrl } from '@/lib/thumbnail';
import { useCreateMenu } from '@/components/create/CreateMenuContext';

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
      style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === b.id ? 'rgb(var(--brand-rgb) /0.05)' : 'transparent' }}
      onClick={() => setSelected(b)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 text-center" style={{ minWidth: '52px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
          {b.session_end_time ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>→ {b.session_end_time}</p>
          ) : b.session_time && b.session_duration ? (() => {
            const [h, m] = b.session_time.split(':').map(Number);
            const endTotal = h * 60 + m + b.session_duration;
            const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
            const endM = String(endTotal % 60).padStart(2, '0');
            return <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>→ {endH}:{endM}</p>;
          })() : null}
        </div>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {(() => {
            const artist = artists.find(a => a.id === b.artist_id);
            return artist?.photo_url ? (
              <img src={getThumbnailUrl(artist.photo_url, 80, 60)} alt={artist.name} loading="lazy" width={40} height={40} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
            ) : (artist || b.artist_name) ? (
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--brand)', letterSpacing: '0.05em' }}>
                  {(artist?.name || b.artist_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            ) : null;
          })()}
          <div className="min-w-0">
            <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
            </p>
            {b.service_name && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                {b.service_name}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
        {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted, letterSpacing: '0.06em' }}>BEZPŁATNA</span>
        ) : b.estimated_price > 0 ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>
        ) : null}
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
      </div>
    </div>
  );
}

function ListContent({ viewMode, searchQuery, selectedDate, listBookings, listPageBookings, listPageCount, listPage, setListPage, listTab, setListTab, selected, setSelected, artists, t, onNewBooking, availabilityRecords, artistFilter, healthStatusMap }) {
  const getOffForDate = (dateStr) => getArtistsOffForDate(availabilityRecords, artists, artistFilter, dateStr);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (listBookings.length === 0) {
    return (
      <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}` }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
          {viewMode === 'calendar' ? 'BRAK SESJI W TEN DZIEŃ' : 'BRAK REZERWACJI'}
        </p>
        {viewMode === 'calendar' && selectedDate && (
          <button onClick={onNewBooking} className="btn-oxblood mt-4" style={{ fontSize: '10px', padding: '8px 20px' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: listPage === 0 ? t.muted : t.fuchsia, background: 'none', border: 'none', cursor: listPage === 0 ? 'default' : 'pointer', opacity: listPage === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={12} /> POPRZEDNIE
            </button>
            <button
              onClick={() => setListPage(p => Math.min(listPageCount - 1, p + 1))}
              disabled={listPage >= listPageCount - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: listPage >= listPageCount - 1 ? t.muted : t.fuchsia, background: 'none', border: 'none', cursor: listPage >= listPageCount - 1 ? 'default' : 'pointer', opacity: listPage >= listPageCount - 1 ? 0.4 : 1 }}
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
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isPast ? t.muted : isToday ? '#f59e0b' : t.muted }}>
                  {isToday ? `DZIŚ — ${dayLabel}` : dayLabel}
                </p>
                <div style={{ flex: 1, height: '0.5px', background: t.border }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>
                  {items.length} {items.length === 1 ? 'sesja' : 'sesji'}
                </span>
              </div>

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
    ? { bg: '#FFFFFF', pageBg: '#D5D5D5', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)', fuchsia: 'var(--brand)' }
    : { bg: 'rgba(255,255,255,0.06)', pageBg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)', fuchsia: 'var(--brand)' };

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [healthStatusMap, setHealthStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const initialFilter = searchParams.get('filter');
  const isToSettleMode = initialFilter === 'to_settle';
  const [statusFilters, setStatusFilters] = useState(() => {
    if (isToSettleMode) return [];
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
  const [listPage, setListPage] = useState(0);
  const [listTab, setListTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab === 'past' ? 'past' : 'upcoming';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [toSettleMode, setToSettleMode] = useState(isToSettleMode);

  const [loadError, setLoadError] = useState(null);
  const loadedOnce = useRef(false);

  const createMenu = useCreateMenu() || {};
  const newBooking = createMenu.newBooking || (() => {});
  const registerBookingsRefresh = createMenu.registerBookingsRefresh || (() => {});
  const registerAvailabilityRefresh = createMenu.registerAvailabilityRefresh || (() => {});
  const registerSelectedDate = createMenu.registerSelectedDate || (() => {});

  const refreshBookings = useCallback(async () => {
    try { const data = await base44.entities.Booking.list('-session_date', 5000); setBookings(data); } catch (e) {}
  }, []);
  const refreshAvailability = useCallback(async () => {
    try { const avail = await base44.entities.ArtistAvailability.list(); setAvailabilityRecords(avail); } catch (e) {}
  }, []);
  useEffect(() => {
    registerBookingsRefresh(refreshBookings);
    registerAvailabilityRefresh(refreshAvailability);
  }, [registerBookingsRefresh, registerAvailabilityRefresh, refreshBookings, refreshAvailability]);

  // Realtime — odśwież kalendarz i listy natychmiast po dodaniu / edycji / zmianie statusu / usunięciu
  useRealtimeSync('Booking', () => { refreshBookings(); loadHealthForms(); });
  useRealtimeSync('ArtistAvailability', () => { refreshAvailability(); });

  // Keep the create-menu's booking/dyspozycja prefill in sync with the selected day.
  useEffect(() => {
    registerSelectedDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
  }, [registerSelectedDate, selectedDate]);

  const loadHealthForms = async () => {
    try {
      const healthForms = await base44.entities.HealthForm.list('-created_date', 5000);
      setHealthStatusMap(buildHealthFormStatusMap(healthForms));
    } catch (e) { /* silent — badges fall back to health_form_completed flag */ }
  };

  // Fast path: bookings + artists + availability block render; health forms load lazily.
  const load = async () => {
    setLoadError(null);
    try {
      const [data, artistData, avail] = await Promise.all([
        base44.entities.Booking.list('-session_date', 5000),
        base44.entities.Artist.list(),
        base44.entities.ArtistAvailability.list(),
      ]);
      setBookings(data);
      setArtists(artistData);
      setAvailabilityRecords(avail);
      setLoading(false);
      // Health forms are the slowest and only feed the badge — load after render.
      loadHealthForms();
    } catch (err) {
      setLoadError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    load();
  }, []);

  // Deep link from a notification: open the booking's detail panel and jump to its day.
  const pendingBookingId = searchParams.get('booking_id');
  useEffect(() => {
    if (loading || bookings.length === 0) return;
    if (!pendingBookingId) return;
    const found = bookings.find(b => b.id === pendingBookingId);
    if (found) {
      if (found.session_date) setSelectedDate(new Date(found.session_date));
      setSelected(found);
    }
  }, [loading, bookings, pendingBookingId]);

  const updateStatus = async (id, status) => {
    await base44.entities.Booking.update(id, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
    // Auto-sync to Google Calendar (silent — no error if not connected)
    base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: id }).catch(() => {});

    const booking = bookings.find(b => b.id === id);
    // Recompute client's completed session count (excludes cancelled). 
    // Call even when email is empty — falls back to client_name.
    if (booking?.client_email || booking?.client_name) recomputeClientTotalSessions(booking?.client_email, booking?.client_name).catch(() => {});

    if (status === 'completed') {
      if (booking?.client_email) {
        const surveyLink = `${window.location.origin}/feedback?booking_id=${id}`;
        const configRes = await base44.entities.FeedbackSurveyConfig.filter({ key: 'default' }).catch(() => []);
        const cfg = configRes.length > 0 ? configRes[0] : {};
        const subject = cfg.email_subject || 'Jak minęła Twoja sesja? Podziel się opinią!';
        const bodyTemplate = cfg.email_body || 'Cześć {client_name},\n\nDziękujemy za wizytę!\n\nOcena: {link}';
        const body = bodyTemplate.replace('{client_name}', booking.client_name || '').replace('{link}', surveyLink);
        await base44.functions.invoke('sendEmailViaResend', { to: booking.client_email, subject, body }).catch(() => {});
      }
    }
  };

  const deleteBooking = async (id) => {
    const bk = bookings.find(b => b.id === id);
    await base44.entities.Booking.delete(id);
    setBookings(b => b.filter(x => x.id !== id));
    setSelected(null);
    if (bk?.client_email || bk?.client_name) recomputeClientTotalSessions(bk?.client_email, bk?.client_name).catch(() => {});
  };

  useEffect(() => {
    if (viewMode !== 'list') return;
    setListPage(0);
  }, [viewMode, statusFilters, artistFilters, listTab]);

  const handleBookingClick = useCallback((b) => setSelected(b), []);
  const handleNewBookingRequest = useCallback(({ artist, time, date }) => {
    newBooking({
      _prefill: true,
      artist_id: artist.id,
      artist_name: artist.name,
      session_date: date,
      session_time: time,
    });
  }, [newBooking]);

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

  const handleNewBooking = useCallback(() => newBooking(null), [newBooking]);
  const handleEdit = useCallback((booking) => newBooking(booking), [newBooking]);

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
    
    // "Do rozliczenia" filter: past sessions (up to today) that are not settled,
    // not completed and not cancelled.
    if (toSettleMode) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      base = base.filter(b => (b.session_date || '') <= todayStr && !b.is_settled && b.status !== 'completed' && b.status !== 'cancelled');
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(b =>
        (b.client_name || '').toLowerCase().includes(q) ||
        (b.session_id || '').toLowerCase().includes(q) ||
        (b.client_email || '').toLowerCase().includes(q) ||
        (b.tattoo_placement || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
      base = [...base].sort((a, b) => {
        const d = (a.session_date || '').localeCompare(b.session_date || '');
        if (d !== 0) return d;
        return (a.session_time || '').localeCompare(b.session_time || '');
      });
      return base;
    }
    
    if (viewMode === 'calendar' && selectedDate) {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
    }
    if (viewMode === 'day') {
      base = base.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate || new Date()));
      base = [...base].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
    }
    if (viewMode === 'list' && !toSettleMode) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (listTab === 'upcoming') {
        base = [...base].filter(b => (b.session_date || '') >= todayStr).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
      } else {
        base = [...base].filter(b => (b.session_date || '') < todayStr).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
      }
    }
    // In toSettleMode the list is already filtered + sorted above (past, newest first).
    if (viewMode === 'list' && toSettleMode) {
      base = [...base].sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '') || (a.session_time || '').localeCompare(b.session_time || ''));
    }
    return base;
  })();

  useEffect(() => {
    if (viewMode === 'day' && searchQuery.trim() && listBookings.length > 0) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const upcoming = listBookings.filter(b => (b.session_date || '') >= todayStr);
      const nearest = upcoming[0] || listBookings[listBookings.length - 1];
      if (nearest?.session_date) setSelectedDate(new Date(nearest.session_date));
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

  const showListSection = (viewMode === 'calendar' && searchQuery.trim()) || viewMode === 'list' || viewMode === 'day';

  // Split search results into upcoming / past for calendar & day views — nearest sessions first.
  const searchSplit = (() => {
    if (!searchQuery.trim() || (viewMode !== 'calendar' && viewMode !== 'day')) return null;
    const q = searchQuery.toLowerCase();
    const base = bookings.filter(b => statusMatch(b) && artistMatch(b) && (
      (b.client_name || '').toLowerCase().includes(q) ||
      (b.session_id || '').toLowerCase().includes(q) ||
      (b.client_email || '').toLowerCase().includes(q) ||
      (b.tattoo_placement || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q)
    ));
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const cmpDate = (a, b) => (a.session_date || '').localeCompare(b.session_date || '');
    const cmpTime = (a, b) => (a.session_time || '99:99').localeCompare(b.session_time || '99:99');
    const upcoming = base.filter(b => (b.session_date || '') >= todayStr).sort((a, b) => {
      const d = cmpDate(a, b); if (d !== 0) return d; return cmpTime(a, b);
    });
    const past = base.filter(b => (b.session_date || '') < todayStr).sort((a, b) => {
      const d = cmpDate(b, a); if (d !== 0) return d; return cmpTime(b, a);
    });
    return { upcoming, past, total: base.length };
  })();

  const renderSearchSection = (label, items, emptyMsg) => (
    <div className="mb-4">
      <div style={{ padding: '8px 14px', background: t.bg, border: `0.5px solid ${t.border}`, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', color: items.length > 0 ? t.fuchsia : t.muted }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em' }}>
          {items.length} {items.length === 1 ? 'SESJA' : items.length >= 2 && items.length <= 4 ? 'SESJE' : 'SESJI'}
        </span>
      </div>
      <GroupedBookingList
        bookings={items}
        t={t}
        emptyMessage={emptyMsg}
        renderRow={(b, i, arr) => <BookingRow key={b.id} b={b} i={i} items={arr} selected={selected} setSelected={setSelected} artists={artists} t={t} healthStatusMap={healthStatusMap} />}
      />
    </div>
  );

  return (
    <div>
      {loadError && bookings.length === 0 && (
        <div className="mb-6 p-6 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ⚠ Nie udało się pobrać danych (limit zapytań). Spróbuj ponownie za chwilę.
          </p>
          <button onClick={load} className="btn-oxblood" style={{ fontSize: '11px' }}>SPRÓBUJ PONOWNIE</button>
        </div>
      )}
      {/* Toolbar */}
      <div className="mb-4">
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
                style={{ background: viewMode === mode ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', color: viewMode === mode ? 'var(--brand)' : t.muted, border: 'none', cursor: 'pointer' }}
                title={mode === 'pending' ? 'Do weryfikacji — oczekujące rezerwacje i prośby o zmianę' : ''}
                style={{ position: 'relative', background: viewMode === mode ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', color: viewMode === mode ? 'var(--brand)' : t.muted, border: 'none', cursor: 'pointer' }}
              >
                <Icon size={14} />
                {mode === 'pending' && pendingCount > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '14px', height: '14px', background: 'var(--brand)', color: '#F5F0EB', fontSize: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', padding: '0 3px', fontFamily: 'var(--font-mono)' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <BookingFilters
            artists={artists}
            artistFilters={artistFilters}
            toggleArtist={toggleArtist}
            setArtistFilters={setArtistFilters}
            statusFilters={statusFilters}
            toggleStatus={toggleStatus}
            setStatusFilters={setStatusFilters}
            statusOptions={viewMode === 'pending' ? ['pending', 'cancelled'] : STATUS_OPTIONS}
            t={t}
          />
        </div>

        {/* Row 3: search */}
        <div className="flex items-center gap-2 w-full" style={{ border: `0.5px solid ${searchQuery ? 'var(--brand)' : t.border}`, padding: '8px 14px', background: t.bg }}>
          <Search size={12} color={searchQuery ? 'var(--brand)' : t.muted} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Szukaj klienta, sesji, emailu, miejsca..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.05em' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {/* Calendar skeleton */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
            <div className="flex items-center justify-between mb-6">
              <div style={{ width: '18px', height: '18px', background: t.border }} />
              <div style={{ height: '24px', width: '180px', background: t.border, opacity: 0.6 }} />
              <div style={{ width: '18px', height: '18px', background: t.border }} />
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} style={{ height: '16px', background: t.border, opacity: 0.4 }} />)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => <div key={i} className="animate-pulse" style={{ minHeight: '52px', background: t.border, opacity: 0.25 }} />)}
            </div>
          </div>
          {/* Day sessions skeleton */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4" style={{ borderBottom: i < 3 ? `0.5px solid ${t.border}` : 'none' }}>
                <div style={{ width: '48px', height: '32px', background: t.border, opacity: 0.3 }} />
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: t.border, opacity: 0.3 }} />
                <div className="flex-1 space-y-2">
                  <div style={{ height: '14px', width: '45%', background: t.border, opacity: 0.4 }} />
                  <div style={{ height: '10px', width: '30%', background: t.border, opacity: 0.25 }} />
                </div>
                <div style={{ width: '40px', height: '14px', background: t.border, opacity: 0.3 }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-6">
            {/* Calendar — only in monthly view */}
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
                showSessionsList={!searchQuery.trim()}
              />
            )}

            {/* Search results (calendar view + search) — split into upcoming / past, nearest first */}
            {viewMode === 'calendar' && searchQuery.trim() && searchSplit && (
              <div className="mb-6">
                <div style={{ padding: '10px 16px', background: t.bg, border: `0.5px solid ${t.border}`, marginBottom: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: t.title, letterSpacing: '0.08em' }}>
                    WYNIKI WYSZUKIWANIA
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: searchSplit.total > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                    {searchSplit.total} {searchSplit.total === 1 ? 'SESJA' : searchSplit.total >= 2 && searchSplit.total <= 4 ? 'SESJE' : 'SESJI'}
                  </p>
                </div>
                {renderSearchSection('NADCHODZĄCE', searchSplit.upcoming, 'BRAK NADCHODZĄCYCH SESJI')}
                {renderSearchSection('PRZESZŁE', searchSplit.past, 'BRAK PRZESZŁYCH SESJI')}
              </div>
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
                {viewMode === 'list' && toSettleMode && !searchQuery.trim() && (
                  <div className="flex items-center justify-between mb-4 px-4 py-3" style={{ border: `0.5px solid var(--brand)`, background: 'rgb(var(--brand-rgb) /0.06)' }}>
                    <div className="flex items-center gap-2">
                      <Wallet size={12} color="var(--brand)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        FILTR: DO ROZLICZENIA — sesje przeszłe nierozliczone
                      </p>
                    </div>
                    <button
                      onClick={() => setToSettleMode(false)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <X size={12} /> WYCZYŚĆ
                    </button>
                  </div>
                )}
                {viewMode === 'list' && !searchQuery.trim() && !toSettleMode && (
                  <div className="flex mb-4" style={{ border: `0.5px solid ${t.border}` }}>
                    {[{ key: 'upcoming', label: 'NADCHODZĄCE' }, { key: 'past', label: 'PRZESZŁE' }].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setListTab(tab.key)}
                        style={{
                          flex: 1, padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '9px',
                          letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                          background: listTab === tab.key ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                          color: listTab === tab.key ? 'var(--brand)' : t.muted,
                          borderBottom: listTab === tab.key ? '1px solid var(--brand)' : '1px solid transparent',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {viewMode === 'day' && searchQuery.trim() && searchSplit && (
                  <div className="mb-6">
                    <div style={{ padding: '10px 16px', background: t.bg, border: `0.5px solid ${t.border}`, marginBottom: '12px' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: t.title, letterSpacing: '0.08em' }}>
                        WYNIKI WYSZUKIWANIA
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: searchSplit.total > 0 ? t.fuchsia : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
                        {searchSplit.total} {searchSplit.total === 1 ? 'SESJA' : searchSplit.total >= 2 && searchSplit.total <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                    {renderSearchSection('NADCHODZĄCE', searchSplit.upcoming, 'BRAK NADCHODZĄCYCH SESJI')}
                    {renderSearchSection('PRZESZŁE', searchSplit.past, 'BRAK PRZESZŁYCH SESJI')}
                  </div>
                )}

                {!(viewMode === 'calendar') && !(viewMode === 'day' && searchQuery.trim()) && (
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
                    onNewBooking={handleNewBooking}
                    availabilityRecords={availabilityRecords}
                    artistFilter={artistFilters}
                    healthStatusMap={healthStatusMap}
                  />
                )}
              </div>
            )}
          </div>

          {/* Pending view (Do weryfikacji — oczekujące rezerwacje + prośby o zmianę) */}
          {viewMode === 'pending' && (
            <PendingRequestsView
              bookings={bookings}
              artists={artists}
              t={t}
              theme={theme}
              onConfirmBooking={updateStatus}
              onOpenBooking={(b) => setSelected(b)}
              refreshBookings={refreshBookings}
            />
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

        </div>
      )}
    </div>
  );
}