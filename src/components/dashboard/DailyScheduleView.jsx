import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const PX_PER_MIN = 2;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * PX_PER_MIN;

const HOURS = [];
for (let h = DAY_START / 60; h <= DAY_END / 60; h++) HOURS.push(h);

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const NowLine = memo(function NowLine() {
  const [nowTop, setNowTop] = useState(() => {
    const n = new Date();
    return Math.max(0, (n.getHours() * 60 + n.getMinutes() - DAY_START)) * PX_PER_MIN;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowTop(Math.max(0, (n.getHours() * 60 + n.getMinutes() - DAY_START)) * PX_PER_MIN);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, right: 0, borderTop: '1px solid #FF007F', pointerEvents: 'none', zIndex: 2, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: `${nowTop}px`, left: '44px', width: '8px', height: '8px', borderRadius: '50%', background: '#FF007F', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3 }} />
    </>
  );
});

// Static grid — rendered once, border color passed via CSS variable trick via inline SVG background
// We keep the memo but use a stable border via context comparison
const GridLines = memo(function GridLines({ border }) {
  return (
    <>
      {HOURS.map(h => (
        <div key={h} style={{ position: 'absolute', top: `${(h * 60 - DAY_START) * PX_PER_MIN}px`, left: 0, right: 0, borderTop: `0.5px solid ${border}`, pointerEvents: 'none', zIndex: 0 }} />
      ))}
    </>
  );
}, (prev, next) => prev.border === next.border);

const BookingTile = memo(function BookingTile({ booking, onClick, t }) {
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
        top: `${top}px`, height: `${height}px`,
        left: '2px', right: '2px',
        background: `${color}18`,
        borderLeft: `2px solid ${color}`,
        borderTop: `0.5px solid ${color}40`,
        borderRight: `0.5px solid ${color}40`,
        borderBottom: `0.5px solid ${color}40`,
        cursor: 'pointer', padding: '4px 6px', overflow: 'hidden',
        transition: 'background 0.15s', zIndex: 1,
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
});

const TimeAxis = memo(function TimeAxis({ muted }) {
  return (
    <div style={{ position: 'relative', height: `${TOTAL_HEIGHT}px`, width: '44px', flexShrink: 0 }}>
      {HOURS.map(h => (
        <div key={h} style={{ position: 'absolute', top: `${(h * 60 - DAY_START) * PX_PER_MIN}px`, right: '8px', fontFamily: 'JetBrains Mono', fontSize: '8px', color: muted, letterSpacing: '0.05em', lineHeight: 1, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );
}, (prev, next) => prev.muted === next.muted);

const ArtistColumn = memo(function ArtistColumn({ artist, artistBookings, onColumnClick, onBookingClick, border, t }) {
  const handleClick = useCallback((e) => onColumnClick(e, artist), [onColumnClick, artist]);
  return (
    <div
      onClick={handleClick}
      style={{ flex: 1, minWidth: 0, position: 'relative', height: `${TOTAL_HEIGHT}px`, borderLeft: `0.5px solid ${border}`, cursor: 'crosshair' }}
    >
      <GridLines border={border} />
      {artistBookings.map(b => (
        <BookingTile key={b.id} booking={b} onClick={onBookingClick} t={t} />
      ))}
    </div>
  );
});

export default function DailyScheduleView({ bookings, artists, selectedDate, onDateChange, onBookingClick, onNewBookingRequest, t, artistFilter = 'all' }) {
  const scrollRef = useRef(null);

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const showNowLine = useMemo(() => isToday(selectedDate), [selectedDate]);
  const activeArtists = useMemo(() => artists.filter(a => a.is_active !== false), [artists]);

  const dayBookings = useMemo(
    () => bookings.filter(b => b.session_date === dateStr),
    [bookings, dateStr]
  );

  const bookingsByArtist = useMemo(() => {
    const map = {};
    for (const b of dayBookings) {
      if (!map[b.artist_id]) map[b.artist_id] = [];
      map[b.artist_id].push(b);
    }
    return map;
  }, [dayBookings]);

  useEffect(() => {
    if (scrollRef.current && showNowLine) {
      const n = new Date();
      const nowTop = Math.max(0, (n.getHours() * 60 + n.getMinutes() - DAY_START)) * PX_PER_MIN;
      scrollRef.current.scrollTop = Math.max(0, nowTop - 100);
    }
  }, [showNowLine]);

  const handleColumnClick = useCallback((e, artist) => {
    if (e.target.closest('[data-booking-tile]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top + e.currentTarget.parentElement.scrollTop;
    const clickedMin = Math.round((offsetY / PX_PER_MIN + DAY_START) / 15) * 15;
    const h = String(Math.floor(clickedMin / 60)).padStart(2, '0');
    const m = String(clickedMin % 60).padStart(2, '0');
    onNewBookingRequest?.({ artist, time: `${h}:${m}`, date: dateStr });
  }, [onNewBookingRequest, dateStr]);

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <button onClick={() => onDateChange(subDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={16} />
        </button>
        <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.3rem', fontWeight: 400, color: t.title, letterSpacing: '0.08em' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Artist headers (sticky) */}
      <div style={{ display: 'flex', minWidth: 'min-content', borderBottom: `0.5px solid ${t.border}` }}>
        <div style={{ width: '44px', flexShrink: 0, borderBottom: `0.5px solid ${t.border}`, padding: '8px 0' }} />
        {(artistFilter === 'all' ? activeArtists : activeArtists.filter(a => a.id === artistFilter)).map(a => (
          <div key={`header-${a.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: '6px', borderLeft: `0.5px solid ${t.border}` }}>
            {a.photo_url ? (
              <img src={a.photo_url} alt={a.name} loading="lazy" width={28} height={28} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,0,127,0.15)', border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{a.name.charAt(0)}</span>
              </div>
            )}
            <p className="hidden sm:block" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.name}
            </p>
          </div>
        ))}
      </div>

      {/* Timeline body */}
      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '600px' }}>
        <div style={{ display: 'flex', minWidth: 'min-content' }}>
          <TimeAxis muted={t.muted} />
          {(artistFilter === 'all' ? activeArtists : activeArtists.filter(a => a.id === artistFilter)).map(a => (
            <ArtistColumn
              key={a.id}
              artist={a}
              artistBookings={bookingsByArtist[a.id] || []}
              onColumnClick={handleColumnClick}
              onBookingClick={onBookingClick}
              border={t.border}
              t={t}
            />
          ))}
          {showNowLine && <NowLine />}
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
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK SESJI W TEN DZIEŃ</span>
        )}
      </div>
    </div>
  );
}