import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Wallet, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import SettlementModal from './SettlementModal';
import { getThumbnailUrl } from '@/lib/thumbnail';

const PAYMENT_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
const PAYMENT_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };
const DAY_SHORT = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'];
const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };

const sumMethod = (b, method) => {
  if (b.payment_breakdown && b.payment_breakdown.length > 0) {
    return b.payment_breakdown.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  return method === 'cash' ? Number(b.final_amount || b.estimated_price || 0) : 0;
};

const dayRevenue = (bookings, dateStr) => {
  const day = bookings.filter(b => b.session_date === dateStr && b.status !== 'cancelled');
  const revenue = day.reduce((s, b) => s + Number(b.final_amount || b.estimated_price || 0), 0);
  const sessions = day.length;
  const settled = day.filter(b => b.is_settled).length;
  return { revenue, sessions, settled, pending: sessions - settled };
};

export default function TodaySettlementView({ t, theme }) {
  const { user } = useAuth();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(today);
  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedArtist, setExpandedArtist] = useState(null);
  const [settlingBooking, setSettlingBooking] = useState(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allBookings, artistData] = await Promise.all([
        base44.entities.Booking.list('-session_date', 5000),
        base44.entities.Artist.list(),
      ]);
      setBookings(allBookings);
      setArtists(artistData);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Bookings within the visible week
  const weekBookings = useMemo(() => bookings.filter(b => b.session_date >= weekStartStr && b.session_date <= weekEndStr), [bookings, weekStartStr, weekEndStr]);

  // Selected day's active bookings
  const activeBookings = useMemo(() => weekBookings.filter(b => b.session_date === selectedStr && b.status !== 'cancelled'), [weekBookings, selectedStr]);

  const artistMap = useMemo(() => {
    const m = {};
    artists.forEach(a => { m[a.id] = a; });
    return m;
  }, [artists]);

  // Per-day totals for the strip
  const dayTotals = useMemo(() => weekDays.map(d => {
    const ds = format(d, 'yyyy-MM-dd');
    const dt = dayRevenue(bookings, ds);
    return { date: d, str: ds, ...dt };
  }), [weekDays, bookings]);

  // Week totals
  const weekTotals = useMemo(() => dayTotals.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue,
    sessions: acc.sessions + d.sessions,
    settled: acc.settled + d.settled,
    pending: acc.pending + d.pending,
  }), { revenue: 0, sessions: 0, settled: 0, pending: 0 }), [dayTotals]);

  // Selected day per-artist groups
  const artistGroups = useMemo(() => {
    const groups = {};
    activeBookings.forEach(b => {
      const key = b.artist_id || 'no_artist';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).map(([artistId, sessions]) => {
      const artist = artistMap[artistId] || { id: artistId, name: sessions[0]?.artist_name || 'Bez artysty', artist_cut_percent: 60, photo_url: '' };
      const sorted = [...sessions].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
      const totalRevenue = sorted.reduce((s, b) => s + Number(b.final_amount || b.estimated_price || 0), 0);
      const cut = artist.artist_cut_percent != null ? artist.artist_cut_percent : 60;
      const artistEarnings = Math.round(totalRevenue * cut / 100);
      const studioEarnings = totalRevenue - artistEarnings;
      const settled = sorted.filter(b => b.is_settled);
      const pending = sorted.filter(b => !b.is_settled);
      const methods = {
        cash: sorted.reduce((s, b) => s + sumMethod(b, 'cash'), 0),
        card: sorted.reduce((s, b) => s + sumMethod(b, 'card'), 0),
        voucher: sorted.reduce((s, b) => s + sumMethod(b, 'voucher'), 0),
      };
      const deposits = sorted.reduce((s, b) => s + Number(b.deposit_amount || 0), 0);
      return { artistId, artist, sessions: sorted, settled, pending, totalRevenue, artistEarnings, studioEarnings, cut, methods, deposits };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [activeBookings, artistMap]);

  const dayTotalsSelected = useMemo(() => dayTotals.find(d => d.str === selectedStr) || { revenue: 0, sessions: 0, settled: 0, pending: 0 }, [dayTotals, selectedStr]);

  // Selected day payment-method breakdown (from settled sessions only = real money in kasa)
  const dayMethods = useMemo(() => {
    const settled = activeBookings.filter(b => b.is_settled);
    const cash = settled.reduce((s, b) => s + sumMethod(b, 'cash'), 0);
    const card = settled.reduce((s, b) => s + sumMethod(b, 'card'), 0);
    const voucher = settled.reduce((s, b) => s + sumMethod(b, 'voucher'), 0);
    const voucherCount = settled.filter(b => b.payment_breakdown && b.payment_breakdown.some(p => p.method === 'voucher' && Number(p.amount || 0) > 0)).length;
    const deposits = settled.reduce((s, b) => s + Number(b.deposit_amount || 0), 0);
    return { cash, card, voucher, voucherCount, deposits };
  }, [activeBookings]);

  const handleSettled = (updated) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    setSettlingBooking(null);
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const isToday = isSameDay(selectedDate, today);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => setWeekStart(addWeeks(weekStart, -1))} className="flex items-center justify-center" style={{ padding: '8px', border: `0.5px solid ${t.border}`, background: t.bg, color: t.muted, cursor: 'pointer' }}>
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="flex items-center justify-center" style={{ padding: '8px', border: `0.5px solid ${t.border}`, background: t.bg, color: t.muted, cursor: 'pointer' }}>
          <ChevronRight size={14} />
        </button>
        <button onClick={() => { setWeekStart(startOfWeek(today, { weekStartsOn: 1 })); setSelectedDate(today); }} className="btn-oxblood" style={{ fontSize: '9px', padding: '8px 14px' }}>
          DZIŚ
        </button>
        <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {format(weekStart, 'd MMM', { locale: pl })} — {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
        </p>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-4">
          <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tydzień:</span>
          <span style={{ ...mono, fontSize: '13px', color: t.text, fontWeight: 600 }}>{weekTotals.revenue.toLocaleString('pl-PL')} PLN</span>
          <span style={{ ...mono, fontSize: '9px', color: t.muted }}>{weekTotals.sessions} sesji · {weekTotals.settled} rozliczone</span>
        </div>
      </div>

      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {dayTotals.map((d, i) => {
          const isSelected = d.str === selectedStr;
          const isTodayDay = isSameDay(d.date, today);
          const hasData = d.sessions > 0;
          return (
            <button
              key={d.str}
              onClick={() => setSelectedDate(d.date)}
              className="p-3 text-center transition-all"
              style={{
                border: `0.5px solid ${isSelected ? 'var(--brand)' : t.border}`,
                background: isSelected ? 'rgb(var(--brand-rgb) /0.08)' : t.bg,
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
                position: 'relative',
              }}
            >
              {isTodayDay && <div style={{ position: 'absolute', top: '4px', right: '4px', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--brand)' }} />}
              <p style={{ ...mono, fontSize: '8px', color: isSelected ? 'var(--brand)' : t.muted, letterSpacing: '0.1em' }}>{DAY_SHORT[i]}</p>
              <p style={{ ...display, fontSize: '1.4rem', color: hasData ? t.title : t.muted, lineHeight: 1, marginTop: '4px' }}>{format(d.date, 'd')}</p>
              <p style={{ ...mono, fontSize: '7px', color: t.muted, marginTop: '6px', letterSpacing: '0.06em' }}>{format(d.date, 'MMM', { locale: pl }).toUpperCase()}</p>
              {hasData ? (
                <>
                  <p style={{ ...mono, fontSize: '10px', color: isSelected ? 'var(--brand)' : t.text, fontWeight: 600, marginTop: '8px' }}>{d.revenue.toLocaleString('pl-PL')}</p>
                  <p style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.06em' }}>{d.sessions} {d.sessions === 1 ? 'SESJA' : d.sessions <= 4 ? 'SESJE' : 'SESJI'}</p>
                  {d.pending > 0 ? (
                    <p style={{ ...mono, fontSize: '7px', color: '#f59e0b', marginTop: '2px' }}>{d.pending} DO ROZL.</p>
                  ) : (
                    <p style={{ ...mono, fontSize: '7px', color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}><Check size={8} /> ROZL.</p>
                  )}
                </>
              ) : (
                <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '8px', opacity: 0.5 }}>—</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <p style={{ ...display, fontSize: '1.4rem', color: t.title, letterSpacing: '0.04em' }}>
          {isToday ? 'DZIŚ' : format(selectedDate, 'EEEE', { locale: pl }).toUpperCase()}
        </p>
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dzień:</span>
          <span style={{ ...mono, fontSize: '13px', color: t.text, fontWeight: 600 }}>{dayTotalsSelected.revenue.toLocaleString('pl-PL')} PLN</span>
          <span style={{ ...mono, fontSize: '9px', color: t.muted }}>{dayTotalsSelected.sessions} sesji</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : artistGroups.length === 0 ? (
        <div className="py-16 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK SESJI TEGO DNIA</p>
        </div>
      ) : (
        <>
          {/* Day KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Przychód dnia', value: `${dayTotalsSelected.revenue.toLocaleString('pl-PL')} PLN`, sub: `${dayTotalsSelected.sessions} ${dayTotalsSelected.sessions === 1 ? 'sesja' : 'sesji'}` },
              { label: 'Dla artystów', value: `${artistGroups.reduce((s, g) => s + g.artistEarnings, 0).toLocaleString('pl-PL')} PLN`, sub: 'do wypłaty', color: '#16a34a' },
              { label: 'Dla studia', value: `${artistGroups.reduce((s, g) => s + g.studioEarnings, 0).toLocaleString('pl-PL')} PLN`, sub: 'przychód własny', color: 'var(--brand)' },
              { label: 'Rozliczone', value: `${dayTotalsSelected.settled}/${dayTotalsSelected.sessions}`, sub: dayTotalsSelected.pending > 0 ? `${dayTotalsSelected.pending} do rozliczenia` : 'wszystkie', color: dayTotalsSelected.pending > 0 ? '#f59e0b' : '#16a34a' },
            ].map((k, i) => (
              <div key={i} className="p-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                <p style={{ ...display, fontSize: '1.6rem', color: k.color || t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{k.value}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{k.label}</p>
                {k.sub && <p style={{ ...mono, fontSize: '9px', color: k.color || t.fuchsia, marginTop: '3px' }}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Payment methods in kasa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 flex items-center gap-3" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PAYMENT_COLORS.cash, flexShrink: 0 }} />
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gotówka w kasie</p>
                <p style={{ ...mono, fontSize: '15px', color: PAYMENT_COLORS.cash, fontWeight: 600 }}>{dayMethods.cash.toLocaleString('pl-PL')} PLN</p>
              </div>
            </div>
            <div className="p-3 flex items-center gap-3" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PAYMENT_COLORS.card, flexShrink: 0 }} />
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kartą</p>
                <p style={{ ...mono, fontSize: '15px', color: PAYMENT_COLORS.card, fontWeight: 600 }}>{dayMethods.card.toLocaleString('pl-PL')} PLN</p>
              </div>
            </div>
            <div className="p-3 flex items-center gap-3" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PAYMENT_COLORS.voucher, flexShrink: 0 }} />
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Voucherami {dayMethods.voucherCount > 0 ? `(${dayMethods.voucherCount})` : ''}</p>
                <p style={{ ...mono, fontSize: '15px', color: PAYMENT_COLORS.voucher, fontWeight: 600 }}>{dayMethods.voucher.toLocaleString('pl-PL')} PLN</p>
              </div>
            </div>
            <div className="p-3 flex items-center gap-3" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.muted, flexShrink: 0 }} />
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wpłacone zaliczki</p>
                <p style={{ ...mono, fontSize: '15px', color: t.text, fontWeight: 600 }}>{dayMethods.deposits.toLocaleString('pl-PL')} PLN</p>
              </div>
            </div>
          </div>

          {/* Per-artist settlement cards */}
          <div className="space-y-3">
            {artistGroups.map(g => {
              const isOpen = expandedArtist === g.artistId;
              const allSettled = g.pending.length === 0;
              return (
                <div key={g.artistId} style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                  <button
                    onClick={() => setExpandedArtist(isOpen ? null : g.artistId)}
                    className="w-full text-left px-4 py-4 flex items-center gap-4"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    {g.artist.photo_url ? (
                      <img src={getThumbnailUrl(g.artist.photo_url, 80, 80)} alt={g.artist.name} width={44} height={44} style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...display, fontSize: '16px', color: 'var(--brand)' }}>{g.artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p style={{ color: t.title, fontSize: '14px', fontWeight: 500 }}>{g.artist.name}</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                        UDZIAŁ {g.cut}% · {g.sessions.length} {g.sessions.length === 1 ? 'SESJA' : g.sessions.length >= 2 && g.sessions.length <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2" style={{ flexShrink: 0 }}>
                      {allSettled ? (
                        <span style={{ ...mono, fontSize: '8px', color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={11} /> ROZLICZONO
                        </span>
                      ) : (
                        <span style={{ ...mono, fontSize: '8px', color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {g.pending.length} DO ROZLICZENIA
                        </span>
                      )}
                    </div>
                    <div className="text-right" style={{ flexShrink: 0, minWidth: '90px' }}>
                      <p style={{ ...mono, fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>{g.artistEarnings.toLocaleString('pl-PL')} PLN</p>
                      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>dla artysty</p>
                    </div>
                    <div className="text-right hidden md:block" style={{ flexShrink: 0, minWidth: '90px' }}>
                      <p style={{ ...mono, fontSize: '14px', color: 'var(--brand)', fontWeight: 600 }}>{g.studioEarnings.toLocaleString('pl-PL')} PLN</p>
                      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>dla studia</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} color={t.muted} /> : <ChevronDown size={16} color={t.muted} />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: `0.5px solid ${t.border}` }}
                      >
                        {/* Payment form breakdown */}
                        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-3" style={{ background: 'rgb(var(--brand-rgb) /0.03)', borderBottom: `0.5px solid ${t.border}` }}>
                          <div>
                            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Przychód</p>
                            <p style={{ ...mono, fontSize: '12px', color: t.text, fontWeight: 600 }}>{g.totalRevenue.toLocaleString('pl-PL')} PLN</p>
                          </div>
                          <div>
                            <p style={{ ...mono, fontSize: '8px', color: PAYMENT_COLORS.cash, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Gotówka</p>
                            <p style={{ ...mono, fontSize: '12px', color: t.text }}>{g.methods.cash.toLocaleString('pl-PL')} PLN</p>
                          </div>
                          <div>
                            <p style={{ ...mono, fontSize: '8px', color: PAYMENT_COLORS.card, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Karta</p>
                            <p style={{ ...mono, fontSize: '12px', color: t.text }}>{g.methods.card.toLocaleString('pl-PL')} PLN</p>
                          </div>
                          <div>
                            <p style={{ ...mono, fontSize: '8px', color: PAYMENT_COLORS.voucher, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Voucher</p>
                            <p style={{ ...mono, fontSize: '12px', color: t.text }}>{g.methods.voucher.toLocaleString('pl-PL')} PLN</p>
                          </div>
                          <div>
                            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zaliczki</p>
                            <p style={{ ...mono, fontSize: '12px', color: t.text }}>{g.deposits.toLocaleString('pl-PL')} PLN</p>
                          </div>
                        </div>

                        {/* Sessions list */}
                        <div>
                          {g.sessions.map((b, i) => {
                            const settled = b.is_settled;
                            const bCut = Math.round(Number(b.final_amount || b.estimated_price || 0) * g.cut / 100);
                            return (
                              <div key={b.id} className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: i < g.sessions.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted, flexShrink: 0 }} />
                                <div style={{ minWidth: '50px', flexShrink: 0 }}>
                                  <p style={{ ...mono, fontSize: '12px', color: t.text }}>{b.session_time}</p>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                                  <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '1px' }}>
                                    {b.tattoo_placement ? `${b.tattoo_placement} · ` : ''}{b.service_name || ''}
                                  </p>
                                </div>
                                <div className="text-right hidden sm:block" style={{ flexShrink: 0, minWidth: '70px' }}>
                                  <p style={{ ...mono, fontSize: '12px', color: t.text }}>{Number(b.final_amount || b.estimated_price || 0).toLocaleString('pl-PL')} PLN</p>
                                  <p style={{ ...mono, fontSize: '8px', color: '#16a34a' }}>→ {bCut.toLocaleString('pl-PL')} PLN</p>
                                </div>
                                {settled ? (
                                  <button
                                    onClick={() => setSettlingBooking(b)}
                                    className="flex items-center gap-1"
                                    style={{ ...mono, fontSize: '8px', color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', border: '0.5px solid rgba(22,163,74,0.4)', padding: '5px 10px', cursor: 'pointer', flexShrink: 0, background: 'transparent' }}
                                  >
                                    <Check size={11} /> EDYTUJ
                                  </button>
                                ) : b.status === 'cancelled' ? (
                                  <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>ANULOWANA</span>
                                ) : (
                                  <button
                                    onClick={() => setSettlingBooking(b)}
                                    className="btn-oxblood flex items-center gap-1.5"
                                    style={{ fontSize: '8px', padding: '6px 12px', flexShrink: 0 }}
                                  >
                                    <Wallet size={10} /> ROZLICZ
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}

      {settlingBooking && (
        <SettlementModal
          booking={settlingBooking}
          user={user}
          onClose={() => setSettlingBooking(null)}
          onSettled={handleSettled}
          t={t}
        />
      )}
    </div>
  );
}