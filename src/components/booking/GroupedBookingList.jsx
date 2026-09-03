import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function groupBookingsByDay(bookings) {
  const grouped = {};
  bookings.forEach(b => {
    const day = b.session_date || 'Brak daty';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(b);
  });
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

export default function GroupedBookingList({ bookings, renderRow, t, emptyMessage = 'BRAK SESJI' }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="py-6 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>{emptyMessage}</p>
      </div>
    );
  }
  const today = format(new Date(), 'yyyy-MM-dd');
  const grouped = groupBookingsByDay(bookings);
  return (
    <div className="space-y-4">
      {grouped.map(([date, items]) => {
        const dateObj = date !== 'Brak daty' ? new Date(date) : null;
        const isToday = dateObj && date === today;
        const isPast = dateObj && date < today;
        const dayLabel = dateObj ? format(dateObj, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase() : 'BRAK DATY';
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isPast ? '#9ca3af' : isToday ? '#f59e0b' : '#16a34a', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isPast ? t.muted : isToday ? '#f59e0b' : t.muted }}>
                {isToday ? `DZIŚ — ${dayLabel}` : dayLabel}
              </p>
              <div style={{ flex: 1, height: '0.5px', background: t.border }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>
                {items.length} {items.length === 1 ? 'sesja' : items.length >= 2 && items.length <= 4 ? 'sesje' : 'sesji'}
              </span>
            </div>
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              {items.map((b, i) => renderRow(b, i, items))}
            </div>
          </div>
        );
      })}
    </div>
  );
}