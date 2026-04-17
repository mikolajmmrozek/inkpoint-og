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

export default function BookingCalendar({ bookings, onDayClick, selectedDate, t }) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Monday start

  const getBookingsForDay = (day) =>
    bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), day));

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
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="relative flex flex-col items-center py-2 transition-all duration-200"
              style={{
                background: isSelected ? 'rgba(255,0,127,0.1)' : 'transparent',
                border: isSelected ? `0.5px solid #FF007F` : isToday ? `0.5px solid ${t.border}` : '0.5px solid transparent',
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