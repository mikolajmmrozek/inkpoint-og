import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getAvailabilityForDay } from '@/components/dashboard/ArtistScheduleEditor';
import { isArtistOffOnDate } from '@/lib/bookingConflicts';
import { getThumbnailUrl } from '@/lib/thumbnail';
import { getBreaksForDay } from '@/lib/availability';
import DaySlotActionModal from '@/components/dashboard/DaySlotActionModal';
import LeaderStack from '@/components/events/LeaderStack';
import { EVENT_COLOR, eventTimeLabel } from '@/lib/calendarEvents';

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
      <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, right: 0, borderTop: '1px solid var(--brand)', pointerEvents: 'none', zIndex: 2, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3 }} />
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
  const color = STATUS_COLORS[booking.status] || 'var(--brand)';

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
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {booking.session_time}–{endTime}
      </p>
      {height >= 40 && (
        <p style={{ fontSize: '11px', color: t.text, fontWeight: 500, lineHeight: 1.3, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.client_name}
        </p>
      )}
      {height >= 60 && booking.tattoo_placement && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.tattoo_placement}
        </p>
      )}
      {height >= 80 && booking.estimated_price && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '1px' }}>
          {booking.estimated_price} PLN
        </p>
      )}
    </div>
  );
});

// Termin oferty w kolumnie prowadzącego — blokuje czas tak jak sesja.
const EventTile = memo(function EventTile({ entry, t }) {
  const startMin = toMinutes(entry.start_time);
  if (startMin === null) return null;

  const endMin = toMinutes(entry.end_time) || startMin + 120;
  const top = Math.max(0, startMin - DAY_START) * PX_PER_MIN;
  const height = Math.max(30, (endMin - startMin) * PX_PER_MIN);

  return (
    <div
      data-booking-tile="true"
      title={entry.title}
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        left: '2px',
        right: '2px',
        background: 'rgba(245,158,11,0.14)',
        borderLeft: `2px solid ${EVENT_COLOR}`,
        borderTop: `0.5px solid rgba(245,158,11,0.45)`,
        borderRight: `0.5px solid rgba(245,158,11,0.45)`,
        borderBottom: `0.5px solid rgba(245,158,11,0.45)`,
        padding: '4px 6px',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: EVENT_COLOR, letterSpacing: '0.06em', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {entry.start_time}{entry.end_time ? `–${entry.end_time}` : ''}
      </p>
      {height >= 40 && (
        <p style={{ fontSize: '11px', color: t.text, fontWeight: 500, lineHeight: 1.3, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.title}
        </p>
      )}
      {height >= 64 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px', letterSpacing: '0.08em' }}>OFERTA</p>
      )}
    </div>
  );
});

const TimeAxis = memo(function TimeAxis({ muted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: `${TOTAL_HEIGHT}px`, width: '44px', flexShrink: 0, position: 'relative' }}>
      {HOURS.map(h => (
        <div key={h} style={{ position: 'absolute', top: `${(h * 60 - DAY_START) * PX_PER_MIN}px`, left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, letterSpacing: '0.05em', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );
}, (prev, next) => prev.muted === next.muted);

const ArtistColumn = memo(function ArtistColumn({ artist, artistBookings, artistEvents = [], onColumnClick, onBookingClick, border, t, isLast, availability, breaks = [] }) {
  const handleClick = useCallback((e) => onColumnClick(e, artist), [onColumnClick, artist]);

  // Calculate inactive overlay regions
  const inactiveRegions = useMemo(() => {
    if (!availability) return [];
    const regions = [];
    if (!availability.isWorkday) {
      // Whole day inactive
      regions.push({ top: 0, height: TOTAL_HEIGHT });
    } else {
      const startMin = toMinutes(availability.start_time) || DAY_START;
      const endMin = toMinutes(availability.end_time) || DAY_END;
      // Before work hours
      if (startMin > DAY_START) {
        regions.push({ top: 0, height: (startMin - DAY_START) * PX_PER_MIN });
      }
      // After work hours
      if (endMin < DAY_END) {
        regions.push({ top: (endMin - DAY_START) * PX_PER_MIN, height: (DAY_END - endMin) * PX_PER_MIN });
      }
    }
    return regions;
  }, [availability]);

  return (
    <div
      onClick={handleClick}
      style={{ flex: 1, minWidth: 0, position: 'relative', height: `${TOTAL_HEIGHT}px`, borderLeft: `0.5px solid ${border}`, borderRight: isLast ? `0.5px solid ${border}` : 'none', cursor: 'crosshair' }}
    >
      <GridLines border={border} />
      {/* Inactive hour overlays */}
      {inactiveRegions.map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: `${r.top}px`, left: 0, right: 0, height: `${r.height}px`, background: 'repeating-linear-gradient(45deg, rgba(128,128,128,0.06) 0px, rgba(128,128,128,0.06) 3px, transparent 3px, transparent 9px)', pointerEvents: 'none', zIndex: 0, borderTop: r.top > 0 ? `0.5px dashed rgba(128,128,128,0.2)` : 'none', borderBottom: r.top === 0 ? `0.5px dashed rgba(128,128,128,0.2)` : 'none' }} />
      ))}
      {/* Przerwy (obiad) — zakreskowane bloki */}
      {breaks.map(brk => {
        const startMin = toMinutes(brk.start_time);
        const endMin = toMinutes(brk.end_time);
        if (startMin === null || endMin === null || endMin <= startMin) return null;
        const top = Math.max(0, (startMin - DAY_START)) * PX_PER_MIN;
        const height = Math.max(16, (endMin - startMin) * PX_PER_MIN);
        return (
          <div
            key={`break-${brk.id}`}
            style={{
              position: 'absolute', top: `${top}px`, height: `${height}px`, left: 0, right: 0,
              background: 'repeating-linear-gradient(45deg, rgba(128,128,128,0.16) 0px, rgba(128,128,128,0.16) 3px, transparent 3px, transparent 9px)',
              borderTop: '0.5px dashed rgba(128,128,128,0.4)',
              borderBottom: '0.5px dashed rgba(128,128,128,0.4)',
              pointerEvents: 'none', zIndex: 1, padding: '2px 4px', overflow: 'hidden',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PRZERWA {brk.start_time}–{brk.end_time}
            </span>
          </div>
        );
      })}
      {artistEvents.map(e => (
        <EventTile key={`event-${e.id}`} entry={e} t={t} />
      ))}
      {artistBookings.map(b => (
        <BookingTile key={b.id} booking={b} onClick={onBookingClick} t={t} />
      ))}
    </div>
  );
});

export default function DailyScheduleView({ bookings, artists, selectedDate, onDateChange, onBookingClick, onNewBookingRequest, onNewAvailabilityRequest, t, artistFilter = 'all', availabilityRecords = [], calendarEvents = [] }) {
  const scrollRef = useRef(null);
  const [slot, setSlot] = useState(null);

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const showNowLine = useMemo(() => isToday(selectedDate), [selectedDate]);
  const activeArtists = useMemo(() => artists.filter(a => a.is_active !== false), [artists]);
  const selectedArtistIds = useMemo(() => Array.isArray(artistFilter)
    ? artistFilter
    : (artistFilter && artistFilter !== 'all' ? [artistFilter] : []),
    [artistFilter]);
  const displayedArtists = useMemo(() => selectedArtistIds.length > 0
    ? activeArtists.filter(a => selectedArtistIds.includes(a.id))
    : activeArtists,
    [activeArtists, selectedArtistIds]);

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

  const dayEvents = useMemo(
    () => calendarEvents
      .filter(e => e.session_date === dateStr)
      .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99')),
    [calendarEvents, dateStr]
  );

  const eventsByArtist = useMemo(() => {
    const map = {};
    for (const e of dayEvents) {
      for (const id of e.leader_ids || []) {
        if (!map[id]) map[id] = [];
        map[id].push(e);
      }
    }
    return map;
  }, [dayEvents]);

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
    setSlot({ artist, artistName: artist?.name, time: `${h}:${m}`, date: dateStr });
  }, [dateStr]);

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, width: '100%', boxSizing: 'border-box' }}>
      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <button onClick={() => onDateChange(subDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={16} />
        </button>
        <p className="flex-1 min-w-0 text-center truncate" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 4vw, 1.3rem)', fontWeight: 400, color: t.title, letterSpacing: '0.08em' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Artist headers (sticky) */}
      <div style={{ display: 'flex', width: '100%', borderBottom: `0.5px solid ${t.border}` }}>
        <div style={{ width: '44px', flexShrink: 0, borderLeft: `0.5px solid ${t.border}` }} />
        {displayedArtists.map(a => {
          const off = availabilityRecords.length > 0 ? isArtistOffOnDate(availabilityRecords, a.id, dateStr) : { off: false };
          return (
          <div key={`header-${a.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: '4px', borderLeft: `0.5px solid ${t.border}` }}>
            {a.photo_url ? (
              <img src={getThumbnailUrl(a.photo_url, 56, 60)} alt={a.name} loading="lazy" width={28} height={28} style={{ width: '28px', height: '28px', borderRadius: 'var(--radius)', objectFit: 'cover', border: `1px solid ${off.off ? 'var(--brand)' : t.border}`, flexShrink: 0, opacity: off.off ? 0.55 : 1 }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius)', background: off.off ? 'rgb(var(--brand-rgb) /0.15)' : 'rgb(var(--brand-rgb) /0.15)', border: `1px solid ${off.off ? 'var(--brand)' : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: off.off ? 'var(--brand)' : 'var(--brand)', fontFamily: 'var(--font-display)' }}>{a.name.charAt(0)}</span>
              </div>
            )}
            <p className="hidden sm:block" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: off.off ? 'var(--brand)' : t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.name}
            </p>
            {off.off && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', border: '0.5px solid var(--brand)', padding: '1px 4px' }} title={off.note || ''}>
                {off.note ? off.note.toUpperCase().slice(0, 10) : 'URLOP'}
              </span>
            )}
          </div>
          );
        })}
      </div>

      {/* Oferty w tym dniu — widoczne także dla szkiców i ukrytych ofert */}
      {dayEvents.length > 0 && (
        <div style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgba(245,158,11,0.06)' }}>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: EVENT_COLOR, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Oferty w tym dniu
            </p>
            {dayEvents.map(e => (
              <div key={e.id} className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: EVENT_COLOR, flexShrink: 0, minWidth: '74px' }}>
                  {eventTimeLabel(e)}
                </span>
                <LeaderStack
                  people={[...(e.leaders || []), ...(e.external_leaders || []).map(n => ({ name: n }))]}
                  size={22}
                  ring={t.bg}
                />
                <span style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {e.title}
                </span>
                {e.capacity > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: e.full ? '#ef4444' : t.muted, flexShrink: 0 }}>
                    {e.taken}/{e.capacity}
                  </span>
                )}
                {e.cancelled && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, border: `0.5px solid ${t.muted}`, padding: '1px 4px', flexShrink: 0 }}>
                    ANULOWANA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline body */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        <div style={{ display: 'flex', width: '100%', minHeight: 0, boxSizing: 'border-box', position: 'relative' }}>
          <TimeAxis muted={t.muted} />
          <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex' }}>
            {(() => {
              return displayedArtists.map((a, idx) => (
                <ArtistColumn
                  key={a.id}
                  artist={a}
                  artistBookings={bookingsByArtist[a.id] || []}
                  artistEvents={eventsByArtist[a.id] || []}
                  onColumnClick={handleColumnClick}
                  onBookingClick={onBookingClick}
                  border={t.border}
                  t={t}
                  isLast={idx === displayedArtists.length - 1}
                  availability={availabilityRecords.length > 0 ? getAvailabilityForDay(availabilityRecords, a.id, dateStr) : null}
                  breaks={availabilityRecords.length > 0 ? getBreaksForDay(availabilityRecords, a.id, new Date(dateStr + 'T12:00:00').getDay()) : []}
                />
              ));
            })()}
            {showNowLine && <NowLine />}
          </div>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {status} ({cnt})
              </span>
            </div>
          );
        })}
        {dayBookings.length === 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK SESJI W TEN DZIEŃ — KLIKNIJ OŚ CZASU, ABY DODAĆ WPIS</span>
        )}
      </div>

      {slot && (
        <DaySlotActionModal
          slot={slot}
          theme={t.bg === '#FFFFFF' ? 'light' : 'dark'}
          onBooking={() => { onNewBookingRequest?.({ artist: slot.artist, time: slot.time, date: slot.date }); setSlot(null); }}
          onAvailability={() => { onNewAvailabilityRequest?.({ artist: slot.artist, time: slot.time, date: slot.date }); setSlot(null); }}
          onClose={() => setSlot(null)}
        />
      )}
    </div>
  );
}