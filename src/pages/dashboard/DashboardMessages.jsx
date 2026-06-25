import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import MessageContent from '@/components/panel/MessageContent';
import AttachmentBar from '@/components/panel/AttachmentBar';
import { useTheme } from './Dashboard';
import { format } from 'date-fns';

export default function DashboardMessages() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', fuchsia: '#FF007F', hover: 'rgba(0,0,0,0.03)', cardBg: '#FFFFFF', bubbleBg: 'rgba(0,0,0,0.06)', adminBubble: '#FF007F' }
    : { bg: 'rgba(24,24,24,0.95)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', fuchsia: '#FF007F', hover: 'rgba(255,255,255,0.05)', cardBg: 'transparent', bubbleBg: 'rgba(255,255,255,0.06)', adminBubble: '#FF007F' };

  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const messagesEndRef = useRef(null);

  const load = async () => {
    try {
      // Load only group messages (subject contains STUDIO)
      const data = await base44.entities.ContactMessage.list('-created_date', 500);
      const groupMsgs = data.filter(m => m.subject?.includes('STUDIO')).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setAllMessages(groupMsgs);
      
      // Load staff
      const staffRes = await base44.functions.invoke('getStudioStaff', {});
      setStaff(staffRes.data?.staff || []);
    } catch (e) {
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Realtime subscription — live updates for group messages
    const unsubscribe = base44.entities.ContactMessage.subscribe((event) => {
      if (!event.data || !event.data.subject?.includes('STUDIO')) return;
      if (event.type === 'create') {
        setAllMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        });
      } else if (event.type === 'update') {
        setAllMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setAllMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Polling fallback — refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      base44.entities.ContactMessage.list('-created_date', 500)
        .then(data => {
          const groupMsgs = data.filter(m => m.subject?.includes('STUDIO')).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          setAllMessages(groupMsgs);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAvatar = (message) => {
    let staffMember = staff.find(s => s.email === message.email);
    
    if (!staffMember && message.name) {
      staffMember = staff.find(s => s.name === message.name);
    }
    
    if (staffMember && staffMember.photo_url) {
      return { type: 'photo', src: staffMember.photo_url, name: staffMember.name };
    }
    
    const displayName = staffMember?.name || message.name || message.email;
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return { type: 'initials', text: initials, name: displayName };
  };

  const send = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      // Send to all staff members
      const staffRes = await base44.functions.invoke('getStudioStaff', {});
      const allStaff = (staffRes.data?.staff || []).filter(s => s.role === 'artist' || s.role === 'admin');

      await Promise.all(allStaff.map(staffMember =>
        base44.entities.ContactMessage.create({
          name: 'Romans Tattoo',
          email: (staffMember.email || '').toLowerCase().trim(),
          message: replyText,
          sender_type: 'admin',
          message_type: 'text',
          subject: 'STUDIO',
          is_read: true,
          attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
        })
      ));
      setReplyText('');
      setPendingAttachments([]);
      await load();
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  // ============ RENDER ============
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          CZAT GRUPOWY
        </p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Studio
        </h2>
      </div>

      {/* Messages Container */}
      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: 'calc(100vh - 200px)', minHeight: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} color={t.muted} style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', color: t.muted }}>Brak wiadomości w czacie grupowym</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted, marginTop: '8px', letterSpacing: '0.1em' }}>Wysyłaj wiadomości do wszystkich pracowników poniżej</p>
            </div>
          ) : (
            allMessages.map((msg) => {
              const isAdmin = msg.sender_type === 'admin';
              const avatar = !isAdmin ? getAvatar(msg) : null;

              return (
                <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && avatar && (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      marginTop: '2px',
                      background: avatar.type === 'photo' ? 'transparent' : 'rgba(255,0,127,0.2)',
                      border: avatar.type === 'photo' ? 'none' : `0.5px solid rgba(255,0,127,0.3)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {avatar.type === 'photo' ? (
                        <img src={avatar.src} alt={avatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '10px', color: '#FF007F', fontWeight: 600 }}>
                          {avatar.text}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isAdmin && (
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginBottom: '2px' }}>
                        {avatar?.name || msg.email}
                      </p>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      background: isAdmin ? t.adminBubble : t.bubbleBg,
                      color: isAdmin ? '#F5F0EB' : t.text,
                      borderRadius: '2px',
                    }}>
                      <MessageContent message={msg} t={t} isAdmin={isAdmin} />
                    </div>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '4px', textAlign: isAdmin ? 'right' : 'left' }}>
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
              placeholder="Napisz wiadomość dla całego studia..."
              style={{ flex: 1, background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '120px' }}
              onFocus={e => e.target.style.borderColor = t.fuchsia}
              onBlur={e => e.target.style.borderColor = t.border}
            />
            <button
              onClick={send}
              disabled={sending || !replyText.trim()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'linear-gradient(135deg, #FF007F, #CC0066)', border: 'none', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer', opacity: sending || !replyText.trim() ? 0.4 : 1, transition: 'all 0.3s' }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" color="#F5F0EB" /> : <Send size={14} color="#F5F0EB" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  }