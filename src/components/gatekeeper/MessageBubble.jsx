import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle2, XCircle, Loader2, ChevronRight, ChevronDown } from 'lucide-react';

const TOOL_LABELS = {
  booking: 'Sesje', client: 'Klienci', artist: 'Artysta', service: 'Usługi', promotion: 'Voucher / zniżka',
  artistavailability: 'Dyspozycje', healthform: 'Ankieta zdrowotna', changerequest: 'Prośba o zmianę',
  contactmessage: 'Wiadomości', feedback: 'Opinie', notification: 'Powiadomienia',
  artistcommissionhistory: 'Stawki artystów', userlog: 'Log aktywności', user: 'Użytkownicy',
};

function toolLabel(name = '') {
  const key = name.toLowerCase().replace(/_/g, '');
  const found = Object.keys(TOOL_LABELS).find(k => key.includes(k));
  return found ? TOOL_LABELS[found] : name;
}

function FunctionDisplay({ toolCall, t }) {
  const [open, setOpen] = useState(false);
  const status = toolCall.status || 'pending';
  const failed = status === 'failed' || status === 'error';
  const running = ['pending', 'running', 'in_progress'].includes(status);
  const proj = toolCall.display_projection;
  const hide = proj?.hide_details && proj?.details_redacted;

  const statusText = failed
    ? (proj?.error_label || 'Błąd')
    : running
      ? (proj?.active_label || 'Sprawdzam...')
      : (proj?.label || 'Gotowe');

  let params = null;
  let results = null;
  try { params = toolCall.arguments_string ? JSON.parse(toolCall.arguments_string) : null; } catch { params = toolCall.arguments_string; }
  try {
    results = typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results;
  } catch { results = toolCall.results; }

  return (
    <div className="mb-1.5" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', background: 'rgba(128,128,128,0.05)' }}>
      <button
        onClick={() => !hide && setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left"
        style={{ cursor: hide ? 'default' : 'pointer' }}
      >
        {failed ? <XCircle size={11} color="#ef4444" /> : running ? <Loader2 size={11} className="animate-spin" color="var(--brand)" /> : <CheckCircle2 size={11} color="#16a34a" />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: failed ? '#ef4444' : t.muted }}>
          {toolLabel(toolCall.name)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: failed ? '#ef4444' : t.muted, opacity: 0.8 }}>
          · {statusText}
        </span>
        {!hide && (open ? <ChevronDown size={11} color={t.muted} /> : <ChevronRight size={11} color={t.muted} />)}
      </button>
      {open && !hide && (
        <div className="px-2.5 pb-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
          {params && (
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, margin: '6px 0 4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(params, null, 1)}
            </pre>
          )}
          {results != null && (
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, margin: '4px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '160px', overflow: 'auto' }}>
              {JSON.stringify(results, null, 1)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, t }) {
  const isUser = message.role === 'user';
  return (
    <div className="flex gap-2 mb-3" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <span style={{ width: '26px', height: '26px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>G</span>
      )}
      <div style={{ maxWidth: '82%' }}>
        {!isUser && (message.tool_calls || []).map((tc, i) => <FunctionDisplay key={i} toolCall={tc} t={t} />)}
        {message.content && (
          <div
            className="px-3 py-2"
            style={{
              background: isUser ? 'rgb(var(--brand-rgb) / 0.12)' : 'rgba(128,128,128,0.06)',
              border: `0.5px solid ${isUser ? 'rgb(var(--brand-rgb) / 0.3)' : t.border}`,
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              lineHeight: 1.55,
              color: t.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {isUser ? message.content : <ReactMarkdown>{message.content}</ReactMarkdown>}
          </div>
        )}
      </div>
    </div>
  );
}