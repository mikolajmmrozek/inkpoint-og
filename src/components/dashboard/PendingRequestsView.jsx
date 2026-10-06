import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, CalendarClock, Clock, Loader2 } from 'lucide-react';
import SessionDatePicker from '@/components/booking/SessionDatePicker';
import { getThumbnailUrl } from '@/lib/thumbnail';
import { getThemeVars } from '@/lib/themeVars';

const STATUS_COLORS = {
  pending: '#FF007F',
  rejected: '#9ca3af',
  accepted_by_studio: '#16a34a',
  studio_proposed: '#f59e0b',
  accepted_by_client: '#16a34a',
  declined_by_client: '#9ca3af',
  expired: '#9ca3af',
};

const STATUS_LABELS = {
  pending: 'Oczekuje',
  rejected: 'Odrzucona',
  accepted_by_studio: 'Zaakceptowana',
  studio_proposed: 'Propozycja wysłana',
  accepted_by_client: 'Zaakceptowana',
  declined_by_client: 'Odrzucona',
  expired: 'Wygasła',
};

const BOOKING_STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

/**
 * Combined "Do weryfikacji" view shown inside Rezerwacje (pending mode).
 * Two cards:
 *   1. Oczekujące rezerwacje — pending bookings with inline confirm + open detail.
 *   2. Prośby o zmianę terminu — ChangeRequest records with reject / accept / propose.
 */
export default function PendingRequestsView({ bookings, artists, t, theme, onConfirmBooking, onOpenBooking, refreshBookings }) {
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [acting, setActing] = useState(null);
  const [proposeMode, setProposeMode] = useState(null);
  const [propDate, setPropDate] = useState('');
  const [propTime, setPropTime] = useState('');
  const [propNote, setPropNote] = useState('');
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const loadRequests = async () => {
    try {
      const list = await base44.entities.ChangeRequest.list('-created_date', 200);
      setRequests(list);
    } catch (e) {}
    setLoadingReqs(false);
  };

  useEffect(() => { loadRequests(); }, []);

  // Realtime: refresh change requests when a ChangeRequest event arrives.
  useEffect(() => {
    let unsub;
    try {
      unsub = base44.entities.ChangeRequest.subscribe(() => loadRequests());
    } catch (e) {}
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const act = async (requestId, action, extra = {}) => {
    setActing(requestId);
    setError(null);
    try {
      const res = await base44.functions.invoke('manageChangeRequest', { action, request_id: requestId, ...extra });
      if (res?.data?.error) throw new Error(res.data.error);
      await loadRequests();
      refreshBookings?.();
    } catch (e) {
      setError(e.message || 'Wystąpił błąd.');
    } finally {
      setActing(null);
    }
  };

  const handlePropose = async (requestId) => {
    if (!propDate || !propTime) { setError('Wybierz proponowany termin.'); return; }
    await act(requestId, 'propose_alternative', { studio_proposed_date: propDate, studio_proposed_time: propTime, studio_note: propNote });
    setProposeMode(null);
    setPropDate(''); setPropTime(''); setPropNote('');
  };

  const handleConfirm = async (booking) => {
    setConfirmingId(booking.id);
    try {
      await onConfirmBooking(booking.id, 'confirmed');
    } finally {
      setConfirmingId(null);
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const openRequests = requests.filter(r => r.status === 'pending' || r.status === 'studio_proposed');
  const resolvedRequests = requests.filter(r => r.status !== 'pending' && r.status !== 'studio_proposed');

  const cardHeader = (label, count, accentColor) => (
    <div className="flex items-center gap-3 mb-4">
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accentColor }} />
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: accentColor }}>
        {label}
      </p>
      <div style={{ flex: 1, height: '0.5px', background: t.border }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{count}</span>
    </div>
  );

  const actionBtn = { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };

  const renderBookingRow = (b, i, arr) => {
    const artist = artists.find(a => a.id === b.artist_id);
    return (
      <div
        key={b.id}
        className="flex items-center justify-between gap-3 p-4 transition-colors"
        style={{ borderBottom: i < arr.length - 1 ? `0.5px solid ${t.border}` : 'none', background: 'transparent', cursor: 'pointer' }}
        onClick={() => onOpenBooking(b)}
        onMouseEnter={e => e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 text-center" style={{ minWidth: '48px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: BOOKING_STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time || '—'}</p>
          </div>
          {artist?.photo_url ? (
            <img src={getThumbnailUrl(artist.photo_url, 80, 60)} alt={artist.name} loading="lazy" width={36} height={36} style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
          ) : (artist || b.artist_name) ? (
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--brand)' }}>
                {(artist?.name || b.artist_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          ) : null}
          <div className="min-w-0">
            <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.session_date}{b.artist_name ? ` · ${b.artist_name}` : ''}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
            </p>
            {b.service_name && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                {b.service_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirm(b); }}
            disabled={confirmingId === b.id}
            style={{ ...actionBtn, border: '0.5px solid #16a34a', color: '#16a34a', background: 'transparent', opacity: confirmingId === b.id ? 0.5 : 1 }}
          >
            {confirmingId === b.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} POTWIERDŹ
          </button>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: BOOKING_STATUS_COLORS[b.status] || t.muted }} />
        </div>
      </div>
    );
  };

  const renderRequestCard = (r) => {
    const isPending = r.status === 'pending';
    const isStudioProposed = r.status === 'studio_proposed';
    return (
      <div key={r.id} className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, marginBottom: '12px' }}>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: t.text, letterSpacing: '0.04em' }}>
              {r.client_name || 'Klient'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
              {r.client_email}{r.artist_name ? ` · ${r.artist_name}` : ''}
            </p>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: STATUS_COLORS[r.status], letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[r.status]}` }}>
            {STATUS_LABELS[r.status] || r.status}
          </span>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3" style={{ border: `0.5px solid ${t.border}`, background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              PIERWOTNY (POTWIERDZONY)
            </p>
            <p style={{ fontSize: '13px', color: t.text }}>
              {r.original_date} {r.original_time && `· ${r.original_time}`}
            </p>
          </div>
          <div className="p-3" style={{ border: `0.5px solid ${t.border}`, background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              KLIENT PROSI O
            </p>
            <p style={{ fontSize: '13px', color: t.text }}>
              {r.requested_date} {r.requested_time && `· ${r.requested_time}`}
            </p>
          </div>
          {(isStudioProposed || r.status === 'accepted_by_client' || r.status === 'declined_by_client') && r.studio_proposed_date && (
            <div className="p-3" style={{ border: `0.5px solid ${t.fuchsia}`, background: 'rgb(var(--brand-rgb) /0.05)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
                STUDIO ZAPROPONOWAŁO
              </p>
              <p style={{ fontSize: '13px', color: t.text }}>
                {r.studio_proposed_date} {r.studio_proposed_time && `· ${r.studio_proposed_time}`}
              </p>
            </div>
          )}
        </div>

        {r.client_note && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginBottom: '12px', padding: '6px 10px', background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderLeft: `1px solid ${t.fuchsia}` }}>
            Notatka klienta: {r.client_note}
          </p>
        )}

        {isPending && proposeMode !== r.id && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => act(r.id, 'reject')}
              disabled={acting === r.id}
              style={{ ...actionBtn, border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent' }}
            >
              {acting === r.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} ODRZUĆ
            </button>
            <button
              onClick={() => act(r.id, 'accept_requested')}
              disabled={acting === r.id}
              style={{ ...actionBtn, border: '0.5px solid #16a34a', color: '#16a34a', background: 'transparent' }}
            >
              <Check size={11} /> POTWIERDŹ TERMIN KLIENTA
            </button>
            <button
              onClick={() => { setProposeMode(r.id); setError(null); }}
              style={{ ...actionBtn, border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent' }}
            >
              <CalendarClock size={11} /> ZAPROPONUJ INNY TERMIN
            </button>
          </div>
        )}

        {isPending && proposeMode === r.id && (
          <div className="mt-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}`, ...getThemeVars(theme) }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              ZAPROPUJ NOWY TERMIN
            </p>
            <SessionDatePicker
              artistId={r.artist_id}
              selectedDate={propDate}
              selectedTime={propTime}
              onDateChange={setPropDate}
              onTimeChange={setPropTime}
              durationOverride={r.session_duration}
            />
            <textarea
              placeholder="Notatka do klienta (opcjonalnie)..."
              value={propNote}
              onChange={e => setPropNote(e.target.value)}
              className="w-full mt-3"
              style={{ background: theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.06)', border: `0.5px solid ${t.border}`, color: t.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical', minHeight: '60px' }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handlePropose(r.id)}
                disabled={acting === r.id || !propDate || !propTime}
                className="btn-oxblood flex items-center gap-2"
                style={{ opacity: (acting === r.id || !propDate || !propTime) ? 0.5 : 1 }}
              >
                {acting === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} WYŚLIJ PROPOZYCJĘ
              </button>
              <button onClick={() => { setProposeMode(null); setPropDate(''); setPropTime(''); setPropNote(''); }} className="btn-ghost-parchment">
                ANULUJ
              </button>
            </div>
          </div>
        )}

        {isStudioProposed && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.08em' }}>
            <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
            Czeka na odpowiedź klienta. Pierwotny termin pozostaje potwierdzony.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="p-3" style={{ border: '0.5px solid var(--brand)', background: 'rgb(var(--brand-rgb) /0.08)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {error}</p>
        </div>
      )}

      {/* Card 1: Oczekujące rezerwacje */}
      <div>
        {cardHeader('OCZEKUJĄCE REZERWACJE', pendingBookings.length, '#FF007F')}
        {pendingBookings.length === 0 ? (
          <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
              ✓ BRAK REZERWACJI DO POTWIERDZENIA
            </p>
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            {pendingBookings.map((b, i) => renderBookingRow(b, i, pendingBookings))}
          </div>
        )}
      </div>

      {/* Card 2: Prośby o zmianę terminu */}
      <div>
        {cardHeader('PROŚBY O ZMIANĘ TERMINU', openRequests.length, '#f59e0b')}
        {loadingReqs ? (
          <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: t.fuchsia }} />
          </div>
        ) : openRequests.length === 0 ? (
          <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
              ✓ BRAK OTWARTYCH PROŚB
            </p>
          </div>
        ) : (
          openRequests.map(renderRequestCard)
        )}

        {resolvedRequests.length > 0 && (
          <div className="mt-6">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              ROZSTRZYGNIĘTE ({resolvedRequests.length})
            </p>
            {resolvedRequests.slice(0, 20).map(renderRequestCard)}
          </div>
        )}
      </div>
    </div>
  );
}