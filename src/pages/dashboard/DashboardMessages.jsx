import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Send, ArrowLeft, Mail, MailOpen, Loader2, Search, X, Plus } from 'lucide-react';
import NewMessageModal from '@/components/dashboard/NewMessageModal';
import MessageContent from '@/components/panel/MessageContent';
import AttachmentBar from '@/components/panel/AttachmentBar';
import { useTheme } from './Dashboard';
import { format } from 'date-fns';
import BookingCard from '@/components/dashboard/BookingCard';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { useLocation } from 'react-router-dom';

export default function DashboardMessages() {
  const { theme } = useTheme();
  const location = useLocation();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', fuchsia: 'var(--brand)', hover: 'rgba(0,0,0,0.03)', cardBg: '#FFFFFF', bubbleBg: 'rgba(0,0,0,0.06)', adminBubble: 'var(--brand)' }
    : { bg: 'rgba(24,24,24,0.95)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', fuchsia: 'var(--brand)', hover: 'rgba(255,255,255,0.05)', cardBg: 'transparent', bubbleBg: 'rgba(255,255,255,0.06)', adminBubble: 'var(--brand)' };

  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Check URL for email parameter from notification and auto-select
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    if (email) {
      // Normalize email to match thread format (lowercase, trimmed)
      const normalizedEmail = (email || '').toLowerCase().trim();
      setSelectedEmail(normalizedEmail);
    }
  }, [location.search]);

  // Mark thread as read when selectedEmail changes and scroll to bottom
  useEffect(() => {
    if (selectedEmail && allMessages.length > 0) {
      markThreadRead(selectedEmail);
      setTimeout(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 150);
    }
  }, [selectedEmail, allMessages.length]);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const messagesEndRef = useRef(null);

  const load = async () => {
    const data = await base44.entities.ContactMessage.list('-created_date', 200);
    setAllMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Realtime subscription — live updates when new messages arrive
    const unsubscribe = base44.entities.ContactMessage.subscribe((event) => {
      if (event.type === 'create') {
        setAllMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      } else if (event.type === 'update') {
        setAllMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setAllMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Polling fallback — refresh every 2 minutes in case WebSocket misses events
  useEffect(() => {
    const interval = setInterval(() => {
      base44.entities.ContactMessage.list('-created_date', 200)
        .then(data => setAllMessages(data))
        .catch(() => {});
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // Group messages by email to form threads
  const threads = (() => {
    const grouped = {};
    allMessages.forEach(msg => {
      const key = (msg.email || '').toLowerCase().trim();
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(msg);
    });
    return Object.entries(grouped).map(([email, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const latest = [...msgs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      return {
        email,
        messages: sorted,
        lastMessage: latest,
        unreadCount: msgs.filter(m => !m.is_read && m.sender_type !== 'admin').length,
        clientName: msgs.find(m => m.sender_type === 'client')?.name || msgs[0].name,
        phone: msgs[0].phone,
      };
    }).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  })();

  const filteredThreads = searchQuery.trim()
    ? threads.filter(th => {
        const q = searchQuery.toLowerCase().trim();
        return (th.clientName || '').toLowerCase().includes(q) ||
               (th.email || '').toLowerCase().includes(q) ||
               (th.phone || '').toLowerCase().includes(q) ||
               th.messages.some(m =>
                 (m.message || '').toLowerCase().includes(q) ||
                 (m.subject || '').toLowerCase().includes(q) ||
                 (m.name || '').toLowerCase().includes(q)
               );
      })
    : threads;

  const selectedThread = threads.find(th => th.email === selectedEmail);

  const markThreadRead = async (email) => {
    const thread = threads.find(th => th.email === email);
    if (!thread) return;
    const unread = thread.messages.filter(m => !m.is_read);
    if (unread.length > 0) {
      setAllMessages(msgs => msgs.map(m => unread.find(u => u.id === m.id) ? { ...m, is_read: true } : m));
      await Promise.all(unread.map(m => base44.entities.ContactMessage.update(m.id, { is_read: true })));
    }
  };

  const handleSelectThread = (email) => {
    const normalizedEmail = (email || '').toLowerCase().trim();
    setSelectedEmail(normalizedEmail);
    markThreadRead(normalizedEmail);
    setTimeout(() => {
      const container = messagesEndRef.current?.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 150);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedEmail) return;
    setSending(true);
    const thread = threads.find(th => th.email === selectedEmail);
    try {
      await base44.entities.ContactMessage.create({
        name: 'Romans Tattoo',
        email: selectedEmail,
        phone: thread?.phone || '',
        message: replyText,
        sender_type: 'admin',
        message_type: 'text',
        is_read: true,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });
      // Send email notification to client
      try {
        await base44.functions.invoke('sendEmailViaResend', {
          to: selectedEmail,
          subject: 'Wiadomość od Romans Tattoo',
          body: replyText,
        });
      } catch (e) {
        console.warn('Email notification failed:', e);
      }
      setReplyText('');
      setPendingAttachments([]);
      await load();
    } catch (e) {
      console.error('Reply failed:', e);
    } finally {
      setSending(false);
    }
  };

  const deleteThread = async (email) => {
    const thread = threads.find(th => th.email === email);
    if (!thread) return;
    await Promise.all(thread.messages.map(m => base44.entities.ContactMessage.delete(m.id)));
    setAllMessages(msgs => msgs.filter(m => (m.email || '').toLowerCase() !== email));
    if (selectedEmail === email) setSelectedEmail(null);
    setDeleteConfirm(null);
  };

  const onBookingAction = () => {
    load();
  };

  const getMessagePreview = (msg) => {
    if (msg.message_type === 'booking_card') return '🎫 Nowa rezerwacja';
    if (msg.message_type === 'status_change') return '🔄 Zmiana statusu rezerwacji';
    if (msg.attachments && msg.attachments.length > 0) return `📎 ${msg.attachments.length} załącznik(ów)`;
    return (msg.sender_type === 'admin' ? 'Ty: ' : '') + (msg.message || '').slice(0, 60);
  };

  // ============ RENDER ============
  return (
    <div>
      {/* Search bar + new message */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} color={t.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj po imieniu, emailu, telefonie, treści wiadomości..."
            style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '12px 14px 12px 38px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = t.fuchsia}
            onBlur={e => e.target.style.borderColor = t.border}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setShowNewMessage(true)} className="flex items-center gap-2 btn-oxblood flex-shrink-0" style={{ padding: '10px 16px' }}>
          <Plus size={13} /> NOWA WIADOMOŚĆ
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Thread List */}
        <div className={`lg:col-span-2 ${selectedEmail ? 'hidden lg:block' : 'block'}`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, minHeight: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
                 BRAK WIADOMOŚCI
               </p>
            </div>
          ) : filteredThreads.map((th, i) => (
            <div
              key={th.email}
              className="flex items-center gap-3 p-4 cursor-pointer transition-colors hover:opacity-70"
              style={{ borderBottom: i < filteredThreads.length - 1 ? `0.5px solid ${t.border}` : 'none', borderLeft: selectedEmail === th.email ? `3px solid ${t.fuchsia}` : '3px solid transparent', background: selectedEmail === th.email ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', paddingLeft: '13px' }}
              onClick={() => handleSelectThread(th.email)}
            >
              <div className="flex-shrink-0">
                {th.unreadCount > 0 ? (
                  <Mail size={14} color={t.fuchsia} />
                ) : (
                  <MailOpen size={14} color={t.muted} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ color: th.unreadCount > 0 ? t.text : t.muted, fontSize: '14px', fontWeight: th.unreadCount > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {th.clientName}
                    {th.messages.some(m => m.subject === 'ARTYSTA') && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', letterSpacing: '0.1em', marginLeft: '6px', border: '0.5px solid rgb(var(--brand-rgb) /0.4)', padding: '1px 4px' }}>ARTYSTA</span>
                    )}
                  </p>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: theme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(245,240,235,0.4)', letterSpacing: '0.05em', flexShrink: 0 }}>
                    {format(new Date(th.lastMessage.created_date), 'dd.MM HH:mm')}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: theme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(245,240,235,0.4)', letterSpacing: '0.03em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getMessagePreview(th.lastMessage)}
                </p>
              </div>
              {th.unreadCount > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#F5F0EB', background: t.fuchsia, padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
                  {th.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Conversation View */}
        <div className={`lg:col-span-3 ${selectedEmail ? 'flex' : 'hidden'} lg:flex`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: 'calc(100vh - 160px)', minHeight: '400px', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedThread ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <button onClick={() => setSelectedEmail(null)} className="lg:hidden" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                    {selectedThread.clientName}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: theme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(245,240,235,0.4)', letterSpacing: '0.06em' }}>
                    {selectedThread.email} {selectedThread.phone ? `· ${selectedThread.phone}` : ''}
                  </p>
                </div>
                <button onClick={() => setDeleteConfirm(selectedThread)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.map((msg) => {
                  const isAdmin = msg.sender_type === 'admin';
                  const isSystem = msg.sender_type === 'system' || msg.message_type === 'status_change';
                  const isBookingCard = msg.message_type === 'booking_card';

                  // Booking card
                  if (isBookingCard) {
                    return (
                      <div key={msg.id} className="flex flex-col items-center">
                        <BookingCard bookingId={msg.booking_id} t={t} theme={theme} onAction={onBookingAction} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '4px' }}>
                          {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                    );
                  }

                  // Status change notification
                  if (msg.message_type === 'status_change') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div style={{ background: 'rgb(var(--brand-rgb) /0.06)', border: `0.5px solid rgb(var(--brand-rgb) /0.2)`, padding: '10px 16px', maxWidth: '80%', textAlign: 'center' }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                            STATUS REZERWACJI
                          </p>
                          <p style={{ fontSize: '13px', color: t.text, lineHeight: 1.5 }}>
                            {msg.message}
                          </p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '6px' }}>
                            {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Text message bubble
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div style={{ maxWidth: '75%' }}>
                        <div style={{
                          padding: '10px 14px',
                          background: isAdmin ? t.adminBubble : t.bubbleBg,
                          borderRadius: '2px',
                          color: isAdmin ? '#F5F0EB' : t.text,
                        }}>
                          <MessageContent message={msg} t={t} isAdmin={isAdmin} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: theme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(245,240,235,0.4)', letterSpacing: '0.05em', marginTop: '4px', textAlign: isAdmin ? 'right' : 'left' }}>
                          {msg.sender_type === 'admin' ? 'Romans Tattoo · ' : ''}
                          {format(new Date(msg.created_date), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="p-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <AttachmentBar attachments={pendingAttachments} setAttachments={setPendingAttachments} t={t} />
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    rows={1}
                    placeholder="Napisz odpowiedź..."
                    style={{ flex: 1, background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '120px' }}
                    onFocus={e => e.target.style.borderColor = t.fuchsia}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'linear-gradient(135deg, var(--brand), var(--brand))', border: 'none', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer', opacity: sending || !replyText.trim() ? 0.4 : 1, transition: 'all 0.3s' }}
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" color="#F5F0EB" /> : <Send size={14} color="#F5F0EB" />}
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="hidden lg:flex items-center justify-center h-full py-20">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
                 WYBIERZ WĄTEK
               </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń wątek"
        message={`Czy na pewno chcesz usunąć cały wątek z klientem "${deleteConfirm?.clientName}"? Wszystkie wiadomości zostaną trwale usunięte.`}
        onConfirm={() => deleteThread(deleteConfirm.email)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {showNewMessage && (
        <NewMessageModal
          t={t}
          onClose={() => setShowNewMessage(false)}
          onSent={() => { setShowNewMessage(false); load(); }}
        />
      )}
    </div>
  );
}