import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Coffee } from 'lucide-react';
import { getBreaksForDay } from '@/lib/availability';

const DAYS = [
  { label: 'Poniedziałek', value: 1 },
  { label: 'Wtorek', value: 2 },
  { label: 'Środa', value: 3 },
  { label: 'Czwartek', value: 4 },
  { label: 'Piątek', value: 5 },
  { label: 'Sobota', value: 6 },
  { label: 'Niedziela', value: 0 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Przerwy w grafiku tygodniowym (np. obiad) — wiele przerw na każdy dzień.
export default function BreaksEditor({ artistId, records, onChanged, t }) {
  const [day, setDay] = useState(1);
  const [from, setFrom] = useState('12:00');
  const [to, setTo] = useState('12:30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const border = t?.border || '#262626';
  const muted = t?.muted || 'rgba(245,240,235,0.4)';
  const text = t?.text || '#F5F0EB';

  const selectStyle = {
    background: 'transparent',
    border: `0.5px solid ${border}`,
    borderRadius: 'var(--radius)',
    color: text,
    padding: '7px 8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    letterSpacing: '0.06em',
    outline: 'none',
    cursor: 'pointer',
    colorScheme: t?.bg === '#FFFFFF' ? 'light' : 'dark',
  };

  const timeSelect = (value, onChange) => {
    const [h, m] = (value || '12:00').split(':');
    return (
      <div className="flex items-center gap-1">
        <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} style={selectStyle}>
          {HOUR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span style={{ color: muted }}>:</span>
        <select value={MINUTE_OPTIONS.includes(m) ? m : '00'} onChange={e => onChange(`${h}:${e.target.value}`)} style={selectStyle}>
          {MINUTE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    );
  };

  const add = async () => {
    setError('');
    if (!from || !to || to <= from) { setError('Godzina „do” musi być późniejsza niż „od”.'); return; }
    setBusy(true);
    try {
      await base44.entities.ArtistAvailability.create({
        artist_id: artistId,
        type: 'break',
        scope: 'artist',
        day_of_week: day,
        start_time: from,
        end_time: to,
        is_available: false,
        note: 'Przerwa',
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await base44.entities.ArtistAvailability.delete(id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '16px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
        PRZERWY W GRAFIKU
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={day} onChange={e => setDay(Number(e.target.value))} style={selectStyle}>
          {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        {timeSelect(from, setFrom)}
        <span style={{ color: muted, fontSize: '11px' }}>–</span>
        {timeSelect(to, setTo)}
        <button
          onClick={add}
          disabled={busy}
          className="flex items-center gap-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 12px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)', opacity: busy ? 0.5 : 1 }}
        >
          <Plus size={10} /> DODAJ PRZERWĘ
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.05em', marginBottom: '8px' }}>{error}</p>
      )}

      <div className="space-y-1">
        {DAYS.map(d => {
          const breaks = getBreaksForDay(records, artistId, d.value);
          if (breaks.length === 0) return null;
          return (
            <div key={d.value} className="flex items-center gap-3 py-1.5" style={{ borderBottom: `0.5px solid ${border}22` }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', width: '92px', flexShrink: 0 }}>
                {d.label}
              </span>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {breaks.map(b => (
                  <span key={b.id} className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: text, letterSpacing: '0.05em', border: `0.5px solid ${border}`, borderRadius: 'var(--radius)', padding: '3px 8px' }}>
                    <Coffee size={9} color="var(--brand)" /> {b.start_time}–{b.end_time}
                    <button onClick={() => remove(b.id)} disabled={busy} title="Usuń przerwę" style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, display: 'flex' }}>
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {DAYS.every(d => getBreaksForDay(records, artistId, d.value).length === 0) && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted, letterSpacing: '0.06em' }}>Brak przerw</p>
        )}
      </div>
    </div>
  );
}