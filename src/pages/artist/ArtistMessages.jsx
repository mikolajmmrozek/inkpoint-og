import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import AttachmentBar from '@/components/panel/AttachmentBar';
import MessageContent from '@/components/panel/MessageContent';

export default function ArtistMessages() {
  const { artist, theme } = useOutletContext();
  const { user } = useAuth();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: '#FF007F', bubbleBg: 'rgba(0,0,0,0.04)', adminBubble: '#FF007F' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: '#FF007F', bubbleBg: 'rgba(255,255,255,0.04)', adminBubble: '#FF007F' };

  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const messagesEndRef = useRef(null);

  // Load messages and staff
  const load = async () => {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      const data = await base44.entities.ContactMessage.filter({ email: userEmail }, 'created_date', 200);
      setAllMessages(data);
    } catch (e) {
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Load staff for avatars
    base44.functions.invoke('getStudioStaff', {})
      .then(res => {
        setStaffList(res.data?.staff || []);
      })
      .catch(() => {});

    // Subscriptions
    const unsubscribe = base44.entities.ContactMessage.subscribe((event) => {
      if (!event.data) return;
      const userEmail = (user?.email || '').toLowerCase().trim();
      const msgEmail = (event.data.email || '').toLowerCase().trim();
      if (msgEmail !== userEmail) return;
      if (event.type === 'create') {
        setAllMessages(prev => prev.some(m => m.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update') {
        setAllMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setAllMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [user?.email]);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(() => {
      const userEmail = (user?.email || '').toLowerCase().trim();
      base44.entities.ContactMessage.filter({ email: userEmail }, 'created_date', 200)
        .then(data => setAllMessages(data))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedThread]);

  // Group messages into threads and mark as read when thread is selected
  useEffect(() => {
    if (selectedThread && selectedThread.messages) {
      const unreadIds = selectedThread.messages
        .filter(m => !m.is_read && m.sender_type === 'admin')
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        Promise.all(unreadIds.map(id => base44.entities.Notification.updateMany({ link_data: user?.email }, { is_read: true })))
          .catch(() => {});
        Promise.all(unreadIds.map(id => base44.entities.ContactMessage.update(id, { is_read: true })))
          .then(() => setAllMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m)))
          .catch(() => {});
      }
    }
  }, [selectedThread?.id, user?.email]);

  const threads = (() => {
    const adminThread = {
      id: 'admin',
      label: 'Manager',
      messages: allMessages.filter(m => !m.subject?.includes('STUDIO')).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
      type: 'admin',
    };
    const studioThread = {
      id: 'studio',
      label: 'Studio (grupowy)',
      messages: allMessages.filter(m => m.subject?.includes('STUDIO')).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
      type: 'studio',
    };
    return [adminThread, studioThread];
  })();

  const getStaffMember = (email) => {
    return staffList.find(s => s.email === email);
  };

  const getAvatar = (message) => {
    // message.name contains the sender's name, find staff by name or email
    let staff = null;
    if (message.sender_type === 'admin') {
      // Admin message - look up by name or as fallback by email
      staff = staffList.find(s => s.name === message.name) || staffList.find(s => s.email === message.email);
    } else {
      // Client message - look up the sender
      staff = staffList.find(s => s.email === message.email);
    }
    
    if (staff?.photo_url) {
      return { type: 'photo', src: staff.photo_url, name: staff.name };
    }
    
    // Use message.name for display, extract initials
    const displayName = staff?.name || message.name || message.email;
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return { type: 'initials', text: initials, name: displayName };
  };

  const send = async () => {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      if (selectedThread.type === 'studio') {
        // Send to all staff members - fetch fresh staff list to ensure all users
        if (!staffList || staffList.length === 0) {
          const res = await base44.functions.invoke('getStudioStaff', {});
          const freshStaff = res.data?.staff || [];
          const allStaff = freshStaff.filter(s => s.role === 'artist' || s.role === 'admin');
          
          await Promise.all(allStaff.map(staff =>
            base44.entities.ContactMessage.create({
              name: artist?.name || user?.full_name,
              email: (staff.email || '').toLowerCase().trim(),
              message: replyText,
              sender_type: 'client',
              message_type: 'text',
              subject: 'ARTYSTA - STUDIO',
              is_read: false,
              attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
            })
          ));
        } else {
          const allStaff = staffList.filter(s => s.role === 'artist' || s.role === 'admin');
          await Promise.all(allStaff.map(staff =>
            base44.entities.ContactMessage.create({
              name: artist?.name || user?.full_name,
              email: (staff.email || '').toLowerCase().trim(),
              message: replyText,
              sender_type: 'client',
              message_type: 'text',
              subject: 'ARTYSTA - STUDIO',
              is_read: false,
              attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
            })
          ));
        }
      } else {
        // Send to admin only
        await base44.entities.ContactMessage.create({
          name: artist?.name || user?.full_name,
          email: (user?.email || '').toLowerCase().trim(),
          message: replyText,
          sender_type: 'client',
          message_type: 'text',
          subject: 'ARTYSTA',
          is_read: false,
          attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
        });
      }
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
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          WIADOMOŚCI
        </p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.text, lineHeight: 1, letterSpacing: '0.04em' }}>
          Czat
        </h2>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Thread list */}
        <div className={`lg:col-span-1 ${selectedThread ? 'hidden lg:block' : 'block'}`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, minHeight: '500px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : threads.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
                BRAK WIADOMOŚCI
              </p>
            </div>
          ) : (
            threads.map(thread => {
              const lastMsg = thread.messages[thread.messages.length - 1];
              const unread = thread.messages.filter(m => !m.is_read && m.sender_type === 'admin').length;
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className="p-4 cursor-pointer transition-colors border-b"
                  style={{
                    borderBottom: `0.5px solid ${t.border}`,
                    background: selectedThread?.id === thread.id ? 'rgba(255,0,127,0.1)' : 'transparent',
                    borderLeft: selectedThread?.id === thread.id ? `3px solid ${t.fuchsia}` : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: '13px', color: t.text, fontWeight: unread > 0 ? 600 : 400 }}>
                      {thread.label}
                    </p>
                    {unread > 0 && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#F5F0EB', background: t.fuchsia, padding: '2px 6px', borderRadius: '10px' }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  {lastMsg ? (
                    <>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg.sender_type === 'admin' ? 'Admin: ' : 'Ty: '}{lastMsg.message?.slice(0, 40)}...
                      </p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>
                        {format(new Date(lastMsg.created_date), 'dd.MM HH:mm')}
                      </p>
                    </>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Conversation */}
        <div className={`lg:col-span-3 ${selectedThread ? 'flex' : 'hidden'} lg:flex`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: '70vh', minHeight: '400px', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedThread ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <button onClick={() => setSelectedThread(null)} className="lg:hidden" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                </button>
                <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', fontWeight: 400, color: t.text, letterSpacing: '0.04em', flex: 1 }}>
                  {selectedThread.label}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <MessageSquare size={24} color={t.muted} style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', color: t.muted }}>Brak wiadomości w tym czacie</p>
                  </div>
                ) : (
                  selectedThread.messages.map(msg => {
                    const isMe = msg.sender_type === 'client';
                    const avatar = !isMe ? getAvatar(msg) : null;
                    
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && avatar && (
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
                          {!isMe && selectedThread.type === 'studio' && (
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginBottom: '2px' }}>
                              {avatar?.name || msg.email}
                            </p>
                          )}
                          <div style={{
                            padding: '10px 14px',
                            background: isMe ? t.adminBubble : t.bubbleBg,
                            color: isMe ? '#F5F0EB' : t.text,
                            borderRadius: '2px',
                          }}>
                            <MessageContent message={msg} t={t} isAdmin={isMe} />
                          </div>
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
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
                    placeholder={selectedThread.type === 'studio' ? 'Napisz do całego studia...' : 'Napisz do admina...'}
                    style={{ flex: 1, background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none', minHeight: '40px', maxHeight: '120px' }}
                    onFocus={e => e.target.style.borderColor = t.fuchsia}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !replyText.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'linear-gradient(135deg, #FF007F, #CC0066)', border: 'none', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer', opacity: sending || !replyText.trim() ? 0.4 : 1 }}
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" color="#F5F0EB" /> : <Send size={14} color="#F5F0EB" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden lg:flex items-center justify-center h-full py-20">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
                WYBIERZ CZAT
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}