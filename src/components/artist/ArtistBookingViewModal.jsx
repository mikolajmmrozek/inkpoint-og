import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

export default function ArtistBookingViewModal({ booking, onClose, t }) {
  if (!booking) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
          style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '40px' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>SESJA</p>
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {booking.client_name}
              </h3>
            </div>
            <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Status badge */}
          <div className="mb-6">
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', border: `0.5px solid ${STATUS_COLORS[booking.status]}`, color: STATUS_COLORS[booking.status] }}>
              {STATUS_LABELS[booking.status]}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Client info */}
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KLIENT</p>
              {[
                ['Imię i nazwisko', booking.client_name],
                ['Telefon', booking.client_phone],
                ['Email', booking.client_email],
              ].map(([label, value]) => value ? (
                <div key={label} className="mb-3">
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
                  <p style={{ color: t.text, fontSize: '13px' }}>{value}</p>
                </div>
              ) : null)}
            </div>

            {/* Session info */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>SESJA</p>
              {[
                ['Data', booking.session_date],
                ['Godzina', booking.session_time ? `${booking.session_time}${booking.session_end_time ? `–${booking.session_end_time}` : ''}` : null],
                ['Artysta', booking.artist_name],
                ['Usługa', booking.service_name],
                ['Cena', booking.estimated_price > 0 ? `${booking.estimated_price} PLN` : null],
              ].map(([label, value]) => value ? (
                <div key={label} className="mb-3">
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
                  <p style={{ color: t.text, fontSize: '13px' }}>{value}</p>
                </div>
              ) : null)}
            </div>

            {/* Tattoo info */}
            {(booking.tattoo_placement || booking.tattoo_description) && (
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TATUAŻ</p>
                {booking.tattoo_placement && (
                  <div className="mb-3">
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Miejsce</p>
                    <p style={{ color: t.text, fontSize: '13px' }}>{booking.tattoo_placement}</p>
                  </div>
                )}
                {booking.tattoo_description && (
                  <div>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Opis</p>
                    <p style={{ color: t.text, fontSize: '13px', lineHeight: 1.6 }}>{booking.tattoo_description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Notatki</p>
                <p style={{ color: t.text, fontSize: '13px', lineHeight: 1.6 }}>{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
            <button onClick={onClose} className="btn-ghost-parchment" style={{ width: '100%' }}>ZAMKNIJ</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}