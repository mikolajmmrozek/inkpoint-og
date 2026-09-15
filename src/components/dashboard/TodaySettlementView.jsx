import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Wallet, Check, Clock, Calendar as CalIcon, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import SettlementModal from './SettlementModal';
import { getThumbnailUrl } from '@/lib/thumbnail';

const PAYMENT_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
const PAYMENT_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };

const sumMethod = (b, method) => {
  if (b.payment_breakdown && b.payment_breakdown.length > 0) {
    return b.payment_breakdown.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  return method === 'cash' ? Number(b.final_amount || b.estimated_price || 0) : 0;
};

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

export default function TodaySettlementView({ t, theme }) {
  const { user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(todayStr);
  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedArtist, setExpandedArtist] = useState(null);
  const [settlingBooking, setSettlingBooking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allBookings, artistData] = await Promise.all([
        base44.entities.Booking.filter({ session_date: date }, '-session_time', 500),
        base44.entities.Artist.list(),
      ]);
      setBookings(allBookings);
      setArtists(artistData);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Only count sessions that produce revenue (exclude cancelled)
  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);

  const artistMap = useMemo(() => {
    const m = {};
    artists.forEach(a => { m[a.id] = a; });
    return m;
  }, [artists]);

  // Group by artist
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

  const totals = useMemo(() => artistGroups.reduce((acc, g) => ({
    revenue: acc.revenue + g.totalRevenue,
    artist: acc.artist + g.artistEarnings,
    studio: acc.studio + g.studioEarnings,
    sessions: acc.sessions + g.sessions.length,
    settled: acc.settled + g.settled.length,
    pending: acc.pending + g.pending.length,
    deposits: acc.deposits + g.deposits,
  }), { revenue: 0, artist: 0, studio: 0, sessions: 0, settled: 0, pending: 0, deposits: 0 }), [artistGroups]);

  const handleSettled = (updated) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    setSettlingBooking(null);
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  const dateObj = date ? new Date(date) : new Date();
  const isToday = date === todayStr;
  const dateLabel = format(dateObj, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase();

  return (
    <div>
      {/* Header — date + refresh */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '8px 12px' }}>
          <CalIcon size={13} color="var(--brand)" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', ...mono, fontSize: '10px', color: t.text, colorScheme: theme === 'light' ? 'light' : 'dark' }}
          />
        </div>
        <button onClick={load} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: t.bg, cursor: 'pointer' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> ODŚWIEŻ
        </button>
        <div className="flex-1" />
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {isToday ? 'DZIŚ — ' : ''}{dateLabel}
        </p>
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
          {/* Day totals KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Przychód dnia', value: `${totals.revenue.toLocaleString('pl-PL')} PLN`, sub: `${totals.sessions} ${totals.sessions === 1 ? 'sesja' : 'sesji'}` },
              { label: 'Dla artystów', value: `${totals.artist.toLocaleString('pl-PL')} PLN`, sub: 'do wypłaty', color: '#16a34a' },
              { label: 'Dla studia', value: `${totals.studio.toLocaleString('pl-PL')} PLN`, sub: 'przychód własny', color: 'var(--brand)' },
              { label: 'Rozliczone', value: `${totals.settled}/${totals.sessions}`, sub: totals.pending > 0 ? `${totals.pending} do rozliczenia` : 'wszystkie', color: totals.pending > 0 ? '#f59e0b' : '#16a34a' },
            ].map((k, i) => (
              <div key={i} className="p-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                <p style={{ ...display, fontSize: '1.6rem', color: k.color || t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{k.value}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{k.label}</p>
                {k.sub && <p style={{ ...mono, fontSize: '9px', color: k.color || t.fuchsia, marginTop: '3px' }}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Per-artist settlement cards */}
          <div className="space-y-3">
            {artistGroups.map(g => {
              const isOpen = expandedArtist === g.artistId;
              const allSettled = g.pending.length === 0;
              return (
                <div key={g.artistId} style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                  {/* Artist row */}
                  <button
                    onClick={() => setExpandedArtist(isOpen ? null : g.artistId)}
                    className="w-full text-left px-4 py-4 flex items-center gap-4"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    {/* Avatar */}
                    {g.artist.photo_url ? (
                      <img src={getThumbnailUrl(g.artist.photo_url, 80, 80)} alt={g.artist.name} width={44} height={44} style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...display, fontSize: '16px', color: 'var(--brand)' }}>{g.artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    {/* Name + cut */}
                    <div className="min-w-0 flex-1">
                      <p style={{ color: t.title, fontSize: '14px', fontWeight: 500 }}>{g.artist.name}</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                        UDZIAŁ {g.cut}% · {g.sessions.length} {g.sessions.length === 1 ? 'SESJA' : g.sessions.length >= 2 && g.sessions.length <= 4 ? 'SESJE' : 'SESJI'}
                      </p>
                    </div>
                    {/* Settled indicator */}
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
                    {/* Earnings */}
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

                  {/* Expanded: payment breakdown + sessions */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: `0.5px solid ${t.border}` }}
                      >
                        {/* Payment method summary */}
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
                                  <span style={{ ...mono, fontSize: '8px', color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <Check size={12} /> ROZLICZONO
                                  </span>
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

            {/* Grand total */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 py-4" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.05)', borderRadius: 'var(--radius)' }}>
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma przychód</p>
                <p style={{ ...mono, fontSize: '14px', color: t.text, fontWeight: 600 }}>{totals.revenue.toLocaleString('pl-PL')} PLN</p>
              </div>
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma artyści</p>
                <p style={{ ...mono, fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>{totals.artist.toLocaleString('pl-PL')} PLN</p>
              </div>
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma studio</p>
                <p style={{ ...mono, fontSize: '14px', color: 'var(--brand)', fontWeight: 600 }}>{totals.studio.toLocaleString('pl-PL')} PLN</p>
              </div>
              <div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Status</p>
                <p style={{ ...mono, fontSize: '14px', color: totals.pending > 0 ? '#f59e0b' : '#16a34a', fontWeight: 600 }}>
                  {totals.settled}/{totals.sessions}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settlement modal */}
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