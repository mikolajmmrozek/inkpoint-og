import { useEffect, useMemo, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TurnStatusBubble from './TurnStatusBubble';

export default function ChatThread({ t, loading, error, messages, isResponding, showSuggestions, suggestions, onRetry, onSuggestion }) {
  const scrollRef = useRef(null);

  // Grupujemy wiadomości w tury (odpowiedzi na jedną wiadomość użytkownika):
  // jedna tura = jeden dymek statusu zamiast osobnych bloków technicznych
  const turns = useMemo(() => {
    const list = [];
    let current = null;
    messages.forEach((m) => {
      if (m.role === 'user') {
        current = { user: m, assistant: [], toolCalls: [], key: `turn-${list.length}` };
        list.push(current);
      } else {
        if (!current) {
          current = { user: null, assistant: [], toolCalls: [], key: `turn-${list.length}` };
          list.push(current);
        }
        if (String(m.content || '').trim()) current.assistant.push(m);
        (m.tool_calls || []).forEach((tc) => current.toolCalls.push(tc));
      }
    });
    return list;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wczytuję rozmowę...</p>
        </div>
      ) : error && messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5 }}>{error}</p>
          <button onClick={onRetry} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', border: '0.5px solid var(--brand)', background: 'transparent', padding: '7px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
            <RefreshCw size={11} /> SPRÓBUJ PONOWNIE
          </button>
        </div>
      ) : (
        <>
          {turns.map((turn) => (
            <div key={turn.key}>
              {turn.user && <MessageBubble message={turn.user} t={t} />}
              {turn.assistant.map((m, i) => <MessageBubble key={i} message={m} t={t} />)}
              {turn.toolCalls.length > 0 && <TurnStatusBubble toolCalls={turn.toolCalls} t={t} seed={turn.key} />}
            </div>
          ))}
          {isResponding && (
            <div className="flex items-center gap-2 mb-3">
              <span style={{ width: '26px', height: '26px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700 }}>G</span>
              <span style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(128,128,128,0.06)', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                {[0, 1, 2].map(d => <span key={d} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--brand)', opacity: 1 - d * 0.25, animation: `pulse 1.2s ${d * 0.2}s infinite` }} />)}
              </span>
            </div>
          )}
          {showSuggestions && (
            <div className="flex flex-col gap-1.5 mt-1">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>POPULARNE PYTANIA</p>
              {suggestions.map(s => (
                <button key={s} onClick={() => onSuggestion(s)} className="text-left" style={{ fontSize: '12px', color: t.text, background: 'rgba(128,128,128,0.05)', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '8px 12px', cursor: 'pointer', lineHeight: 1.4 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {error && messages.length > 0 && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{error}</p>
          )}
        </>
      )}
    </div>
  );
}