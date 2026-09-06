import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getArtistsOffForDate } from '@/lib/bookingConflicts';
import { resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import HealthFormBadge from '@/components/booking/HealthFormBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { getThumbnailUrl } from '@/lib/thumbnail';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

export default function BookingCalendar({ bookings, onDayClick, selectedDate, t, artists = [], onAddBooking, searchQuery = '', onBookingClick, availabilityRecords = [], artistFilter = 'all', healthStatusMap = {}, showSessionsList = true }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const isMobile = useIsMobile();
  const today = new Date();
  const effectiveSelectedDate = selectedDate || today;

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Monday start

  const sortByTime = (arr) => [...arr].sort((a, b) => {
    const ta = (a.session_time || '99:99').replace(':', '');
    const tb = (b.session_time || '99:99').replace(':', '');
    return ta.localeCompare(tb);
  });

  // Precompute off-artists per visible day once per data change, instead of per-day-per-render.
  const offByDate = useMemo(() => {
    const map = {};
    for (const day of [...days, effectiveSelectedDate]) {
      const ds = format(day, 'yyyy-MM-dd');
      if (!map[ds]) map[ds] = getArtistsOffForDate(availabilityRecords, artists, artistFilter, ds);
    }
    return map;
  }, [days, effectiveSelectedDate, availabilityRecords, artists, artistFilter]);

  const getBookingsForDay = (day) =>
    sortByTime(bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), day)));

  const selectedDayBookings = getBookingsForDay(effectiveSelectedDate);
  const selectedDateStr = format(effectiveSelectedDate, 'yyyy-MM-dd');
  const selectedDayOff = offByDate[selectedDateStr] || [];

  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  return (
    <div className="p-3 sm:p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </button>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.08em' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center py-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted, letterSpacing: '0.1em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding */}
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

        {days.map(day => {
          const dayBookings = getBookingsForDay(day);
          const isSelected = isSameDay(day, effectiveSelectedDate);
          const isToday = isSameDay(day, today);
          const dayOff = offByDate[format(day, 'yyyy-MM-dd')] || [];
          const isOffDay = dayOff.length > 0;
          // Full-day off = no time range on any entry; partial = at least one entry has a time range
          const isFullDayOff = isOffDay && dayOff.every(o => !o.timeRange);
          const offTitle = isOffDay ? dayOff.map(o => `${o.artist.name}${o.note ? ` (${o.note})` : ''}${o.timeRange ? ` · ${o.timeRange}` : ' · cały dzień'}`).join(', ') : '';

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="relative flex flex-col items-center py-2 transition-all duration-200"
              style={{
                background: isSelected
                  ? 'rgb(var(--brand-rgb) /0.12)'
                  : isFullDayOff
                    ? 'repeating-linear-gradient(45deg, rgb(var(--brand-rgb) /0.10) 0px, rgb(var(--brand-rgb) /0.10) 3px, rgb(var(--brand-rgb) /0.03) 3px, rgb(var(--brand-rgb) /0.03) 8px)'
                    : 'transparent',
                border: isSelected
                  ? '0.5px solid var(--brand)'
                  : isOffDay
                    ? '0.5px solid rgb(var(--brand-rgb) /0.35)'
                    : (searchQuery && dayBookings.length > 0) ? `0.5px solid var(--brand)` : isToday ? `0.5px solid ${t.border}` : '0.5px solid transparent',
                cursor: 'pointer',
                minHeight: '52px',
                opacity: isFullDayOff && !isSelected ? 0.75 : 1,
              }}
              title={offTitle}
            >
              {isOffDay && (
                <span style={{ position: 'absolute', top: '2px', left: '3px', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.02em', lineHeight: 1 }} >
                  {dayOff.length}
                </span>
              )}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                color: isSelected ? 'var(--brand)' : isOffDay ? 'var(--brand)' : isToday ? t.title : isSameMonth(day, viewMonth) ? t.text : t.muted,
                fontWeight: isToday ? 600 : 400,
              }}>
                {format(day, 'd')}
              </span>
              {/* Booking dots */}
              {dayBookings.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayBookings.slice(0, 3).map((b, i) => (
                    <div key={i} className="rounded-full" style={{ width: '5px', height: '5px', background: STATUS_COLORS[b.status] || 'var(--brand)', flexShrink: 0 }} />
                  ))}
                  {dayBookings.length > 3 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted }}>+{dayBookings.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day sessions / empty state */}
      {showSessionsList && (selectedDayBookings.length > 0 || selectedDate) && (
        <div className="mt-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Sesje — {format(effectiveSelectedDate, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}
          </p>
          {selectedDayOff.length > 0 && (
            <div className="mb-3 space-y-1">
              {selectedDayOff.map((o, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ border: `0.5px solid rgb(var(--brand-rgb) /0.25)`, background: 'rgb(var(--brand-rgb) /0.05)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: 'var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.06em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    WOLNE · {o.artist.name}{o.timeRange ? ` · ${o.timeRange}` : ' · cały dzień'}{o.note ? ` · ${o.note}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {selectedDayBookings.length === 0 && !searchQuery.trim() ? (
            <div className="py-8 text-center" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.02)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
              <button onClick={onAddBooking} className="btn-oxblood" style={{ fontSize: '10px', padding: '8px 20px' }}>
                + DODAJ SESJĘ
              </button>
            </div>
          ) : selectedDayBookings.length > 0 && !searchQuery.trim() && (
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              {selectedDayBookings.map((b, i) => {
                const artist = artists.find(a => a.id === b.artist_id);
                return (
                  <div key={b.id} onClick={() => onBookingClick?.(b)} style={{ borderBottom: i < selectedDayBookings.length - 1 ? `0.5px solid ${t.border}` : 'none', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Time */}
                    <div className="flex-shrink-0 text-center" style={{ minWidth: isMobile ? '42px' : '52px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '13px' : '16px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
                      {b.session_end_time ? (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? '9px' : '11px', color: t.muted }}>→ {b.session_end_time}</p>
                      ) : null}
                    </div>
                    
                    {/* Artist photo + client info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {artist?.photo_url ? (
                        <img src={getThumbnailUrl(artist.photo_url, 80, 60)} alt={artist.name} loading="lazy" width={40} height={40} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
                      ) : (artist || b.artist_name) ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--brand)', letterSpacing: '0.05em' }}>
                            {(artist?.name || b.artist_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        {isMobile ? (() => {
                          const parts = (b.client_name || '').split(' ');
                          const first = parts[0] || '';
                          const last = parts.slice(1).join(' ');
                          return (
                            <>
                              <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{first}</p>
                              {last && <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{last}</p>}
                            </>
                          );
                        })() : (
                          <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                        )}
                        {!isMobile && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                          </p>
                        )}
                        {isMobile && b.tattoo_placement && (
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
                    
                    {/* Price + status */}
                    {isMobile ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted, letterSpacing: '0.04em' }}>BEZPŁATNA</span>
                          ) : b.estimated_price > 0 ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{b.estimated_price} PLN</span>
                          ) : null}
                          <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="8px" style={{ padding: '1px 4px' }} />
                        </div>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
                        {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted, letterSpacing: '0.06em' }}>BEZPŁATNA</span>
                        ) : b.estimated_price > 0 ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>
                        ) : null}
                        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-6 pt-4 flex-wrap" style={{ borderTop: `0.5px solid ${t.border}` }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: '6px', height: '6px', background: color }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}