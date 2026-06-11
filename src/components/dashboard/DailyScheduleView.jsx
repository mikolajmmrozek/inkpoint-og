import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const DAY_START = 8 * 60;  // 08:00
const DAY_END = 22 * 60;   // 22:00
const PX_PER_MIN = 2;      // 1 minute = 2px → 1h = 120px

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function BookingTile({ booking, onClick, colWidth }) {
  const startMin = toMinutes(booking.session_time);
  if (startMin === null) return null;

  const duration = booking.session_duration || 60;
  const top = Math.max(0, (startMin - DAY_START)) * PX_PER_MIN;
  const height = Math.max(30, duration * PX_PER_MIN);
  const color = STATUS_COLORS[booking.status] || '#FF007F';

  const endTime = booking.session_end_time || (() => {
    const endMin = startMin + duration;
    return `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  })();

  return (
    <div
      onClick={() => onClick(booking)}
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        left: '2px',
        right: '2px',
        background: `${color}18`,
        borderLeft: `2px solid ${color}`,
        borderTop: `0.5px solid ${color}40`,
        borderRight: `0.5px solid ${color}40`,
        borderBottom: `0.5px solid ${color}40`,
        cursor: 'pointer',
        padding: '4px 6px',
        overflow: 'hidden',
        transition: 'background 0.15s',
        zIndex: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}30`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}18`}
    >
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color, letterSpacing: '0.06em', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {booking.session_time}–{endTime}
      </p>
      {height >= 40 && (
        <p style={{ fontSize: '11px', color: '#F5F0EB', fontWeight: 500, lineHeight: 1.3, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.client_name}
        </p>
      )}
      {height >= 60 && booking.tattoo_placement && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.tattoo_placement}
        </p>
      )}
      {height >= 80 && booking.estimated_price && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.4)', marginTop: '1px' }}>
          {booking.estimated_price} PLN
        </p>
      )}
    </div>
  );
}

export default function DailyScheduleView({ bookings, artists, selectedDate, onDateChange, onBookingClick, t }) {
  const [mobileArtistIdx, setMobileArtistIdx] = useState(0);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = bookings.filter(b => b.session_date === dateStr);

  const activeArtists = artists.filter(a => a.is_active !== false);

  // Hours to show on left axis
  const hours = [];
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) {
    hours.push(h);
  }
  const totalHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  const TimeAxis = () => (
    <div style={{ position: 'relative', height: `${totalHeight}px`, width: '44px', flexShrink: 0 }}>
      {hours.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute',
            top: `${(h * 60 - DAY_START) * PX_PER_MIN}px`,
            right: '8px',
            fontFamily: 'JetBrains Mono',
            fontSize: '8px',
            color: t.muted,
            letterSpacing: '0.05em',
            lineHeight: 1,
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );

  const GridLines = () => (
    <>
      {hours.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute',
            top: `${(h * 60 - DAY_START) * PX_PER_MIN}px`,
            left: 0,
            right: 0,
            borderTop: `0.5px solid ${t.border}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}
    </>
  );

  const ArtistColumn = ({ artist }) => {
    const artistBookings = dayBookings.filter(b => b.artist_id === artist.id);
    return (
      <div style={{ flex: 1, minWidth: 0, position: 'relative', height: `${totalHeight}px`, borderLeft: `0.5px solid ${t.border}` }}>
        <GridLines />
        {artistBookings.map(b => (
          <BookingTile key={b.id} booking={b} onClick={onBookingClick} />
        ))}
      </div>
    );
  };

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <button
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <ChevronLeft size={16} />
        </button>
        <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.3rem', fontWeight: 400, color: t.title, letterSpacing: '0.08em' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mobile: artist tabs */}
      <div className="flex md:hidden overflow-x-auto" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        {activeArtists.map((a, i) => {
          const count = dayBookings.filter(b => b.artist_id === a.id).length;
          return (
            <button
              key={a.id}
              onClick={() => setMobileArtistIdx(i)}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '9px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 16px',
                border: 'none',
                borderBottom: mobileArtistIdx === i ? '2px solid #FF007F' : '2px solid transparent',
                color: mobileArtistIdx === i ? '#FF007F' : t.muted,
                background: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {a.name} {count > 0 && <span style={{ color: '#FF007F' }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Desktop: artist headers */}
      <div className="hidden md:flex" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <div style={{ width: '44px', flexShrink: 0 }} />
        {activeArtists.map(a => {
          const count = dayBookings.filter(b => b.artist_id === a.id).length;
          return (
            <div
              key={a.id}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderLeft: `0.5px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1rem', color: t.title, letterSpacing: '0.06em', lineHeight: 1 }}>
                {a.name}
              </p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: count > 0 ? '#FF007F' : t.muted, marginTop: '2px', letterSpacing: '0.06em' }}>
                {count} {count === 1 ? 'SESJA' : count >= 2 && count <= 4 ? 'SESJE' : 'SESJI'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Timeline body */}
      <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        {/* Desktop view */}
        <div className="hidden md:flex">
          <TimeAxis />
          {activeArtists.map(a => (
            <ArtistColumn key={a.id} artist={a} />
          ))}
        </div>

        {/* Mobile view — single artist */}
        <div className="flex md:hidden">
          <TimeAxis />
          {activeArtists[mobileArtistIdx] && (
            <ArtistColumn artist={activeArtists[mobileArtistIdx]} />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex items-center gap-4 flex-wrap" style={{ borderTop: `0.5px solid ${t.border}` }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const cnt = dayBookings.filter(b => b.status === status).length;
          if (cnt === 0) return null;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {status} ({cnt})
              </span>
            </div>
          );
        })}
        {dayBookings.length === 0 && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>
            BRAK SESJI W TEN DZIEŃ
          </span>
        )}
      </div>
    </div>
  );
}