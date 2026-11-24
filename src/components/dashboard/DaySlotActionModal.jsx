import { motion } from 'framer-motion';
import { Calendar, Clock, X } from 'lucide-react';

// Wybór po kliknięciu w oś czasu widoku dnia: rezerwacja albo dyspozycja.
export default function DaySlotActionModal({ slot, theme, onBooking, onAvailability, onClose }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.55)' }
    : { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.55)' };

  const action = (icon, label, desc, onClick) => (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 text-left w-full transition-colors"
      style={{ border: `0.5px solid ${t.border}`, background: 'transparent', borderRadius: 'var(--radius)', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
    >
      {icon}
      <span className="min-w-0">
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text }}>{label}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em', lineHeight: 1.7, marginTop: '3px' }}>{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '28px', borderRadius: 'var(--radius)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>NOWY WPIS</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={16} /></button>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: t.text, letterSpacing: '0.04em', lineHeight: 1.1, marginBottom: '6px' }}>
          {slot?.time || ''}{slot?.date ? ` · ${slot.date}` : ''}
        </h3>
        {slot?.artistName && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>
            {slot.artistName}
          </p>
        )}

        <div className="space-y-2 mt-4">
          {action(<Calendar size={16} color="var(--brand)" />, 'Rezerwacja', 'Nowa sesja z klientem w tym terminie.', onBooking)}
          {action(<Clock size={16} color="var(--brand)" />, 'Dyspozycja', 'Blokada lub dostępność artysty w tym czasie.', onAvailability)}
        </div>
      </motion.div>
    </div>
  );
}