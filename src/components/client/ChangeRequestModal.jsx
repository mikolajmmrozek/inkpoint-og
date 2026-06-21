import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import SessionDatePicker from '@/components/booking/SessionDatePicker';

export default function ChangeRequestModal({ booking, onClose, onSaved }) {
  const [newDate, setNewDate] = useState(booking.session_date || '');
  const [newTime, setNewTime] = useState(booking.session_time || '');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!newDate || !newTime) return;
    setSaving(true);

    // Calculate new end time
    const [h, m] = newTime.split(':').map(Number);
    const duration = booking.session_duration || 60;
    const endTotal = h * 60 + m + duration;
    const newEndTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

    const changeNote = `\n[Klient prosi o zmianę terminu z ${booking.session_date} ${booking.session_time || ''} na ${newDate} ${newTime} — ${new Date().toISOString().split('T')[0]}]`;

    await base44.entities.Booking.update(booking.id, {
      session_date: newDate,
      session_time: newTime,
      session_end_time: newEndTime,
      status: 'pending',
      notes: (booking.notes || '') + changeNote,
    });

    // Track activity
    base44.functions.invoke('trackUserActivity', {
      event_type: 'change_request',
      metadata: { booking_id: booking.id, old_date: booking.session_date, new_date: newDate, new_time: newTime }
    }).catch(() => null);

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg max-h-screen overflow-y-auto"
        style={{ border: '0.5px solid #262626', background: '#0A0A0A', padding: '36px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              ZMIANA TERMINU
            </p>
            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.6rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>
              Wybierz nowy termin
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(245,240,235,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Current booking summary */}
        <div className="mb-6 p-3" style={{ border: '0.5px solid #262626', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            OBECNY TERMIN
          </p>
          <p style={{ fontSize: '13px', color: '#F5F0EB' }}>
            {booking.session_date} {booking.session_time && `· ${booking.session_time}`}
            {booking.artist_name && ` · ${booking.artist_name}`}
          </p>
        </div>

        {/* Date/time picker */}
        <SessionDatePicker
          artistId={booking.artist_id}
          selectedDate={newDate}
          selectedTime={newTime}
          onDateChange={setNewDate}
          onTimeChange={setNewTime}
        />

        <div className="mt-6 pt-4" style={{ borderTop: '0.5px solid #262626' }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,235,0.4)', marginBottom: '16px', lineHeight: 1.5 }}>
            Twoja prośba o zmianę zostanie wysłana do studia. Po akceptacji otrzymasz potwierdzenie na e-mail.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={saving || !newDate || !newTime}
              className="btn-oxblood flex-1 flex items-center justify-center gap-2"
              style={{ opacity: (saving || !newDate || !newTime) ? 0.5 : 1 }}
            >
              {saving ? <><Loader2 size={13} className="animate-spin" /> WYSYŁANIE...</> : <><RefreshCw size={13} /> ZAPYTAJ O ZMIANĘ</>}
            </button>
            <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}