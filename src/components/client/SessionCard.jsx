import { format, parseISO, isAfter, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, User, MapPin, MessageSquare, RefreshCw } from 'lucide-react';

const STATUS_LABELS = { pending: 'Oczekująca', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

export default function SessionCard({ booking, theme = 'dark', onChangeRequest, onMessage, showActions }) {
  const t = theme === 'light'
    ? { border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.4)', mutedLow: 'rgba(0,0,0,0.3)', fuchsia: '#FF007F' }
    : { border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', mutedLow: 'rgba(245,240,235,0.3)', fuchsia: '#FF007F' };

  const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#16a34a', completed: '#3b82f6', cancelled: theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)' };

  const isCancelled = booking.status === 'cancelled';
  const isPast = booking.session_date ? !isAfter(parseISO(booking.session_date), new Date()) && !isToday(parseISO(booking.session_date)) : true;

  let dateStr = booking.session_date || '—';
  try { dateStr = format(parseISO(booking.session_date), 'd MMMM yyyy', { locale: pl }); } catch {}

  return (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, opacity: isCancelled ? 0.5 : 1 }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', color: t.text, letterSpacing: '0.04em', lineHeight: 1 }}>
            {dateStr}
          </h3>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {booking.session_time && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>
                <Clock size={10} /> {booking.session_time}
                {booking.session_end_time ? `–${booking.session_end_time}` : ''}
              </span>
            )}
            {booking.artist_name && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>
                <User size={10} /> {booking.artist_name}
              </span>
            )}
            {booking.tattoo_placement && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>
                <MapPin size={10} /> {booking.tattoo_placement}
              </span>
            )}
          </div>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: STATUS_COLORS[booking.status], letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[booking.status]}`, flexShrink: 0 }}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      </div>

      {booking.tattoo_description && (
        <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5, marginBottom: '8px' }}>
          {booking.tattoo_description}
        </p>
      )}

      {booking.notes && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.mutedLow, marginTop: '6px', padding: '6px 10px', background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderLeft: `1px solid ${t.fuchsia}` }}>
          {booking.notes}
        </p>
      )}

      {/* Actions */}
      {showActions && !isCancelled && !isPast && (
        <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button
            onClick={() => onChangeRequest(booking)}
            className="flex items-center gap-2"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}
          >
            <RefreshCw size={11} /> POPROŚ O ZMIANĘ TERMINU
          </button>
          <button
            onClick={() => onMessage(booking)}
            className="flex items-center gap-2"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
          >
            <MessageSquare size={11} /> WYŚLIJ WIADOMOŚĆ
          </button>
        </div>
      )}
    </div>
  );
}