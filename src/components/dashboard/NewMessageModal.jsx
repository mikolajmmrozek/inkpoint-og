import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AttachmentBar from '@/components/panel/AttachmentBar';

export default function NewMessageModal({ onClose, onSent, t, defaultRecipient }) {
  const [recipientType, setRecipientType] = useState('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(defaultRecipient || null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = 0;
    const finish = () => { done++; if (done >= 2) setLoading(false); };
    base44.entities.Client.list('-created_date', 500)
      .then(setClients)
      .catch(e => console.error('Client load failed:', e))
      .finally(finish);
    base44.functions.invoke('getStudioStaff', {})
      .then(res => {
        const staff = res.data?.staff || [];
        setUsers(staff.map(s => ({ id: s.id, email: s.email, full_name: s.name, role: s.role })));
      })
      .catch(e => {
        console.error('Staff load failed, falling back to User.list:', e);
        base44.entities.User.list('-created_date', 500)
          .then(setUsers)
          .catch(e2 => console.error('User fallback failed:', e2))
          .finally(finish);
      })
      .finally(finish);
  }, []);

  const searchResults = (() => {
    const q = searchQuery.toLowerCase().trim();
    if (recipientType === 'client') {
      let base = clients.map(c => ({
        id: c.id,
        name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: (c.email || '').toLowerCase().trim(),
        phone: c.phone || '',
        type: 'Klient',
      })).filter(r => r.email);
      // Merge in logged-in users with role 'user' (clients with accounts)
      const clientEmails = new Set(base.map(r => r.email));
      users.filter(u => u.role === 'user').forEach(u => {
        const email = (u.email || '').toLowerCase().trim();
        if (email && !clientEmails.has(email)) {
          base.push({ id: u.id, name: u.full_name || u.email, email, phone: '', type: 'Klient' });
        }
      });
      if (!q) return base.slice(0, 20);
      return base.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      ).slice(0, 20);
    } else {
      let base = users.filter(u => u.role === 'artist' || u.role === 'admin').map(u => ({
        id: u.id,
        name: u.full_name || u.email,
        email: u.email || '',
        phone: '',
        type: u.role === 'artist' ? 'Artysta' : 'Admin',
      })).filter(r => r.email);
      if (!q) return base.slice(0, 20);
      return base.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      ).slice(0, 20);
    }
  })();

  const handleSend = async () => {
    if (!selectedRecipient || !messageText.trim()) return;
    setSending(true);
    try {
      await base44.entities.ContactMessage.create({
        name: 'Romans Tattoo',
        email: selectedRecipient.email,
        phone: selectedRecipient.phone || '',
        message: messageText,
        sender_type: 'admin',
        message_type: 'text',
        is_read: true,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });
      try {
        await base44.functions.invoke('sendEmailViaResend', {
          to: selectedRecipient.email,
          subject: 'Wiadomość od Romans Tattoo',
          body: messageText,
        });
      } catch (e) {}
      onSent();
    } catch (e) {
      console.error('New message failed:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg || '#0A0A0A', padding: '32px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>NOWA WIADOMOŚĆ</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em' }}>Wyślij wiadomość</h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Recipient type toggle */}
        <div className="mb-4">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ODBIORCA</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setRecipientType('client'); setSelectedRecipient(null); setSearchQuery(''); }}
              style={{ flex: 1, padding: '10px', border: `0.5px solid ${recipientType === 'client' ? 'var(--brand)' : t.border}`, color: recipientType === 'client' ? 'var(--brand)' : t.muted, background: recipientType === 'client' ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              KLIENT
            </button>
            <button
              onClick={() => { setRecipientType('studio'); setSelectedRecipient(null); setSearchQuery(''); }}
              style={{ flex: 1, padding: '10px', border: `0.5px solid ${recipientType === 'studio' ? 'var(--brand)' : t.border}`, color: recipientType === 'studio' ? 'var(--brand)' : t.muted, background: recipientType === 'studio' ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              STUDIO
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="flex items-center gap-2" style={{ border: `0.5px solid ${searchQuery ? 'var(--brand)' : t.border}`, padding: '8px 12px' }}>
            <Search size={12} color={searchQuery ? 'var(--brand)' : t.muted} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={recipientType === 'client' ? 'Szukaj po imieniu, nazwisku, emailu...' : 'Szukaj po imieniu lub emailu...'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', color: t.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Search results or selected recipient */}
        {selectedRecipient ? (
          <div className="mb-4 p-3" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.3)', background: 'rgb(var(--brand-rgb) /0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{selectedRecipient.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{selectedRecipient.email}{selectedRecipient.phone ? ` · ${selectedRecipient.phone}` : ''}</p>
              </div>
              <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4" style={{ border: `0.5px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto' }}>
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 size={16} className="animate-spin mx-auto" color="var(--brand)" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK WYNIKÓW</p>
              </div>
            ) : searchResults.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRecipient(r)}
                className="w-full text-left px-3 py-2 transition-colors"
                style={{ borderBottom: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: '13px', color: t.text }}>{r.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{r.email}</p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', border: '0.5px solid rgb(var(--brand-rgb) /0.3)', padding: '2px 6px' }}>{r.type}</span>

                </div>
              </button>
            ))}
          </div>
        )}

        {/* Message */}
        <div className="mb-4">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>WIADOMOŚĆ</p>
          <AttachmentBar attachments={pendingAttachments} setAttachments={setPendingAttachments} t={t} />
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            rows={4}
            placeholder="Wpisz wiadomość..."
            style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = t.border}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !selectedRecipient || !messageText.trim()}
            className="btn-oxblood flex-1 flex items-center justify-center gap-2"
            style={{ opacity: (!selectedRecipient || !messageText.trim()) ? 0.5 : 1 }}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> WYŚLIJ</>}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}