import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Edit, CheckCircle, Loader2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import BookingModal from './BookingModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_LABELS = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

function getStatusMessage(status, booking) {
  const date = booking.session_date || '—';
  const time = booking.session_time || '';
  switch (status) {
    case 'confirmed':
      return `Twoja rezerwacja na ${date}${time ? ` o ${time}` : ''} została POTWIERDZONA. Do zobaczenia w studiu!`;
    case 'cancelled':
      return `Twoja rezerwacja na ${date} została ANULOWANA. Skontaktuj się z nami, aby umówić nowy termin.`;
    case 'completed':
      return `Twoja sesja z dnia ${date} została oznaczona jako zakończona. Dziękujemy za wizytę!`;
    case 'pending':
      return `Status Twojej rezerwacji na ${date} został zmieniony na: OCZEKUJE.`;
    default:
      return `Status Twojej rezerwacji został zmieniony.`;
  }
}

function getStatusEmailSubject(status) {
  switch (status) {
    case 'confirmed': return 'Twoja rezerwacja została potwierdzona — Romans Tattoo';
    case 'cancelled': return 'Twoja rezerwacja została anulowana — Romans Tattoo';
    case 'completed': return 'Dziękujemy za wizytę — Romans Tattoo';
    default: return 'Aktualizacja rezerwacji — Romans Tattoo';
  }
}

export default function BookingCard({ bookingId, t, theme, onAction, readOnly = false }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImages, setShowImages] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const load = async () => {
    try {
      const b = await base44.entities.Booking.get(bookingId);
      setBooking(b);
    } catch (e) {
      console.error('Failed to load booking:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [bookingId]);

  const handleStatusChange = async (newStatus) => {
    if (!booking || booking.status === newStatus) {
      setShowStatusDropdown(false);
      return;
    }
    setActionLoading(true);
    setShowStatusDropdown(false);
    try {
      // Update booking status
      await base44.entities.Booking.update(booking.id, { status: newStatus });
      setBooking(b => ({ ...b, status: newStatus }));

      // Add system message to the conversation thread
      await base44.entities.ContactMessage.create({
        name: 'Romans Tattoo',
        email: booking.client_email,
        message: getStatusMessage(newStatus, booking),
        sender_type: 'system',
        message_type: 'status_change',
        booking_id: booking.id,
        is_read: true,
      });

      // Send email notification to client
      try {
        await base44.functions.invoke('sendEmailViaResend', {
          to: booking.client_email,
          subject: getStatusEmailSubject(newStatus),
          body: getStatusMessage(newStatus, booking),
        });
      } catch (e) {
        console.warn('Status email failed:', e);
      }

      if (onAction) onAction();
    } catch (e) {
      console.error('Status change failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={14} className="animate-spin" style={{ color: t.fuchsia }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-4 text-center">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em' }}>
          REZERWACJA NIEDOSTĘPNA
        </p>
      </div>
    );
  }

  const timeRange = booking.session_end_time
    ? `${booking.session_time} — ${booking.session_end_time}`
    : booking.session_time || '—';

  return (
    <>
      <div style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.03)', padding: '16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={11} color={t.fuchsia} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              KARTA REZERWACJI
            </p>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: STATUS_COLORS[booking.status],
            border: `0.5px solid ${STATUS_COLORS[booking.status]}`,
            padding: '3px 8px',
          }}>
            {STATUS_LABELS[booking.status]}
          </span>
        </div>

        {/* Session info */}
        <div className="mb-3">
          <p style={{ fontSize: '14px', color: t.text, fontWeight: 500 }}>
            {booking.session_date || '—'} · {timeRange}
          </p>
        </div>

        {/* Details grid */}
        <div className="space-y-1.5 mb-3">
          {booking.service_name && (
            <p style={{ fontSize: '12px', color: t.muted }}>Usługa: <span style={{ color: t.text }}>{booking.service_name}</span></p>
          )}
          {booking.artist_name && (
            <p style={{ fontSize: '12px', color: t.muted }}>Artysta: <span style={{ color: t.text }}>{booking.artist_name}</span></p>
          )}
          {booking.tattoo_placement && (
            <p style={{ fontSize: '12px', color: t.muted }}>Miejsce: <span style={{ color: t.text }}>{booking.tattoo_placement}</span></p>
          )}
          {booking.tattoo_description && (
            <p style={{ fontSize: '12px', color: t.muted }}>Opis: <span style={{ color: t.text }}>{booking.tattoo_description}</span></p>
          )}
          {booking.estimated_price != null && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.fuchsia }}>{booking.estimated_price} PLN</p>
          )}
          {booking.notes && (
            <p style={{ fontSize: '12px', color: t.muted }}>Notatki klienta: <span style={{ color: t.text }}>{booking.notes}</span></p>
          )}
          {booking.admin_notes && (
            <p style={{ fontSize: '12px', color: t.muted }}>Notatki admina: <span style={{ color: t.text }}>{booking.admin_notes}</span></p>
          )}
        </div>

        {/* Reference images */}
        {booking.reference_images && booking.reference_images.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowImages(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              REFERENCJE ({booking.reference_images.length})
              {showImages ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {showImages && (
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {booking.reference_images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full h-14 object-cover" style={{ border: `0.5px solid ${t.border}` }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!readOnly && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange('confirmed')}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: '0.5px solid #16a34a', color: '#16a34a', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <Check size={10} /> POTWIERDŹ
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.muted, cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <X size={10} /> ODRZUĆ
              </button>
            </>
          )}
          {booking.status === 'confirmed' && (
            <>
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: '0.5px solid #2563eb', color: '#2563eb', cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <CheckCircle size={10} /> ZAKOŃCZ
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.muted, cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <X size={10} /> ANULUJ
              </button>
            </>
          )}
          {booking.status === 'cancelled' && (
            <button
              onClick={() => handleStatusChange('pending')}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
            >
              PRZYWRÓĆ
            </button>
          )}

          {/* Change status dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusDropdown(v => !v)}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.muted, cursor: 'pointer' }}
            >
              ZMIEŃ STATUS {showStatusDropdown ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {showStatusDropdown && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#111111', border: `0.5px solid ${t.border}`, zIndex: 50, minWidth: '140px' }}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: booking.status === s ? STATUS_COLORS[s] : t.muted }}
                  >
                    {STATUS_LABELS[s]} {booking.status === s && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit */}
          <button
            onClick={() => setShowEditModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.muted, cursor: 'pointer' }}
          >
            <Edit size={10} /> EDYTUJ
          </button>
        </div>
        )}

        {actionLoading && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 size={10} className="animate-spin" style={{ color: t.fuchsia }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em' }}>PRZETWARZANIE...</p>
          </div>
        )}
      </div>

      {showEditModal && (
        <BookingModal
          booking={booking}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load(); if (onAction) onAction(); }}
          t={t}
        />
      )}
    </>
  );
}