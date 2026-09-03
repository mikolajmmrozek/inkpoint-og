import { motion, AnimatePresence } from 'framer-motion';

/**
 * Prosty modal potwierdzenia usunięcia.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - theme: 'light' | 'dark' (opcjonalne, default 'dark')
 */
export default function ConfirmDeleteDialog({ open, title, message, onConfirm, onCancel, theme = 'dark' }) {
  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.45)' : 'rgba(245,240,235,0.45)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm"
            style={{ background: bg, border: `0.5px solid ${border}`, padding: '32px' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
              POTWIERDZENIE USUNIĘCIA
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: textColor, letterSpacing: '0.04em', marginBottom: '12px' }}>
              {title || 'Usuń element'}
            </h3>
            <p style={{ fontSize: '13px', color: mutedColor, lineHeight: 1.6, marginBottom: '24px' }}>
              {message || 'Czy na pewno chcesz usunąć ten element? Tej operacji nie można cofnąć.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,var(--brand),var(--brand))', color: '#F5F0EB', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
              >
                USUŃ
              </button>
              <button
                onClick={onCancel}
                style={{ flex: 1, padding: '10px', background: 'transparent', color: mutedColor, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', border: `0.5px solid ${border}`, cursor: 'pointer' }}
              >
                ANULUJ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}