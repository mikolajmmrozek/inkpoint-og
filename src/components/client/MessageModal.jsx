import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, MessageSquare, Loader2 } from 'lucide-react';

export default function MessageModal({ booking, client, user, theme = 'dark', onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', overlay: 'rgba(0,0,0,0.5)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', overlay: 'rgba(0,0,0,0.8)' };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    await base44.entities.ContactMessage.create({
      name: client?.name || user?.full_name || booking.client_name || '',
      email: user?.email || booking.client_email || '',
      phone: client?.phone || booking.client_phone || '',
      subject: `Wiadomość o sesji: ${booking.session_date || ''}${booking.session_time ? ' ' + booking.session_time : ''}`,
      message: message.trim(),
      is_read: false,
    });

    base44.functions.invoke('trackUserActivity', {
      event_type: 'message_sent',
      metadata: { booking_id: booking.id }
    }).catch(() => null);

    setSending(false);
    onSent();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: t.overlay }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '36px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              WIADOMOŚĆ DO STUDIA
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: t.title, letterSpacing: '0.04em' }}>
              {booking.session_date} {booking.session_time && `· ${booking.session_time}`}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            TWOJA WIADOMOŚĆ
          </label>
          <textarea
            rows={5}
            autoFocus
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Napisz wiadomość do studia..."
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `0.5px solid ${t.border}`,
              color: t.text,
              padding: '10px 0',
              fontSize: '14px',
              width: '100%',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              resize: 'none',
            }}
            onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
            onBlur={e => e.target.style.borderBottomColor = t.border}
          />
        </div>

        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="btn-oxblood flex-1 flex items-center justify-center gap-2"
            style={{ opacity: (sending || !message.trim()) ? 0.5 : 1 }}
          >
            {sending ? <><Loader2 size={13} className="animate-spin" /> WYSYŁANIE...</> : <><MessageSquare size={13} /> WYŚLIJ</>}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}