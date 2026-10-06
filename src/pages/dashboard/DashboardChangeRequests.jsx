import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { X, Check, RefreshCw, Clock, Loader2, CalendarClock } from 'lucide-react';
import { useTheme } from './Dashboard';
import SessionDatePicker from '@/components/booking/SessionDatePicker';

const STATUS_LABELS = {
  pending: 'Oczekuje',
  rejected: 'Odrzucona',
  accepted_by_studio: 'Zaakceptowana (studio)',
  studio_proposed: 'Propozycja wysłana',
  accepted_by_client: 'Zaakceptowana (klient)',
  declined_by_client: 'Odrzucona (klient)',
  expired: 'Wygasła',
};

const STATUS_COLORS = {
  pending: '#FF007F',
  rejected: '#9ca3af',
  accepted_by_studio: '#16a34a',
  studio_proposed: '#f59e0b',
  accepted_by_client: '#16a34a',
  declined_by_client: '#9ca3af',
  expired: '#9ca3af',
};

export default function DashboardChangeRequests() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null); // request id being acted on
  const [proposeMode, setProposeMode] = useState(null); // request id in propose mode
  const [propDate, setPropDate] = useState('');
  const [propTime, setPropTime] = useState('');
  const [propNote, setPropNote] = useState('');
  const [error, setError] = useState(null);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.55)', fuchsia: 'var(--brand)', cardBg: '#FFFFFF', rowBorder: '#E5E5E5', rowHover: 'rgba(0,0,0,0.03)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)', cardBg: 'rgba(255,255,255,0.06)', rowBorder: '#262626', rowHover: 'rgba(255,255,255,0.05)' };

  const load = async () => {
    const list = await base44.entities.ChangeRequest.list('-created_date', 200);
    setRequests(list);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const act = async (requestId, action, extra = {}) => {
    setActing(requestId);
    setError(null);
    try {
      const res = await base44.functions.invoke('manageChangeRequest', { action, request_id: requestId, ...extra });
      if (res?.data?.error) throw new Error(res.data.error);
      await load();
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

  // Group: open (pending + studio_proposed) first, then resolved.
  const open = requests.filter(r => r.status === 'pending' || r.status === 'studio_proposed');
  const resolved = requests.filter(r => r.status !== 'pending' && r.status !== 'studio_proposed');

  const actionBtn = { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' };

  const renderRow = (r) => {
    const isPending = r.status === 'pending';
    const isStudioProposed = r.status === 'studio_proposed';
    return (
      <div key={r.id} className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg, marginBottom: '12px' }}>
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

        {/* Actions */}
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
          <div className="mt-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
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
                {acting === r.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} WYŚLIJ PROPOZYCJĘ
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
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          KOLEJKA DECYZJI
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Prośby o zmianę terminu
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3" style={{ border: '0.5px solid var(--brand)', background: 'rgb(var(--brand-rgb) /0.08)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>
      ) : (
        <>
          {/* Open requests */}
          <div className="mb-10">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              OTWARTE ({open.length})
            </p>
            {open.length === 0 ? (
              <div className="py-12 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                  ✓ BRAK OTWARTYCH PROŚB
                </p>
              </div>
            ) : (
              open.map(renderRow)
            )}
          </div>

          {/* Resolved requests */}
          {resolved.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                ROZSTRZYGNIĘTE ({resolved.length})
              </p>
              {resolved.slice(0, 20).map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}