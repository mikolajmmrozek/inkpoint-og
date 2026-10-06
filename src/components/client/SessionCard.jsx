import { useState, useEffect } from 'react';
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, User, Hand, MessageSquare, RefreshCw, Eye, Hourglass } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUS_LABELS = { pending: 'Oczekująca', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

export default function SessionCard({ booking, theme = 'dark', priceLabel, onChangeRequest, onMessage, onPreview, showActions }) {
  const [openChangeRequest, setOpenChangeRequest] = useState(null);

  const t = theme === 'light'
    ? { border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.4)', mutedLow: 'rgba(0,0,0,0.3)', fuchsia: 'var(--brand)' }
    : { border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', mutedLow: 'rgba(245,240,235,0.3)', fuchsia: 'var(--brand)' };

  // Load any open change request for this booking (pending or studio_proposed).
  useEffect(() => {
    if (!showActions || booking.status !== 'confirmed') return;
    let cancelled = false;
    base44.entities.ChangeRequest.filter({ booking_id: booking.id }, '-created_date', 5)
      .then(list => {
        if (cancelled) return;
        const open = list.find(r => r.status === 'pending' || r.status === 'studio_proposed');
        setOpenChangeRequest(open || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [booking.id, showActions, booking.status]);

  const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#16a34a', completed: '#3b82f6', cancelled: theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)' };

  const isCancelled = booking.status === 'cancelled';
  const isPast = booking.session_date ? !isAfter(parseISO(booking.session_date), new Date()) && !isToday(parseISO(booking.session_date)) : true;
  const images = booking.reference_images || [];

  let dateStr = booking.session_date || '—';
  try { dateStr = format(parseISO(booking.session_date), 'd MMMM yyyy', { locale: pl }); } catch {}

  const actionBtn = { fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', background: 'transparent', cursor: 'pointer' };

  return (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, opacity: isCancelled ? 0.5 : 1 }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: t.text, letterSpacing: '0.04em', lineHeight: 1 }}>
            {dateStr}
          </h3>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {booking.session_time && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>
                <Clock size={10} /> {booking.session_time}
                {booking.session_end_time ? `–${booking.session_end_time}` : ''}
              </span>
            )}
            {booking.artist_name && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>
                <User size={10} /> {booking.artist_name}
              </span>
            )}
            {booking.tattoo_placement && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>
                <Hand size={10} /> {booking.tattoo_placement}
              </span>
            )}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: STATUS_COLORS[booking.status], letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[booking.status]}`, flexShrink: 0 }}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      </div>

      {booking.tattoo_description && (
        <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5, marginBottom: '8px' }}>
          {booking.tattoo_description}
        </p>
      )}

      {booking.notes && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.mutedLow, marginTop: '6px', padding: '6px 10px', background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderLeft: `1px solid ${t.fuchsia}` }}>
          {booking.notes}
        </p>
      )}

      {priceLabel && (
        <div className="flex items-baseline gap-2 mt-3 flex-wrap" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
          <span style={{ color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cena orientacyjna</span>
          <span style={{ color: t.text, fontWeight: 600 }}>{priceLabel}</span>
          <span style={{ fontSize: '9px', color: t.mutedLow }}>* zależy od wielkości i wzoru</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.slice(0, 4).map((img, idx) => (
            <img
              key={img + idx}
              src={img}
              alt={`ref-${idx}`}
              onClick={() => onPreview(booking)}
              style={{ width: '52px', height: '52px', objectFit: 'cover', border: `0.5px solid ${t.border}`, cursor: 'pointer' }}
            />
          ))}
          {images.length > 4 && (
            <div
              onClick={() => onPreview(booking)}
              style={{ width: '52px', height: '52px', border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: t.muted, cursor: 'pointer' }}
            >
              +{images.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <button onClick={() => onPreview(booking)} className="flex items-center gap-2" style={{ ...actionBtn, border: `0.5px solid ${t.border}`, color: t.text }}>
          <Eye size={11} /> PODGLĄD I ZDJĘCIA
        </button>
        {showActions && !isCancelled && !isPast && booking.status === 'confirmed' && openChangeRequest && (
          <div className="flex items-center gap-2" style={{ ...actionBtn, border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, cursor: 'default', background: 'rgb(var(--brand-rgb) /0.05)' }}>
            <Hourglass size={11} />
            {openChangeRequest.status === 'studio_proposed'
              ? <a href={`/change-request?id=${openChangeRequest.id}`} style={{ color: t.fuchsia, textDecoration: 'none' }}>STUDIO ZAPROPONOWAŁO TERMIN — SPRAWDŹ</a>
              : 'OCZEKUJE NA POTWIERDZENIE'}
          </div>
        )}
        {showActions && !isCancelled && !isPast && booking.status === 'confirmed' && !openChangeRequest && (
          <>
            <button onClick={() => onChangeRequest(booking)} className="flex items-center gap-2" style={{ ...actionBtn, border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia }}>
              <RefreshCw size={11} /> POPROŚ O ZMIANĘ TERMINU
            </button>
            <button onClick={() => onMessage(booking)} className="flex items-center gap-2" style={{ ...actionBtn, border: `0.5px solid ${t.border}`, color: t.muted }}>
              <MessageSquare size={11} /> WYŚLIJ WIADOMOŚĆ
            </button>
          </>
        )}
      </div>
    </div>
  );
}