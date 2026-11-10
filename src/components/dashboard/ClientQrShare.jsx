import { useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';

export default function ClientQrShare({ open, onClose, t }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const url = `${window.location.origin}/nowy-klient`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm p-8"
        style={{ background: t.bg === 'rgba(10,10,10,0.8)' ? '#0A0A0A' : '#FFFFFF', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>FORMULARZ QR</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>Nowy klient</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div style={{ background: '#FFFFFF', padding: '10px', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <img src={qr} alt="Kod QR do formularza nowego klienta" width={200} height={200} />
          </div>
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7, marginBottom: '14px' }}>
          Klient wypełnia imię, nazwisko, e-mail i telefon. Formularz nie pokazuje danych innych klientów — istniejący e-mail kończy się neutralnym komunikatem.
        </p>

        <div className="flex gap-2">
          <button onClick={copy} className="btn-oxblood flex-1 flex items-center justify-center gap-1.5" style={{ padding: '9px' }}>
            {copied ? <><Check size={12} /> SKOPIOWANO</> : <><Copy size={12} /> KOPIUJ LINK</>}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
            style={{ border: `0.5px solid ${t.border}`, color: t.muted, padding: '9px 12px', borderRadius: 'var(--radius)' }}
            title="Otwórz formularz"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}