import { Users, ExternalLink } from 'lucide-react';
import LeaderStack from '@/components/events/LeaderStack';
import { EVENT_COLOR, eventLeaderNames } from '@/lib/calendarEvents';

const STATUS_LABELS = { draft: 'SZKIC', hidden: 'UKRYTE' };

/**
 * Wiersz terminu oferty w kalendarzu rezerwacji (miesiąc / dzień / lista).
 * Wyróżniony bursztynowym akcentem, ze stosem avatary prowadzących.
 */
export default function EventRow({ entry, t, isLast = false, isMobile = false }) {
  const accent = entry.cancelled ? t.muted : EVENT_COLOR;
  const names = eventLeaderNames(entry);
  const statusLabel = entry.cancelled ? 'ANULOWANA' : STATUS_LABELS[entry.event_status];

  const open = () => {
    if (entry.slug) window.open(`/wydarzenia/${entry.slug}`, '_blank', 'noopener');
  };

  return (
    <div
      onClick={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '10px' : '12px',
        padding: '12px',
        borderBottom: isLast ? 'none' : `0.5px solid ${t.border}`,
        cursor: entry.slug ? 'pointer' : 'default',
        background: 'transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Godzina */}
      <div className="flex-shrink-0 text-center" style={{ minWidth: isMobile ? '42px' : '52px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '12px' : '14px', color: accent, letterSpacing: '0.05em' }}>
          {entry.start_time || '—'}
        </p>
        {entry.end_time ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '11px', color: t.muted }}>→ {entry.end_time}</p>
        ) : null}
      </div>

      {/* Prowadzący + tytuł */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <LeaderStack people={[...(entry.leaders || []), ...(entry.external_leaders || []).map(n => ({ name: n }))]} size={isMobile ? 32 : 38} ring={t.bg} />
        <div className="min-w-0">
          <p style={{ color: t.text, fontSize: isMobile ? '14px' : '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: entry.cancelled ? 'line-through' : 'none' }}>
            {entry.title}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            OFERTA{names.length > 0 ? ` · ${names.join(', ')}` : ''}
          </p>
        </div>
      </div>

      {/* Miejsca + status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {entry.capacity > 0 && (
          <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '10px', color: entry.full ? '#ef4444' : t.muted }}>
            <Users size={11} color={entry.full ? '#ef4444' : accent} />
            {entry.taken}/{entry.capacity}
          </span>
        )}
        {statusLabel && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: accent, border: `0.5px solid ${accent}`, padding: '2px 5px', letterSpacing: '0.08em' }}>
            {statusLabel}
          </span>
        )}
        {entry.slug && !isMobile && <ExternalLink size={12} color={t.muted} />}
      </div>
    </div>
  );
}