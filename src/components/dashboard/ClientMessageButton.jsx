import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NewMessageModal from './NewMessageModal';

export default function ClientMessageButton({ client, t, users }) {
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleMessage = async () => {
    if (!client.email) return;

    // Check if client has an active account
    const clientUser = users.find(u => u.email?.toLowerCase() === client.email.toLowerCase());

    if (clientUser) {
      // User is logged in — show in-app modal
      setShowModal(true);
    } else {
      // User not logged in — send email
      setSending(true);
      try {
        await base44.functions.invoke('sendEmailViaResend', {
          to: client.email,
          subject: 'Wiadomość od Romans Tattoo',
          body: `Cześć ${client.first_name || client.name}! Mamy dla Ciebie ważną wiadomość. Zaloguj się w aplikacji, aby ją przeczytać.`,
        });
        alert(`Email wysłany do ${client.email}`);
      } catch (e) {
        console.error('Email send failed:', e);
        alert('Błąd wysyłania emaila');
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <>
      <button
        onClick={handleMessage}
        disabled={!client.email || sending}
        style={{ color: sending ? t.muted : 'var(--brand)', background: 'none', border: 'none', cursor: client.email && !sending ? 'pointer' : 'not-allowed', opacity: client.email ? 1 : 0.5, padding: '4px' }}
        title={client.email ? 'Wyślij wiadomość' : 'Brak emaila'}
      >
        {sending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
      </button>
      {showModal && (
        <NewMessageModal
          defaultRecipient={client}
          t={t}
          onClose={() => setShowModal(false)}
          onSent={() => { setShowModal(false); }}
        />
      )}
    </>
  );
}