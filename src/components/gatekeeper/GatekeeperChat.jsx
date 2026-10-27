import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, Brain, History, Plus, Paperclip, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ChatThread from './ChatThread';
import ChatHistoryPanel, { convTitle } from './ChatHistoryPanel';
import GatekeeperMemoryPanel from './GatekeeperMemoryPanel';
import VoiceRecorder from './VoiceRecorder';

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

const byUpdatedDesc = (a, b) => (b.updated_date || b.created_date || '').localeCompare(a.updated_date || a.created_date || '');

export default function GatekeeperChat({ theme = 'dark', onClose, agentName = 'Gatekeeper', conversationToolName = 'manageConversation', suggestions = SUGGESTIONS, showMemory = true, allowAttachments = true, logger = null, subtitle = 'Gatekeeper · Asystent AI' }) {
  const t = THEME[theme === 'light' ? 'light' : 'dark'];
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null); // aktywna rozmowa (pełny obiekt)
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null); // { name, url } — media przesłane przez admina
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' | 'history' | 'memory'
  const [voiceState, setVoiceState] = useState('idle'); // idle | recording | processing
  const convRef = useRef(null);
  const fileInputRef = useRef(null);

  const patchConversation = useCallback((conv) => {
    setConversation(conv);
    convRef.current = conv;
    setMessages(conv?.messages || []);
  }, []);

  // Historia jest przypisana do zalogowanego użytkownika (created_by_id) —
  // każdy admin widzi wyłącznie własne rozmowy, nic się nie przecina.
  const loadMyChats = useCallback(async () => {
    const me = await base44.auth.me();
    const list = ((await base44.agents.listConversations({ agent_name: agentName })) || [])
      .filter(c => c.created_by_id === me.id && !c.metadata?.archived)
      .sort(byUpdatedDesc);
    setConversations(list);
    return list;
  }, []);

  // Start: wczytaj historię rozmów i otwórz ostatnią; brak — nowa rozmowa
  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const list = await loadMyChats();
        if (!active) return;
        const last = list[0];
        if (last) {
          const full = await base44.agents.getConversation(last.id);
          if (active) patchConversation(full);
        } else {
          const c = await base44.agents.createConversation({ agent_name: agentName, metadata: { name: 'Nowa rozmowa' } });
          if (active) {
            setConversations([c]);
            patchConversation(c);
          }
        }
      } catch {
        if (active) setError('Nie udało się uruchomić asystenta. Spróbuj ponownie.');
      } finally {
        if (active) setLoading(false);
      }
    };
    start();
    return () => { active = false; };
  }, [loadMyChats, patchConversation]);

  // Subskrypcja aktywnej rozmowy
  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [conversation]);

  const newChat = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const c = await base44.agents.createConversation({ agent_name: agentName, metadata: { name: 'Nowa rozmowa' } });
      setConversations(prev => [c, ...prev]);
      patchConversation(c);
      setView('chat');
    } catch {
      setError('Nie udało się utworzyć rozmowy. Spróbuj ponownie.');
    } finally {
      setCreating(false);
    }
  };

  const openConversation = async (id) => {
    if (id === conversation?.id) { setView('chat'); return; }
    setLoading(true);
    setError(null);
    try {
      const c = await base44.agents.getConversation(id);
      patchConversation(c);
      setView('chat');
    } catch {
      setError('Nie udało się otworzyć rozmowy. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  // Dołączanie zdjęcia/pliku do rozmowy — admin przesyła, Gatekeeper używa URL-a tam, gdzie wskaże
  const attachFile = async (file) => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      setAttachment({ name: file.name || 'plik', url: res?.file_url });
    } catch {
      setError('Nie udało się przesłać pliku. Spróbuj ponownie.');
    } finally {
      setUploading(false);
    }
  };

  const send = async (text, voice) => {
    const base = (text ?? input).trim();
    const content = voice?.content ?? (attachment ? `${base}\n\n[Załącznik: ${attachment.url}]` : base);
    if (!content.trim() || !conversation) return;
    if (!voice) setAttachment(null);
    const isFirstMessage = !messages.some(m => m.role === 'user');
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content }]);
    if (isFirstMessage) {
      // Rozmowa dostaje automatyczną nazwę z pierwszej wiadomości użytkownika
      const autoNameSrc = (voice ? 'Wiadomość głosowa' : (base || 'Załącznik')).replace(/\s+/g, ' ');
      const autoName = autoNameSrc.slice(0, 42) + (autoNameSrc.length > 42 ? '…' : '');
      setConversations(prev => prev.map(c => c.id === conversation.id
        ? { ...c, metadata: { ...(c.metadata || {}), name: autoName } }
        : c));
      base44.functions.invoke(conversationToolName, { conversation_id: conversation.id, action: 'rename', name: autoName }).catch(() => {});
    }
    // odśwież tytuł i kolejność na liście historii
    setConversations(prev => {
      const updated = prev.map(c => c.id === conversation.id
        ? { ...c, updated_date: new Date().toISOString(), messages: [...(c.messages || []), { role: 'user', content }] }
        : c);
      return updated.sort(byUpdatedDesc);
    });
    try {
      await base44.agents.addMessage(convRef.current || conversation, { role: 'user', content });
    } catch {
      setError('Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    }
  };

  // Wiadomość głosowa (jak na WhatsApp): nagranie analizuje się automatycznie
  // i trafia prosto do rozmowy razem z transkrypcją — bez ręcznego wysyłania
  const sendVoice = ({ url, transcript, duration }) => {
    send(null, { content: `[Wiadomość głosowa](${url})${duration ? ` [${duration}]` : ''}${transcript ? `\n\n${transcript}` : ''}` });
  };

  const retry = async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await loadMyChats();
      const last = list[0];
      if (last) patchConversation(await base44.agents.getConversation(last.id));
      else patchConversation(await base44.agents.createConversation({ agent_name: agentName, metadata: { name: 'Nowa rozmowa' } }));
    } catch {
      setError('Nie udało się uruchomić asystenta. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  // Zmiana nazwy rozmowy (zapisywana w metadanych rozmowy)
  const renameConversation = async (id, name) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, metadata: { ...(c.metadata || {}), name } } : c));
    try {
      await base44.functions.invoke(conversationToolName, { conversation_id: id, action: 'rename', name });
    } catch {
      setError('Nie udało się zmienić nazwy rozmowy. Spróbuj ponownie.');
    }
  };

  // Usunięcie rozmowy z historii (archiwizacja) + przełączenie na inną
  const removeConversation = async (id) => {
    const rest = conversations.filter(c => c.id !== id);
    setConversations(rest);
    try {
      await base44.functions.invoke(conversationToolName, { conversation_id: id, action: 'archive' });
      if (conversation?.id === id) {
        if (rest[0]) patchConversation(await base44.agents.getConversation(rest[0].id));
        else patchConversation(await base44.agents.createConversation({ agent_name: agentName, metadata: { name: 'Nowa rozmowa' } }));
      }
    } catch {
      setError('Nie udało się usunąć rozmowy. Spróbuj ponownie.');
    }
  };

  const isResponding = messages.length > 0 && messages[messages.length - 1].role === 'user';

  // Po zakończeniu odpowiedzi asystenta odśwież metadane rozmowy (np. nazwę zmienioną przez Gatekeepera)
  const wasRespondingRef = useRef(false);
  useEffect(() => {
    if (wasRespondingRef.current && !isResponding && conversation?.id) {
      base44.agents.getConversation(conversation.id).then(c => {
        if (!c?.id) return;
        setConversations(prev => prev.map(x => x.id === c.id ? { ...x, metadata: c.metadata } : x));
        setConversation(prev => prev?.id === c.id ? { ...prev, metadata: c.metadata } : prev);
      }).catch(() => {});
      // Log obserwacyjny (np. Gatekeeper artysty) — serwer anonimizuje dane klientów przed zapisem
      if (logger) {
        let lastUserIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === 'user') { lastUserIdx = i; break; } }
        if (lastUserIdx >= 0) {
          const after = messages.slice(lastUserIdx + 1).filter(m => m.role === 'assistant');
          const toolCalls = after.flatMap(m => m.tool_calls || []);
          const userMsg = messages[lastUserIdx];
          const assistantText = after.map(m => m.content || '').join('\n').trim();
          if (userMsg.content || assistantText || toolCalls.length) {
            logger({
              conversation_id: conversation.id,
              conversation_name: conversation.metadata?.name || '',
              user_message: userMsg.content || '',
              assistant_message: assistantText,
              tool_calls: toolCalls.map(tc => ({ name: tc.name, status: tc.status, arguments: tc.arguments_string, result: typeof tc.results === 'string' ? tc.results : (tc.results ? JSON.stringify(tc.results) : '') })),
            }).catch(() => {});
          }
        }
      }
    }
    wasRespondingRef.current = isResponding;
  }, [isResponding, conversation]);
  const showSuggestions = !loading && !error && messages.filter(m => m.role === 'user').length === 0;

  const headerBtn = (active) => ({
    background: active ? 'rgb(var(--brand-rgb) / 0.1)' : 'none',
    border: `0.5px solid ${active ? 'var(--brand)' : 'transparent'}`,
    cursor: 'pointer', color: active ? 'var(--brand)' : t.muted,
    padding: '5px', borderRadius: 'var(--radius)',
  });

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
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} />
            </span>
            <div className="min-w-0">
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: t.text, letterSpacing: '0.06em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view === 'chat' && conversation ? convTitle(conversation) : view === 'memory' ? 'PAMIĘĆ' : 'HISTORIA ROZMÓW'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={newChat} disabled={creating} title="Nowa rozmowa" aria-label="Nowa rozmowa" style={{ ...headerBtn(false), opacity: creating ? 0.5 : 1 }}>
              <Plus size={16} />
            </button>
            <button
              onClick={() => setView(v => v === 'history' ? 'chat' : 'history')}
              title="Historia rozmów"
              aria-label="Historia rozmów"
              style={headerBtn(view === 'history')}
            >
              <History size={16} />
            </button>
            {showMemory && (
              <button
                onClick={() => setView(v => v === 'memory' ? 'chat' : 'memory')}
                title="Pamięć Gatekeepera"
                aria-label="Pamięć Gatekeepera"
                style={headerBtn(view === 'memory')}
              >
                <Brain size={16} />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }} aria-label="Zamknij">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pamięć — panel z historią zmian (właściciel platformy widzi wszystkie studia) */}
        {view === 'memory' && showMemory && <GatekeeperMemoryPanel theme={theme} />}

        {/* Historia rozmów */}
        {view === 'history' && (
          <ChatHistoryPanel t={t} conversations={conversations} activeId={conversation?.id} onSelect={openConversation} onNew={newChat} creating={creating} onRename={renameConversation} onDelete={removeConversation} />
        )}

        {/* Aktywna rozmowa */}
        {view === 'chat' && (
          <ChatThread t={t} loading={loading} error={error} messages={messages} isResponding={isResponding} showSuggestions={showSuggestions} suggestions={suggestions} onRetry={retry} onSuggestion={send} />
        )}
        {view === 'chat' && <div className="px-3 py-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
          {attachment && (
            <div className="flex items-center justify-between mb-2" style={{ padding: '6px 10px', background: 'rgb(var(--brand-rgb) / 0.08)', border: '0.5px solid var(--brand)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: '11px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.name}
              </span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, display: 'flex', padding: '2px' }} aria-label="Usuń załącznik">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="file"
              accept="image/*,.pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = ''; }}
            />
            {allowAttachments && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading || !!error}
                title="Dołącz zdjęcie lub PDF"
                aria-label="Dołącz zdjęcie lub PDF"
                style={{ width: '40px', height: '40px', flexShrink: 0, background: 'transparent', color: uploading ? 'var(--brand)' : t.muted, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
              </button>
            )}
            <VoiceRecorder
              t={t}
              disabled={loading || !!error || isResponding || uploading}
              onStateChange={setVoiceState}
              onVoice={sendVoice}
            />
            {voiceState === 'idle' && (<>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Napisz do Gatekeepera..."
              rows={1}
              disabled={loading || !!error}
              style={{ flex: 1, resize: 'none', background: 'transparent', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', color: t.text, padding: '10px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-body)', maxHeight: '110px', opacity: loading || error ? 0.5 : 1 }}
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && !attachment) || loading || isResponding || uploading}
              style={{ width: '40px', height: '40px', flexShrink: 0, background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() && !attachment) || loading || isResponding || uploading ? 0.4 : 1 }}
              aria-label="Wyślij"
            >
              <Send size={15} />
            </button>
            </>)}
          </div>
        </div>}
      </motion.div>
    </div>
  );
}