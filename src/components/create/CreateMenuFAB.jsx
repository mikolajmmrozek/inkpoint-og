import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarPlus, Clock, FileText, UserPlus, Ticket } from 'lucide-react';

// Near-vertical stack with a slight leftward fan — keeps labels from overlapping.
const STEP_Y = 72;
const FAN_X = 12;

export default function CreateMenuFAB({ onNewBooking, onNewAvailability, onNewHealthForm, onNewClient, onNewPromotion, theme, role }) {
  const [open, setOpen] = useState(false);
  const isLight = theme === 'light';

  const options = [
    { icon: CalendarPlus, label: 'Rezerwacja', action: onNewBooking },
    { icon: FileText, label: 'Ankieta', action: onNewHealthForm },
    ...(role === 'admin' ? [{ icon: Ticket, label: 'Promocje', action: onNewPromotion }] : []),
    { icon: Clock, label: 'Dyspozycja', action: onNewAvailability },
    ...(role === 'admin' ? [{ icon: UserPlus, label: 'Klient', action: onNewClient }] : []),
  ];

  const positions = options.map((_, i) => ({
    x: -((i + 1) * FAN_X) - 4,
    y: -((i + 1) * STEP_Y),
  }));

  const handleSelect = (action) => { setOpen(false); action(); };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)' }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', right: '20px', bottom: '100px', zIndex: 61 }} className="lg:right-8 lg:bottom-8">
        <AnimatePresence>
          {open && options.map((opt, i) => {
            const { x, y } = positions[i];
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.label}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.04 }}
                onClick={() => handleSelect(opt.action)}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 16px 9px 14px',
                  borderRadius: 'var(--radius)',
                  border: `0.5px solid ${isLight ? '#E5E5E5' : '#262626'}`,
                  background: isLight ? '#FFFFFF' : '#0A0A0A',
                  color: isLight ? '#111111' : '#F5F0EB',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', order: 1 }}>{opt.label}</span>
                <span style={{ width: '30px', height: '30px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text,#F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, order: 2 }}>
                  <Icon size={15} />
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          aria-label="Dodaj"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius)',
            background: 'var(--brand)',
            color: 'var(--btn-text,#F5F0EB)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(var(--brand-rgb) / 0.35)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </>
  );
}