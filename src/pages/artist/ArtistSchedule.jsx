import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const STATUS_LABELS = { pending: 'OCZEKUJE', confirmed: 'POTWIERDZONA', completed: 'ZAKOŃCZONA', cancelled: 'ANULOWANA' };

export default function ArtistSchedule() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', rowBorder: '#E5E5E5', rowHover: 'rgba(0,0,0,0.03)' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', rowBorder: '#262626', rowHover: 'rgba(255,255,255,0.04)' };

  useEffect(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 200)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [artist?.id]);

  const dayBookings = bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));
  const today = new Date();

  // Build week strip
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i - 1));

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>MÓJ KALENDARZ</p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Harmonogram</h1>
      </div>

      {/* Week strip */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weekDays.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const hasSessions = bookings.some(b => b.session_date && isSameDay(new Date(b.session_date), day));
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              style={{
                flexShrink: 0, minWidth: '56px', padding: '10px 8px', border: `0.5px solid ${isSelected ? '#FF007F' : t.cardBorder}`,
                background: isSelected ? 'rgba(255,0,127,0.08)' : t.cardBg, cursor: 'pointer', textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: isSelected ? '#FF007F' : t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {format(day, 'EEE', { locale: pl })}
              </p>
              <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', color: isSelected ? '#FF007F' : isToday ? t.title : t.muted, lineHeight: 1 }}>
                {format(day, 'd')}
              </p>
              {hasSessions && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FF007F', margin: '4px auto 0' }} />}
            </button>
          );
        })}
      </div>

      {/* Selected day label + nav */}
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setSelectedDate(d => subDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronLeft size={14} /></button>
          <button onClick={() => setSelectedDate(new Date())} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 12px', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DZIŚ</button>
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Day sessions */}
      {loading ? (
        <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}>
          <div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#FF007F' }} />
        </div>
      ) : dayBookings.length === 0 ? (
        <div className="p-10 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK SESJI W TEN DZIEŃ</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          {dayBookings
            .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''))
            .map((b, i) => (
              <div key={b.id} className="p-4" style={{ borderBottom: i < dayBookings.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {b.session_time && (
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: STATUS_COLORS[b.status], letterSpacing: '0.05em' }}>
                          {b.session_time}{b.session_end_time ? `–${b.session_end_time}` : ''}
                        </span>
                      )}
                      <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                    </div>
                    {b.client_phone && (
                      <a href={`tel:${b.client_phone}`} style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>{b.client_phone}</a>
                    )}
                    {(b.tattoo_placement || b.tattoo_description) && (
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
                        {b.tattoo_placement}{b.tattoo_description ? ` — ${b.tattoo_description}` : ''}
                      </p>
                    )}
                    {b.service_name && (
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.08em', marginTop: '4px', opacity: 0.8 }}>{b.service_name}</p>
                    )}
                    {b.notes && (
                      <p style={{ fontSize: '12px', color: t.muted, marginTop: '6px', lineHeight: 1.5, fontStyle: 'italic' }}>
                        Notatki: {b.notes}
                      </p>
                    )}
                    {!b.health_form_completed && (
                      <span style={{ display: 'inline-block', marginTop: '6px', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: '0.5px solid #FF007F', color: '#FF007F', background: 'rgba(255,0,127,0.06)' }}>
                        BRAK ANKIETY
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status] }}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                    {b.estimated_price > 0 && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.06em' }}>{b.estimated_price} zł</span>
                    )}
                    {b.deposit_paid && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ DEPOZYT</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}