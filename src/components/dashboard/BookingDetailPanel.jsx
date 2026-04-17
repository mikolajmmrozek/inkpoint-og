import { motion } from 'framer-motion';
import { X, Trash2, Edit } from 'lucide-react';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingDetailPanel({ booking, onClose, onStatusChange, onDelete, onEdit, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3 }}
      className="w-80 flex-shrink-0"
      style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', position: 'sticky', top: '80px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
          {booking.client_name}
        </h3>
        <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      <div className="mb-6">
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[booking.status] || '#262626'}`,
          color: STATUS_COLORS[booking.status] || t.muted,
        }}>{booking.status}</span>
      </div>

      {[
        ['Email', booking.client_email],
        ['Telefon', booking.client_phone || '—'],
        ['Artysta', booking.artist_name || '—'],
        ['Data sesji', `${booking.session_date || '—'} ${booking.session_time || ''}`],
        ['Czas trwania', booking.session_duration ? `${booking.session_duration}h` : '—'],
        ['Miejsce', booking.tattoo_placement || '—'],
        ['Opis projektu', booking.tattoo_description || '—'],
        ['Cena', booking.estimated_price ? `${booking.estimated_price} PLN` : '—'],
        ['Depozyt', booking.deposit_paid ? '✓ Wpłacony' : '✗ Brak'],
        ['Ankieta', booking.health_form_completed ? '✓ Wypełniona' : '✗ Brak'],
        ['Notatki', booking.notes || '—'],
      ].map(([label, value]) => (
        <div key={label} className="mb-3 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
          <p style={{ color: t.muted, fontSize: '12px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</p>
        </div>
      ))}

      {/* Status change */}
      <div className="mb-5">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZMIEŃ STATUS</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(booking.id, s)}
              style={{
                fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '7px', border: `0.5px solid ${booking.status === s ? STATUS_COLORS[s] : t.border}`,
                color: booking.status === s ? STATUS_COLORS[s] : t.muted,
                background: 'transparent', cursor: 'pointer',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Edit size={11} /> EDYTUJ
        </button>
        <button
          onClick={() => onDelete(booking.id)}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid #FF007F`, color: '#FF007F', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Trash2 size={11} /> USUŃ
        </button>
      </div>
    </motion.div>
  );
}