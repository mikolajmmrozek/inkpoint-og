// Admin-style session row for the artist dashboard.
// Matches the admin "Nadchodzące sesje" card: time column, client name,
// service label, ANKIETA badge, status dot — but WITHOUT the artist avatar
// (it's the artist's own view) and WITHOUT a Rozlicz button.
import HealthFormBadge from '@/components/booking/HealthFormBadge';
import { resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import { useIsMobile } from '@/hooks/use-mobile';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

function getEndTime(b) {
  if (b.session_end_time) return b.session_end_time;
  if (b.session_time && b.session_duration) {
    const [h, m] = b.session_time.split(':').map(Number);
    const endTotal = h * 60 + m + b.session_duration;
    return `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
  }
  return null;
}

export default function ArtistSessionRow({ booking, healthStatusMap, t, isLast, onClick }) {
  const isMobile = useIsMobile();
  const b = booking;
  const text = t.text || t.value;
  const endTime = getEndTime(b);
  const statusColor = STATUS_COLORS[b.status] || t.muted;

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 cursor-pointer transition-colors"
      style={{ borderBottom: isLast ? 'none' : `0.5px solid ${t.rowBorder}`, background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Time column */}
        <div className="flex-shrink-0 text-center" style={{ minWidth: isMobile ? '42px' : '52px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '13px' : '16px', color: statusColor, letterSpacing: '0.05em' }}>{b.session_time}</p>
          {endTime && <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '11px', color: t.muted }}>→ {endTime}</p>}
        </div>
        {/* Details — no artist avatar */}
        <div className="min-w-0 flex-1">
          {isMobile ? (() => {
            const parts = (b.client_name || '').split(' ');
            const first = parts[0] || '';
            const last = parts.slice(1).join(' ');
            return (
              <>
                <p style={{ color: text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{first}</p>
                {last && <p style={{ color: text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{last}</p>}
              </>
            );
          })() : (
            <p style={{ color: text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
          )}
          {b.tattoo_placement && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.tattoo_placement}
            </p>
          )}
          {b.service_name && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
              {b.service_name}
            </p>
          )}
        </div>
      </div>

      {/* Right: price + ANKIETA badge + status dot */}
      {isMobile ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-end gap-1">
            {b.estimated_price > 0 ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{b.estimated_price} PLN</span>
            ) : null}
            <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="8px" style={{ padding: '1px 4px' }} />
          </div>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-shrink-0">
          <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
          {b.estimated_price > 0 ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>
          ) : null}
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}