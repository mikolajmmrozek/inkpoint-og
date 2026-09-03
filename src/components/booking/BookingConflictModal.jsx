import { motion } from 'framer-motion';
import { AlertTriangle, Clock, CalendarOff } from 'lucide-react';

const THEMES = {
  light: { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', warn: '#d97706' },
  dark: { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', warn: '#f59e0b' },
};

export default function BookingConflictModal({ conflicts, theme = 'dark', onConfirm, onCancel }) {
  const t = THEMES[theme] || THEMES.dark;
  const { timeOff, doubleBooking } = conflicts || {};

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md"
        style={{ background: t.bg, border: `0.5px solid ${t.warn}`, padding: '36px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} color={t.warn} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.warn, letterSpacing: '0.2em', textTransform: 'uppercase' }}>UWAGA — KONFLIKT</p>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '20px' }}>
          Zapisać mimo to?
        </h3>

        <div className="space-y-3 mb-8">
          {timeOff && (
            <div className="p-3" style={{ border: `0.5px solid ${t.warn}50`, background: `${t.warn}10` }}>
              <div className="flex items-center gap-2 mb-1">
                <CalendarOff size={12} color={t.warn} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.warn, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wolne</span>
              </div>
              <p style={{ fontSize: '13px', color: t.text }}>
                Artysta ma wolne w tym czasie: <strong>{timeOff.timeRange}</strong>
              </p>
              {timeOff.note && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '4px' }}>{timeOff.note}</p>}
            </div>
          )}
          {doubleBooking && (
            <div className="p-3" style={{ border: `0.5px solid rgb(var(--brand-rgb) / 0.31)`, background: 'rgb(var(--brand-rgb) /0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} color="var(--brand)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nakładająca się sesja</span>
              </div>
              <p style={{ fontSize: '13px', color: t.text }}>
                {doubleBooking.clientName} — <strong>{doubleBooking.timeRange}</strong>
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '4px' }}>W tym czasie jest już zapisana inna wizyta.</p>
            </div>
          )}
        </div>

        <p style={{ fontSize: '12px', color: t.muted, marginBottom: '20px', lineHeight: 1.5 }}>
          Czy na pewno chcesz zapisać sesję mimo konfliktu?
        </p>

        <div className="flex gap-3">
          <button onClick={onConfirm} className="btn-oxblood flex-1">TAK, ZAPISZ MIMO TO</button>
          <button onClick={onCancel} className="btn-ghost-parchment" style={{ flex: 1 }}>ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}