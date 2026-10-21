import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2, Bot, RefreshCw, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MessageBubble from './MessageBubble';
import GatekeeperMemoryPanel from './GatekeeperMemoryPanel';

const SUGGESTIONS = [
  'Co potrafisz? Opisz swoje funkcje',
  'Kto i kiedy utworzył sesję SES-…?',
  'Jaki był przychód artysty … w tym miesiącu?',
  'Ile transakcji zapłacono kartą w tym miesiącu?',
  'Dodaj voucher na 500 zł ważny 3 miesiące',
];

const THEME = {
  light: { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)' },
  dark: { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)' },
};

export default function GatekeeperChat({ theme = 'dark', onClose }) {
  const t = THEME[theme === 'light' ? 'light' : 'dark'];
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [view, setView] = useState('chat'); // 'chat' | 'memory'
  const scrollRef = useRef(null);
  const convRef = useRef(null);

  useEffect(() => {
    let active = true;
    base44.agents.createConversation({ agent_name: 'Gatekeeper', metadata: { name: 'Gatekeeper' } })
      .then(c => { if (active) { convRef.current = c; setConversation(c); setMessages(c.messages || []); } })
      .catch(() => active && setError('Nie udało się uruchomić asystenta. Spróbuj ponownie.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [conversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation) return;
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content }]);
    try {
      await base44.agents.addMessage(convRef.current || conversation, { role: 'user', content });
    } catch {
      setError('Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    }
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    base44.agents.createConversation({ agent_name: 'Gatekeeper', metadata: { name: 'Gatekeeper' } })
      .then(c => { convRef.current = c; setConversation(c); setMessages(c.messages || []); })
      .catch(() => setError('Nie udało się uruchomić asystenta. Spróbuj ponownie.'))
      .finally(() => setLoading(false));
  };

  const isResponding = messages.length > 0 && messages[messages.length - 1].role === 'user';
  const showSuggestions = !loading && !error && messages.filter(m => m.role === 'user').length === 0;

  return (
    <div className="fixed inset-0 z-[62] flex items-end justify-center sm:items-end sm:justify-end p-3 sm:p-5" style={{ pointerEvents: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col w-full sm:max-w-md"
        style={{
          pointerEvents: 'auto',
          height: 'min(620px, 78vh)',
          background: t.bg,
          border: `0.5px solid ${t.border}`,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <div className="flex items-center gap-2.5">
            <span style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} />
            </span>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: t.text, letterSpacing: '0.06em', lineHeight: 1 }}>GATEKEEPER</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Asystent AI · tylko administrator</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView(v => v === 'memory' ? 'chat' : 'memory')}
              title="Pamięć Gatekeepera"
              aria-label="Pamięć Gatekeepera"
              style={{
                background: view === 'memory' ? 'rgb(var(--brand-rgb) / 0.1)' : 'none',
                border: `0.5px solid ${view === 'memory' ? 'var(--brand)' : 'transparent'}`,
                cursor: 'pointer', color: view === 'memory' ? 'var(--brand)' : t.muted,
                padding: '5px', borderRadius: 'var(--radius)',
              }}
            >
              <Brain size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }} aria-label="Zamknij">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pamięć — panel z historią zmian (właściciel platformy widzi wszystkie studia) */}
        {view === 'memory' && <GatekeeperMemoryPanel theme={theme} />}

        {/* Messages */}
        {view === 'chat' && <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Uruchamiam Gatekeepera...</p>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5 }}>{error}</p>
              <button onClick={retry} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', border: '0.5px solid var(--brand)', background: 'transparent', padding: '7px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                <RefreshCw size={11} /> SPRÓB PONOWNIE
              </button>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <MessageBubble key={i} message={m} t={t} />)}
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
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-left" style={{ fontSize: '12px', color: t.text, background: 'rgba(128,128,128,0.05)', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '8px 12px', cursor: 'pointer', lineHeight: 1.4 }}
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
        </div>}

        {/* Input */}
        {view === 'chat' && <div className="px-3 py-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Napisz do Gatekeepera..."
              rows={1}
              disabled={loading || !!error}
              style={{ flex: 1, resize: 'none', background: 'transparent', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', color: t.text, padding: '10px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)', maxHeight: '110px', opacity: loading || error ? 0.5 : 1 }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || isResponding}
              style={{ width: '40px', height: '40px', flexShrink: 0, background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading || isResponding ? 0.4 : 1 }}
              aria-label="Wyślij"
            >
              <Send size={15} />
            </button>
          </div>
        </div>}
      </motion.div>
    </div>
  );
}