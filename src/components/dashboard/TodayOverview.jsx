import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Check, Clock, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import SettlementModal from './SettlementModal';
import { formatCompact } from '@/lib/formatNumber';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const PAYMENT_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };

const sumMethod = (b, method) => {
  if (b.payment_breakdown && b.payment_breakdown.length > 0) {
    return b.payment_breakdown.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  return method === 'cash' ? Number(b.final_amount || b.estimated_price || 0) : 0;
};

export default function TodayOverview({ bookings, t, theme, onBookingUpdate, artists, variant }) {
  const { user } = useAuth();
  const [settlingBooking, setSettlingBooking] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const today = bookings.filter(b => b.session_date === todayStr && b.status !== 'cancelled');
  const potential = today.reduce((s, b) => s + Number(b.final_amount || b.estimated_price || 0), 0);
  const settled = today.filter(b => b.is_settled).reduce((s, b) => s + Number(b.final_amount || 0), 0);
  const toSettle = today.filter(b => !b.is_settled);
  const settledCount = today.filter(b => b.is_settled).length;
  const pct = potential > 0 ? Math.round((settled / potential) * 100) : (today.length > 0 && settledCount === today.length ? 100 : 0);

  // Artist / studio split (based on each artist's cut percent)
  const getCut = (b) => artists?.find(a => a.id === b.artist_id)?.artist_cut_percent ?? 60;
  const artistShare = (b, amount) => Math.round(amount * getCut(b) / 100 * 100) / 100;
  const potentialArtist = today.reduce((s, b) => s + artistShare(b, Number(b.final_amount || b.estimated_price || 0)), 0);
  const potentialStudio = Math.round((potential - potentialArtist) * 100) / 100;
  const settledArtist = today.filter(b => b.is_settled).reduce((s, b) => s + artistShare(b, Number(b.final_amount || 0)), 0);
  const settledStudio = Math.round((settled - settledArtist) * 100) / 100;
  const toSettleArtist = Math.round((potentialArtist - settledArtist) * 100) / 100;
  const toSettleStudio = Math.round((potentialStudio - settledStudio) * 100) / 100;

  // Payment methods in kasa (from settled sessions) + deposits collected
  const settledBookings = today.filter(b => b.is_settled);
  const cashInKasa = settledBookings.reduce((s, b) => s + sumMethod(b, 'cash'), 0);
  const cardTotal = settledBookings.reduce((s, b) => s + sumMethod(b, 'card'), 0);
  const voucherTotal = settledBookings.reduce((s, b) => s + sumMethod(b, 'voucher'), 0);
  const depositsTotal = today.reduce((s, b) => s + Number(b.deposit_amount || 0), 0);

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmt = (n) => Number(n || 0).toLocaleString('pl-PL');

  // Monthly stats (current month)
  const monthDate = new Date();
  const monthName = monthDate.toLocaleDateString('pl-PL', { month: 'long' });
  const monthYear = monthDate.getFullYear();
  const ym = (d) => {
    const dt = new Date(d);
    return dt.getFullYear() * 12 + dt.getMonth();
  };
  const curYm = ym(new Date());
  const monthBookings = bookings.filter(b => b.session_date && ym(b.session_date) === curYm && b.status !== 'cancelled');
  // Sessions count: completed sessions this month.
  const monthSessionsCount = monthBookings.filter(b => b.status === 'completed').length;
  // Past sessions this month already settled.
  const todayStrM = new Date().toISOString().split('T')[0];
  const pastMonthSettled = monthBookings.filter(b => (b.session_date || '') <= todayStrM);
  // Upcoming sessions still planned this month (future dates, not cancelled).
  const monthUpcomingCount = monthBookings.filter(b => (b.session_date || '') > todayStrM).length;
  // Studio earnings this month: settled studio share (potential for upcoming).
  const monthSettledStudio = pastMonthSettled.filter(b => b.is_settled).reduce((s, b) => {
    const amt = Number(b.final_amount || 0);
    return s + Math.round((amt - artistShare(b, amt)) * 100) / 100;
  }, 0);
  const monthUpcomingStudio = monthBookings.filter(b => (b.session_date || '') > todayStrM).reduce((s, b) => {
    const amt = Number(b.final_amount || b.estimated_price || 0);
    return s + Math.round((amt - artistShare(b, amt)) * 100) / 100;
  }, 0);

  const handleSettled = (updated) => {
    setSettlingBooking(null);
    if (onBookingUpdate) onBookingUpdate(updated);
  };

  const headerTitle = variant === 'artist' ? 'Rozliczenie dnia' : 'Kasa dnia';

  return (
    <div className="mb-10">
      {/* Monthly overview — admin only, separate category above daily cash */}
      {variant !== 'artist' && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Calendar size={13} color="var(--brand)" />
              <p style={{ ...mono, fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Przegląd miesiąca</p>
            </div>
            <Link to="/dashboard/stats" className="flex items-center gap-1" style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              STATYSTYKI <ArrowRight size={11} />
            </Link>
          </div>
          <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>{monthName} {monthYear}</p>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/dashboard/bookings" className="p-4 transition-all duration-300 hover:opacity-80" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar size={11} color="var(--brand)" />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Wykonane sesje</p>
              </div>
              <p style={{ ...display, fontSize: '2rem', color: t.value, lineHeight: 1, letterSpacing: '0.03em' }}>{monthSessionsCount}</p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '5px' }}>jeszcze zaplanowanych: {monthUpcomingCount}</p>
            </Link>
            <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet size={11} color="var(--brand)" />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Zarobek studia</p>
              </div>
              <p style={{ ...display, fontSize: '2rem', color: 'var(--brand)', lineHeight: 1, letterSpacing: '0.03em' }}>{formatCompact(monthSettledStudio)} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>PLN</span></p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '5px' }}>jeszcze do zarobienia: {formatCompact(monthUpcomingStudio)} PLN</p>
            </div>
          </div>
        </div>
      )}

      {/* Cash card */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Wallet size={13} color="var(--brand)" />
          <p style={{ ...mono, fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{headerTitle}</p>
        </div>
        {variant !== 'artist' && (
          <Link to="/dashboard/stats" className="flex items-center gap-1" style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            STATYSTYKI <ArrowRight size={11} />
          </Link>
        )}
      </div>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>{todayLabel}</p>

      <div className="p-6 mb-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>

        {variant === 'artist' ? (
          /* Artist view: Mój zarobek · Studio · Do rozliczenia (exact amounts) */
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <Wallet size={10} color="var(--brand)" />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Mój zarobek</p>
              </div>
              <p style={{ ...display, fontSize: '1.9rem', color: 'var(--brand)', lineHeight: 1, letterSpacing: '0.02em' }}>{fmt(settledArtist)} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>PLN</span></p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px' }}>do odebrania: {fmt(toSettleArtist)} PLN</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <TrendingUp size={10} color={t.muted} />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Studio</p>
              </div>
              <p style={{ ...display, fontSize: '1.9rem', color: t.value, lineHeight: 1, letterSpacing: '0.02em' }}>{fmt(settledStudio)} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>PLN</span></p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px' }}>do odebrania: {fmt(toSettleStudio)} PLN</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <Clock size={10} color={toSettle.length > 0 ? '#f59e0b' : t.muted} />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Do rozliczenia</p>
              </div>
              <p style={{ ...display, fontSize: '1.9rem', color: toSettle.length > 0 ? '#f59e0b' : t.muted, lineHeight: 1, letterSpacing: '0.02em' }}>{toSettle.length} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>sesji</span></p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Art: {fmt(toSettleArtist)} · Studio: {fmt(toSettleStudio)}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <TrendingUp size={10} color={t.muted} />
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Potencjalnie</p>
                </div>
                <p style={{ ...display, fontSize: '1.9rem', color: t.value, lineHeight: 1, letterSpacing: '0.02em' }}>{formatCompact(potential)} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>PLN</span></p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Art: {formatCompact(potentialArtist)} · Studio: {formatCompact(potentialStudio)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <Check size={10} color="#16a34a" />
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rozliczone</p>
                </div>
                <p style={{ ...display, fontSize: '1.9rem', color: '#16a34a', lineHeight: 1, letterSpacing: '0.02em' }}>{formatCompact(settled)} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>PLN</span></p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Art: {formatCompact(settledArtist)} · Studio: {formatCompact(settledStudio)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1" style={{ minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <Clock size={10} color={toSettle.length > 0 ? '#f59e0b' : t.muted} />
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Do rozliczenia</p>
                </div>
                <p style={{ ...display, fontSize: '1.9rem', color: toSettle.length > 0 ? '#f59e0b' : t.muted, lineHeight: 1, letterSpacing: '0.02em' }}>{toSettle.length} <span style={{ ...mono, fontSize: '11px', color: t.muted }}>sesji</span></p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Art: {formatCompact(toSettleArtist)} · Studio: {formatCompact(toSettleStudio)}</p>
              </div>
            </div>

            {/* Payment methods in kasa — simplified */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {[
                { label: 'Gotówka', value: cashInKasa, color: PAYMENT_COLORS.cash },
                { label: 'Karta', value: cardTotal, color: PAYMENT_COLORS.card },
                { label: 'Voucher', value: voucherTotal, color: PAYMENT_COLORS.voucher },
                { label: 'Przedpłaty', value: depositsTotal, color: t.muted },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ border: `0.5px solid ${t.cardBorder}`, background: 'rgb(var(--brand-rgb) /0.03)', borderRadius: 'var(--radius)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ ...mono, fontSize: '12px', color: t.value, fontWeight: 600 }}>{formatCompact(m.value)} PLN</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Postęp rozliczenia</span>
                <span style={{ ...mono, fontSize: '9px', color: t.muted }}>{settledCount}/{today.length} · {pct}%</span>
              </div>
              <div style={{ height: '4px', background: t.border, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* To-settle list */}
      {toSettle.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} color="#f59e0b" />
            <p style={{ ...mono, fontSize: '10px', color: '#f59e0b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Do rozliczenia dziś ({toSettle.length})</p>
          </div>
          <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            {[...toSettle].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || '')).map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: i < toSettle.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted, flexShrink: 0 }} />
                <div style={{ minWidth: '46px', flexShrink: 0 }}>
                  <p style={{ ...mono, fontSize: '12px', color: t.value }}>{b.session_time}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                  <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '1px' }}>{b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}</p>
                </div>
                <span style={{ ...mono, fontSize: '12px', color: t.muted, flexShrink: 0 }}>{Number(b.estimated_price || 0).toLocaleString('pl-PL')} PLN</span>
                <button onClick={() => setSettlingBooking(b)} className="btn-oxblood flex items-center gap-1.5" style={{ fontSize: '8px', padding: '6px 12px', flexShrink: 0 }}>
                  <Wallet size={10} /> ROZLICZ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlingBooking && (
        <SettlementModal
          booking={settlingBooking}
          user={user}
          onClose={() => setSettlingBooking(null)}
          onSettled={handleSettled}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)' }}
        />
      )}
    </div>
  );
}