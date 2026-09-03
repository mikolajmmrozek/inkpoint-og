import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import BookingCard from '@/components/dashboard/BookingCard';
import MessageContent from '@/components/panel/MessageContent';
import AttachmentBar from '@/components/panel/AttachmentBar';

export default function PanelMessages({ theme, userEmail, userName, roleLabel }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)', bubbleBg: 'rgba(0,0,0,0.04)', adminBubble: 'var(--brand)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)', bubbleBg: 'rgba(255,255,255,0.04)', adminBubble: 'var(--brand)' };

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const messagesEndRef = useRef(null);

  const load = async () => {
    try {
      const data = await base44.entities.ContactMessage.filter({ email: userEmail }, 'created_date', 200);
      setMessages(data);
    } catch (e) {
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.ContactMessage.subscribe((event) => {
      if (!event.data || (event.data.email || '').toLowerCase() !== (userEmail || '').toLowerCase()) return;
      if (event.type === 'create') {
        setMessages(prev => prev.some(m => m.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [userEmail]);

  // Sprawdź czy klient jest zablokowany (tylko rola KLIENT)
  const [isBlocked, setIsBlocked] = useState(false);
  useEffect(() => {
    if (roleLabel !== 'KLIENT') return;
    base44.entities.Client.filter({ email: userEmail }, '-created_date', 1)
      .then(res => setIsBlocked(!!res[0]?.is_blocked))
      .catch(() => {});
  }, [userEmail, roleLabel]);

  // Polling fallback — refresh every 30 seconds in case WebSocket misses events
  useEffect(() => {
    const interval = setInterval(() => {
      base44.entities.ContactMessage.filter({ email: userEmail }, 'created_date', 200)
        .then(data => setMessages(data))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [userEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!replyText.trim()) return;
    if (isBlocked) {
      alert('Nie udało się wysłać wiadomości. Spróbuj ponownie później.');
      return;
    }
    setSending(true);
    try {
      await base44.entities.ContactMessage.create({
        name: userName,
        email: userEmail,
        message: replyText,
        sender_type: 'client',
        message_type: 'text',
        subject: roleLabel,
        is_read: false,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });
      setReplyText('');
      setPendingAttachments([]);
      await load();
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          KONTAKT ZE STUDIEM
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.text, lineHeight: 1, letterSpacing: '0.04em' }}>
          Wiadomości
        </h2>
      </div>

      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, display: 'flex', flexDirection: 'column', minHeight: '60vh', maxHeight: '70vh' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare size={24} color={t.muted} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', color: t.muted, lineHeight: 1.6 }}>
                Nie masz jeszcze wiadomości.<br />Napisz do nas, aby rozpocząć rozmowę.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_type === 'client';
              const isBookingCard = msg.message_type === 'booking_card';
              const isStatusChange = msg.message_type === 'status_change';

              if (isBookingCard) {
                return (
                  <div key={msg.id} className="flex flex-col items-center">
                    <BookingCard bookingId={msg.booking_id} t={t} theme={theme} readOnly />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '4px' }}>
                      {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                    </p>
                  </div>
                );
              }

              if (isStatusChange) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div style={{ background: 'rgb(var(--brand-rgb) /0.06)', border: `0.5px solid rgb(var(--brand-rgb) /0.2)`, padding: '10px 16px', maxWidth: '80%', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        STATUS REZERWACJI
                      </p>
                      <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.5 }}>{msg.message}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '6px' }}>
                        {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      padding: '10px 14px',
                      background: isMe ? t.adminBubble : t.bubbleBg,
                      color: isMe ? '#F5F0EB' : t.text,
                      borderRadius: '2px',
                    }}>
                      <MessageContent message={msg} t={t} isAdmin={isMe} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                      {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <AttachmentBar attachments={pendingAttachments} setAttachments={setPendingAttachments} t={t} />
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Napisz wiadomość..."
              style={{ flex: 1, background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '120px' }}
              onFocus={e => e.target.style.borderColor = t.fuchsia}
              onBlur={e => e.target.style.borderColor = t.border}
            />
            <button
              onClick={send}
              disabled={sending || !replyText.trim()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'linear-gradient(135deg, var(--brand), var(--brand))', border: 'none', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer', opacity: sending || !replyText.trim() ? 0.4 : 1 }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" color="#F5F0EB" /> : <Send size={14} color="#F5F0EB" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}