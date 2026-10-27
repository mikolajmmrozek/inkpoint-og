import { useEffect, useMemo, useRef, useState } from 'react';
import { XCircle, Loader2, ChevronRight, ChevronDown, Bot } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Jedyny dymek statusu dla całej tury rozmowy — zamiast wielu bloków technicznych.
// Podczas pracy: aktualizujący się status ("Pracuję · …"). Po sukcesie: zielone "OK".
// Po błędzie: klikalny dymek ujawniający krótki opis i numer błędu.
// Surowe dane narzędzi (argumenty, wyniki, payloady) nigdy nie trafiają do interfejsu —
// szczegóły błędu zapisujemy wyłącznie w logach (reportClientError) pod numerem błędu.

const TOOL_LABELS = {
  booking: 'Sesje', client: 'Klienci', artist: 'Artysta', service: 'Usługi', promotion: 'Voucher / zniżka',
  artistavailability: 'Dyspozycje', healthform: 'Ankieta zdrowotna', changerequest: 'Prośba o zmianę',
  contactmessage: 'Wiadomości', feedback: 'Opinie', notification: 'Powiadomienia',
  artistcommissionhistory: 'Stawki artystów', userlog: 'Log aktywności', user: 'Użytkownicy',
  gatekeepermemory: 'Pamięć Gatekeepera',
  gatekeeperops: 'Zarządzanie danymi',
  artistgatekeeperops: 'Zarządzanie danymi',
  managepromotion: 'Voucher / zniżka',
  managegooglecalendar: 'Kalendarz Google',
};

function toolLabel(name = '') {
  const key = String(name).toLowerCase().replace(/_/g, '');
  const found = Object.keys(TOOL_LABELS).find((k) => key.includes(k));
  return found ? TOOL_LABELS[found] : 'Dane';
}

const isFailed = (tc) => ['failed', 'error'].includes(tc?.status || '');
const isRunning = (tc) => ['pending', 'running', 'in_progress'].includes(tc?.status || '');

const redact = (s) =>
  String(s || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[numer]')
    .replace(/(token|password|secret|key)[^\s&]*/gi, '[ukryte]');

// Deterministyczny numer błędu — stabilny między renderami i po odświeżeniu
function errorIdFrom(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'BŁ-' + h.toString(16).toUpperCase().padStart(6, '0');
}

// Krótki, bezpieczny opis błędu — bez payloadów, stack trace'ów i danych klientów
function errorDescription(tc) {
  const proj = tc?.display_projection;
  if (proj?.error_label) return redact(proj.error_label).slice(0, 140);
  let r = tc?.results;
  try {
    const p = typeof r === 'string' ? JSON.parse(r) : r;
    if (p && typeof p === 'object') r = p.error || p.message || '';
  } catch {}
  const text = redact(r).slice(0, 140).trim();
  return text || 'Operacja nie powiodła się';
}

const AVATAR = {
  width: '26px', height: '26px', borderRadius: 'var(--radius)', background: 'var(--brand)',
  color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

export default function TurnStatusBubble({ toolCalls, t, seed }) {
  const [open, setOpen] = useState(false);
  const reportedRef = useRef(false);

  const errorId = useMemo(() => errorIdFrom(seed), [seed]);
  const failed = toolCalls.find(isFailed);
  const running = [...toolCalls].reverse().find(isRunning);
  const status = failed ? 'error' : running ? 'working' : 'ok';



  // Pełne szczegóły błędu — tylko do logów i konsoli przeglądarki, nigdy do interfejsu
  useEffect(() => {
    if (status !== 'error' || reportedRef.current) return;
    reportedRef.current = true;
    console.error(`[Gatekeeper] Błąd ${errorId} (${failed?.name || 'nieznane narzędzie'})`, failed?.results || '');
    base44.functions.invoke('reportClientError', {
      session_id: `gk-${errorId}`,
      kind: 'error',
      message: `Błąd ${errorId} — narzędzie ${failed?.name || 'nieznane'}`,
      stack: redact(String(failed?.results ?? '')).slice(0, 1000) || '(brak szczegółów)',
    }).catch(() => {});
  }, [status, errorId, failed]);

  // Po sukcesie nie pokazujemy dymka z zielonym "OK" — wystarczy sama odpowiedź.
  // Dymek zostaje tylko w trakcie pracy ("Pracuję · …") i przy błędzie.
  if (status === 'ok') return null;

  const chip = {
    display: 'flex', alignItems: 'center', gap: '7px', width: 'fit-content',
    padding: '7px 12px',
    background: 'rgba(128,128,128,0.05)',
    border: `0.5px solid ${status === 'error' ? 'rgba(239,68,68,0.45)' : t.border}`,
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em',
    textTransform: 'uppercase', cursor: status === 'error' ? 'pointer' : 'default',
    color: status === 'error' ? '#ef4444' : status === 'working' ? t.muted : '#16a34a',
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <span style={AVATAR}><Bot size={15} /></span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '82%' }}>
        <div style={chip} onClick={() => status === 'error' && setOpen((o) => !o)}>
          {status === 'error' ? (
            <XCircle size={11} color="#ef4444" />
          ) : (
            <Loader2 size={11} className="animate-spin" style={{ color: 'var(--brand)' }} />
          )}
          <span>
            {status === 'error' ? 'Wystąpił błąd' : `Pracuję · ${toolLabel(running?.name)}`}
          </span>
          {status === 'error' && (open ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
        </div>
        {open && status === 'error' && (
          <div style={{ padding: '10px 12px', background: 'rgba(128,128,128,0.05)', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.5, margin: 0 }}>{errorDescription(failed)}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, margin: '6px 0 0', letterSpacing: '0.05em', textTransform: 'none' }}>
              Numer błędu: <span style={{ color: 'var(--brand)' }}>{errorId}</span> — przekaż go administratorowi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}