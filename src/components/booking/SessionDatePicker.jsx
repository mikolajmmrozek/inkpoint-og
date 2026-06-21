import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameMonth, parseISO, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailabilityForDay } from '@/components/dashboard/ArtistScheduleEditor';

const SLOT_INTERVAL = 15;
const BOOKING_DURATION = 60;

const DAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export default function SessionDatePicker({ artistId, selectedDate, selectedTime, onDateChange, onTimeChange }) {
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    Promise.all([
      base44.entities.ArtistAvailability.filter({ artist_id: artistId }, '-date', 500).catch(() => []),
      base44.entities.Booking.filter({ artist_id: artistId }, '-session_date', 200).catch(() => []),
    ]).then(([avail, bk]) => {
      setAvailability(avail);
      setBookings(bk.filter(b => b.status !== 'cancelled'));
      setLoading(false);
    });
  }, [artistId]);

  const getDayBookings = (dateStr) => bookings.filter(b => b.session_date === dateStr);

  // Returns array of { time, status: 'free' | 'booked' | 'outside' }
  const getAllSlots = (dateStr) => {
    const avail = getAvailabilityForDay(availability, artistId, dateStr);
    if (!avail.isWorkday || !avail.start_time || !avail.end_time) return [];
    const workStart = toMin(avail.start_time);
    const workEnd = toMin(avail.end_time);
    if (workStart === null || workEnd === null) return [];
    const dayBk = getDayBookings(dateStr);

    // Round up start to the next 15-min boundary aligned to the hour
    const startHour = Math.floor(workStart / 60);
    const startAligned = startHour * 60; // may be before workStart
    const slots = [];
    for (let t = startAligned; t + BOOKING_DURATION <= workEnd; t += SLOT_INTERVAL) {
      const slotStart = t;
      const slotEnd = t + BOOKING_DURATION;
      const withinHours = slotStart >= workStart && slotEnd <= workEnd;
      const hasOverlap = dayBk.some(b => {
        const bkStart = toMin(b.session_time);
        const bkEnd = toMin(b.session_end_time) || (bkStart + (b.session_duration || 60));
        return bkStart !== null && bkStart < slotEnd && bkEnd > slotStart;
      });
      slots.push({
        time: minToTime(slotStart),
        status: !withinHours ? 'outside' : hasOverlap ? 'booked' : 'free',
      });
    }
    return slots;
  };

  const getAvailableSlots = (dateStr) => getAllSlots(dateStr).filter(s => s.status === 'free').map(s => s.time);

  const isDayAvailable = (dateStr) => {
    const avail = getAvailabilityForDay(availability, artistId, dateStr);
    if (!avail.isWorkday) return false;
    return getAllSlots(dateStr).some(s => s.status === 'free');
  };

  // Auto-select first available day
  useEffect(() => {
    if (loading || !artistId || selectedDate) return;
    let day = addDays(startOfDay(new Date()), 1);
    for (let i = 0; i < 60; i++) {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (isDayAvailable(dateStr)) {
        onDateChange(dateStr);
        return;
      }
      day = addDays(day, 1);
    }
  }, [loading, artistId, availability, selectedDate, onDateChange]);

  const handleDateSelect = (dateStr) => {
    onDateChange(dateStr);
    if (selectedTime && !getAvailableSlots(dateStr).includes(selectedTime)) {
      onTimeChange('');
    }
    // Sync week offset so the selected date is within the visible week
    const sel = parseISO(dateStr);
    const daysFromToday = Math.round((sel - today) / 86400000);
    setWeekOffset(Math.max(0, Math.floor((daysFromToday - 1) / 7)));
  };

  const today = startOfDay(new Date());
  const dayTiles = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i + 1));
  const allSlots = selectedDate ? getAllSlots(selectedDate) : [];

  // Calendar
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;

  return (
    <div className="space-y-10">
      {/* Day tiles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Wybierz dzień *
          </label>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: '0.5px solid #FF007F', color: '#FF007F', background: 'transparent', cursor: 'pointer' }}
          >
            <Calendar size={13} /> KALENDARZ
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto thin-scrollbar pb-2">
          {loading ? (
            <div className="flex justify-center py-6 w-full">
              <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                disabled={weekOffset === 0}
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  minWidth: '36px',
                  border: '0.5px solid #262626',
                  background: 'transparent',
                  color: weekOffset === 0 ? 'rgba(245,240,235,0.15)' : 'rgba(245,240,235,0.5)',
                  cursor: weekOffset === 0 ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              {dayTiles.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasSlots = isDayAvailable(dateStr);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => hasSlots && handleDateSelect(dateStr)}
                    disabled={!hasSlots}
                    className="flex-shrink-0 transition-all duration-200"
                    style={{
                      minWidth: '72px',
                      padding: '12px 8px',
                      border: `0.5px solid ${isSelected ? '#FF007F' : hasSlots ? '#262626' : '#1a1a1a'}`,
                      background: isSelected ? 'rgba(255,0,127,0.08)' : 'transparent',
                      cursor: hasSlots ? 'pointer' : 'default',
                      opacity: hasSlots ? 1 : 0.25,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: isSelected ? '#FF007F' : 'rgba(245,240,235,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {DAY_SHORT[day.getDay()]}
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', color: isSelected ? '#FF007F' : '#F5F0EB', lineHeight: 1, marginTop: '4px' }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
                      {format(day, 'MMM', { locale: pl })}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  minWidth: '36px',
                  border: '0.5px solid #262626',
                  background: 'transparent',
                  color: 'rgba(245,240,235,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <label className="block mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()} — wybierz godzinę *
          </label>
          {allSlots.length === 0 || !allSlots.some(s => s.status === 'free') ? (
            <div className="py-8 text-center" style={{ border: '0.5px solid #262626' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>
                W TYM DNIU NIE MA WOLNYCH TERMINÓW
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {allSlots.map(slot => {
                if (slot.status === 'outside') {
                  return <div key={slot.time} style={{ minHeight: '44px' }} />;
                }
                const isSelected = selectedTime === slot.time;
                const isBooked = slot.status === 'booked';
                return (
                  <button
                    key={slot.time}
                    onClick={() => !isBooked && onTimeChange(slot.time)}
                    disabled={isBooked}
                    className="py-3 transition-all duration-200"
                    style={{
                      border: `0.5px solid ${isSelected ? '#FF007F' : isBooked ? '#262626' : '#262626'}`,
                      background: isSelected ? 'rgba(255,0,127,0.08)' : isBooked ? 'rgba(245,240,235,0.02)' : 'transparent',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                      color: isSelected ? '#FF007F' : isBooked ? 'rgba(245,240,235,0.2)' : 'rgba(245,240,235,0.5)',
                      letterSpacing: '0.05em',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      textDecoration: isBooked ? 'line-through' : 'none',
                    }}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calendar popup */}
      <AnimatePresence>
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowCalendar(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
              style={{ background: '#0A0A0A', border: '0.5px solid #262626', padding: '28px' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Month nav */}
              <div className="flex items-center justify-between mb-6">
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>
                  {format(viewMonth, 'LLLL yyyy', { locale: pl }).toUpperCase()}
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={{ color: 'rgba(245,240,235,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={{ color: 'rgba(245,240,235,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setShowCalendar(false)} style={{ color: 'rgba(245,240,235,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center py-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.08em' }}>{d}</div>
                ))}
              </div>

              {/* Days — only current month days, fixed row height so the modal never resizes */}
              <div className="grid grid-cols-7 gap-0.5" style={{ height: `${Math.ceil((startPad + calendarDays.length) / 7) * 42}px` }}>
                {Array.from({ length: startPad }).map((_, i) => <div key={`pad${i}`} style={{ height: '42px' }} />)}
                {calendarDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isPast = isBefore(day, today);
                  const hasSlots = !isPast && isDayAvailable(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isTodayDate = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { if (hasSlots) { handleDateSelect(dateStr); setShowCalendar(false); } }}
                      disabled={!hasSlots}
                      style={{
                        height: '42px',
                        padding: '6px 4px',
                        border: `0.5px solid ${isSelected ? '#FF007F' : 'transparent'}`,
                        background: isSelected ? 'rgba(255,0,127,0.08)' : 'transparent',
                        cursor: hasSlots ? 'pointer' : 'default',
                        opacity: hasSlots ? 1 : isPast ? 0.15 : 0.3,
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      {hasSlots && !isSelected && (
                        <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#FF007F' }} />
                      )}
                      <span style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                        color: isSelected ? '#FF007F' : isTodayDate ? '#F5F0EB' : 'rgba(245,240,235,0.5)',
                        fontWeight: isTodayDate ? 600 : 400,
                      }}>
                        {format(day, 'd')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '0.5px solid #262626' }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FF007F' }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.08em' }}>WOLNE TERMINY</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '8px', height: '1px', background: 'rgba(245,240,235,0.15)' }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.08em' }}>NIEDOSTĘPNE</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}