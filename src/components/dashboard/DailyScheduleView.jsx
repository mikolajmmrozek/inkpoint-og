import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
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

function BookingTile({ booking, onClick, colWidth, t }) {
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
      data-booking-tile="true"
      onClick={(e) => { e.stopPropagation(); onClick(booking); }}
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
        <p style={{ fontSize: '11px', color: t.text, fontWeight: 500, lineHeight: 1.3, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.client_name}
        </p>
      )}
      {height >= 60 && booking.tattoo_placement && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.tattoo_placement}
        </p>
      )}
      {height >= 80 && booking.estimated_price && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '1px' }}>
          {booking.estimated_price} PLN
        </p>
      )}
    </div>
  );
}

export default function DailyScheduleView({ bookings, artists, selectedDate, onDateChange, onBookingClick, onNewBookingRequest, t }) {
  const [mobileArtistIdx, setMobileArtistIdx] = useState(0);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const scrollRef = useRef(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = bookings.filter(b => b.session_date === dateStr);
  const activeArtists = artists.filter(a => a.is_active !== false);
  const showNowLine = isToday(selectedDate);

  // Hours to show on left axis
  const hours = [];
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) {
    hours.push(h);
  }
  const totalHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  // Update now line every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time when view opens
  useEffect(() => {
    if (scrollRef.current && showNowLine) {
      const nowTop = Math.max(0, (nowMinutes - DAY_START)) * PX_PER_MIN;
      const scrollTarget = Math.max(0, nowTop - 100);
      scrollRef.current.scrollTop = scrollTarget;
    }
  }, [showNowLine]);

  const handleColumnClick = (e, artist) => {
    // Don't trigger if clicking on a booking tile
    if (e.target.closest('[data-booking-tile]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top + e.currentTarget.parentElement.scrollTop;
    const clickedMin = Math.round((offsetY / PX_PER_MIN + DAY_START) / 15) * 15;
    const h = String(Math.floor(clickedMin / 60)).padStart(2, '0');
    const m = String(clickedMin % 60).padStart(2, '0');
    const time = `${h}:${m}`;
    onNewBookingRequest?.({ artist, time, date: dateStr });
  };

  const nowTop = showNowLine ? Math.max(0, (nowMinutes - DAY_START)) * PX_PER_MIN : null;

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
      {/* Now indicator on time axis */}
      {showNowLine && nowTop !== null && (
        <div style={{ position: 'absolute', top: `${nowTop}px`, right: 0, left: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 3 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF007F', marginRight: '2px', flexShrink: 0 }} />
        </div>
      )}
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
      {/* Now line */}
      {showNowLine && nowTop !== null && (
        <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, right: 0, borderTop: '1px solid #FF007F', pointerEvents: 'none', zIndex: 2, opacity: 0.7 }} />
      )}
    </>
  );

  const ArtistColumn = ({ artist }) => {
    const artistBookings = dayBookings.filter(b => b.artist_id === artist.id);
    return (
      <div
        onClick={(e) => handleColumnClick(e, artist)}
        style={{ flex: 1, minWidth: 0, position: 'relative', height: `${totalHeight}px`, borderLeft: `0.5px solid ${t.border}`, cursor: 'crosshair' }}
      >
        <GridLines />
        {artistBookings.map(b => (
          <BookingTile key={b.id} booking={b} onClick={onBookingClick} t={t} />
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
              className="flex items-center gap-2"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '9px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                border: 'none',
                borderBottom: mobileArtistIdx === i ? '2px solid #FF007F' : '2px solid transparent',
                color: mobileArtistIdx === i ? '#FF007F' : t.muted,
                background: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {a.photo_url ? (
                <img
                  src={a.photo_url}
                  alt={a.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: mobileArtistIdx === i ? '1.5px solid #FF007F' : `1px solid ${t.border}`, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,0,127,0.15)', border: mobileArtistIdx === i ? '1.5px solid #FF007F' : `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '9px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{a.name.charAt(0)}</span>
                </div>
              )}
              {a.name.split(' ')[0]}
              {count > 0 && <span style={{ color: '#FF007F' }}>({count})</span>}
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
              className="flex flex-col items-center"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderLeft: `0.5px solid ${t.border}`,
                gap: '6px',
              }}
            >
              {a.photo_url ? (
                <img
                  src={a.photo_url}
                  alt={a.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${t.border}`, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,0,127,0.12)', border: `1px solid rgba(255,0,127,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{a.name.charAt(0)}</span>
                </div>
              )}
              <div className="text-center">
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1rem', color: t.title, letterSpacing: '0.06em', lineHeight: 1 }}>
                  {a.name}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: count > 0 ? '#FF007F' : t.muted, marginTop: '2px', letterSpacing: '0.06em' }}>
                  {count} {count === 1 ? 'SESJA' : count >= 2 && count <= 4 ? 'SESJE' : 'SESJI'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline body */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
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