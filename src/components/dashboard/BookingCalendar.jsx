import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

export default function BookingCalendar({ bookings, onDayClick, selectedDate, t, artists = [], onAddBooking, searchQuery = '', onBookingClick }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const today = new Date();
  const effectiveSelectedDate = selectedDate || today;

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Monday start

  const getBookingsForDay = (day) =>
    bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), day));

  const selectedDayBookings = getBookingsForDay(effectiveSelectedDate);

  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </button>
        <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', fontWeight: 400, color: t.title, letterSpacing: '0.08em' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center py-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.1em' }}>
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

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="relative flex flex-col items-center py-2 transition-all duration-200"
              style={{
                background: isSelected ? 'rgba(255,0,127,0.1)' : 'transparent',
                border: isSelected ? `0.5px solid #FF007F` : (searchQuery && dayBookings.length > 0) ? `0.5px solid #FF007F` : isToday ? `0.5px solid ${t.border}` : '0.5px solid transparent',
                cursor: 'pointer',
                minHeight: '52px',
              }}
            >
              <span style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: isSelected ? '#FF007F' : isToday ? t.title : isSameMonth(day, viewMonth) ? t.text : t.muted,
                fontWeight: isToday ? 600 : 400,
              }}>
                {format(day, 'd')}
              </span>
              {/* Booking dots */}
              {dayBookings.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayBookings.slice(0, 3).map((b, i) => (
                    <div key={i} className="rounded-full" style={{ width: '5px', height: '5px', background: STATUS_COLORS[b.status] || '#FF007F', flexShrink: 0 }} />
                  ))}
                  {dayBookings.length > 3 && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted }}>+{dayBookings.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day sessions / empty state */}
      {(selectedDayBookings.length > 0 || selectedDate) && (
        <div className="mt-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Sesje — {format(effectiveSelectedDate, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}
          </p>
          {selectedDayBookings.length === 0 && !searchQuery.trim() ? (
            <div className="py-8 text-center" style={{ border: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.02)' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
              <button onClick={onAddBooking} className="btn-oxblood" style={{ fontSize: '10px', padding: '8px 20px' }}>
                + DODAJ SESJĘ
              </button>
            </div>
          ) : selectedDayBookings.length > 0 && !searchQuery.trim() && (
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              {selectedDayBookings.map((b, i) => {
                const artist = artists.find(a => a.id === b.artist_id);
                return (
                  <div key={b.id} onClick={() => onBookingClick?.(b)} style={{ borderBottom: i < selectedDayBookings.length - 1 ? `0.5px solid ${t.border}` : 'none', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,127,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Time */}
                    <div className="flex-shrink-0 text-center" style={{ minWidth: '48px' }}>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: STATUS_COLORS[b.status] || t.fuchsia, letterSpacing: '0.05em' }}>{b.session_time}</p>
                      {b.session_end_time ? (
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted }}>→ {b.session_end_time}</p>
                      ) : null}
                    </div>
                    
                    {/* Artist photo + client info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {artist?.photo_url ? (
                        <img src={artist.photo_url} alt={artist.name} loading="lazy" width={28} height={28} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`, flexShrink: 0 }} />
                      ) : b.artist_name ? (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,0,127,0.12)', border: '1px solid rgba(255,0,127,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', color: '#FF007F', fontFamily: 'Bebas Neue, system-ui' }}>{b.artist_name.charAt(0)}</span>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                        </p>
                        {b.service_name && (
                          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                            {b.service_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Price + status */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {b.service_id && (b.estimated_price === 0 || b.estimated_price === null || b.estimated_price === undefined || b.estimated_price === '') ? (
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>BEZPŁATNA</span>
                      ) : b.estimated_price > 0 ? (
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{b.estimated_price} PLN</span>
                      ) : null}
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
                    </div>
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
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}