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
  const [selectedThread, setSelectedThread] = useState(null);
  const [selectedTab, setSelectedTab] = useState('private'); // 'private' or 'studio'
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const messagesEndRef = useRef(null);

  const load = async () => {
    try {
      const data = await base44.entities.ContactMessage.list('-created_date', 500);
      setAllMessages(data);
      
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
    const unsubscribe = base44.entities.ContactMessage.subscribe((event) => {
      if (event.type === 'create') {
        setAllMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      } else if (event.type === 'update') {
        setAllMessages(prev => prev.map(m => m.id === event.data.id ? { ...m, ...event.data } : m));
      } else if (event.type === 'delete') {
        setAllMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      base44.entities.ContactMessage.list('-created_date', 500)
        .then(data => setAllMessages(data))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Private threads (non-STUDIO messages)
  const privateThreads = (() => {
    const grouped = {};
    allMessages.filter(m => !m.subject?.includes('STUDIO')).forEach(msg => {
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
      };
    }).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  })();

  // Studio group thread
  const studioMessages = allMessages.filter(m => m.subject?.includes('STUDIO')).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

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
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      if (selectedTab === 'studio') {
        // Send to all staff
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
      } else {
        // Send to specific client/artist
        await base44.entities.ContactMessage.create({
          name: 'Romans Tattoo',
          email: selectedThread.email,
          message: replyText,
          sender_type: 'admin',
          message_type: 'text',
          is_read: true,
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

  // ============ RENDER ============
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          WIADOMOŚCI
        </p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Czat
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b" style={{ borderBottomColor: t.border }}>
        <button
          onClick={() => { setSelectedTab('private'); setSelectedThread(null); }}
          style={{
            padding: '12px 0',
            fontFamily: 'JetBrains Mono',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: selectedTab === 'private' ? t.fuchsia : t.muted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: selectedTab === 'private' ? `2px solid ${t.fuchsia}` : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          Prywatne
        </button>
        <button
          onClick={() => { setSelectedTab('studio'); setSelectedThread(null); }}
          style={{
            padding: '12px 0',
            fontFamily: 'JetBrains Mono',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: selectedTab === 'studio' ? t.fuchsia : t.muted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: selectedTab === 'studio' ? `2px solid ${t.fuchsia}` : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          Studio (grupowy)
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Thread/Chat List */}
        <div className={`lg:col-span-2 ${selectedThread ? 'hidden lg:block' : 'block'}`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, minHeight: '500px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : selectedTab === 'private' && privateThreads.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
                BRAK WIADOMOŚCI
              </p>
            </div>
          ) : selectedTab === 'studio' ? (
            <div className="p-4">
              <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.2rem', color: t.text, marginBottom: '4px' }}>Studio (grupowy)</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginBottom: '12px' }}>
                {studioMessages.length} wiadomości
              </p>
            </div>
          ) : (
            privateThreads.map((th, i) => (
              <div
                key={th.email}
                onClick={() => setSelectedThread(th)}
                className="p-4 cursor-pointer transition-colors"
                style={{
                  borderBottom: `0.5px solid ${t.border}`,
                  background: selectedThread?.email === th.email ? 'rgba(255,0,127,0.1)' : 'transparent',
                  borderLeft: selectedThread?.email === th.email ? `3px solid ${t.fuchsia}` : '3px solid transparent',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: '13px', color: t.text, fontWeight: th.unreadCount > 0 ? 600 : 400 }}>
                    {th.clientName}
                  </p>
                  {th.unreadCount > 0 && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#F5F0EB', background: t.fuchsia, padding: '2px 6px', borderRadius: '10px' }}>
                      {th.unreadCount}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {th.lastMessage.message?.slice(0, 40)}...
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>
                  {format(new Date(th.lastMessage.created_date), 'dd.MM HH:mm')}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Conversation */}
        <div className={`lg:col-span-3 ${selectedThread || selectedTab === 'studio' ? 'flex' : 'hidden'} lg:flex`} style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: '70vh', minHeight: '400px', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedThread || selectedTab === 'studio' ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <button onClick={() => { setSelectedThread(null); setSelectedTab('private'); }} className="lg:hidden" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                </button>
                <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', fontWeight: 400, color: t.text, letterSpacing: '0.04em', flex: 1 }}>
                  {selectedTab === 'studio' ? 'Studio (grupowy)' : selectedThread?.clientName}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(selectedTab === 'studio' ? studioMessages : selectedThread?.messages || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={32} color={t.muted} style={{ marginBottom: '16px' }} />
                    <p style={{ fontSize: '14px', color: t.muted }}>Brak wiadomości</p>
                  </div>
                ) : (
                  (selectedTab === 'studio' ? studioMessages : selectedThread?.messages || []).map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    const avatar = !isAdmin && selectedTab === 'studio' ? getAvatar(msg) : null;

                    return (
                      <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        {avatar && (
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
                          {avatar && (
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginBottom: '2px' }}>
                              {avatar.name}
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
                    placeholder={selectedTab === 'studio' ? 'Napisz do całego studia...' : 'Napisz odpowiedź...'}
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