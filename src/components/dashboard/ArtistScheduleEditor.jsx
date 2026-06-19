import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = [
  { label: 'Pn', value: 1 },
  { label: 'Wt', value: 2 },
  { label: 'Śr', value: 3 },
  { label: 'Cz', value: 4 },
  { label: 'Pt', value: 5 },
  { label: 'Sb', value: 6 },
  { label: 'Nd', value: 0 },
];

const DEFAULT_SCHEDULE = [
  { day_of_week: 2, start_time: '09:00', end_time: '18:00' }, // Wt
  { day_of_week: 3, start_time: '09:00', end_time: '18:00' }, // Śr
  { day_of_week: 4, start_time: '09:00', end_time: '18:00' }, // Cz
  { day_of_week: 5, start_time: '09:00', end_time: '18:00' }, // Pt
  { day_of_week: 6, start_time: '09:00', end_time: '14:00' }, // Sb
];

export default function ArtistScheduleEditor({ artistId, t }) {
  const [recurring, setRecurring] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddException, setShowAddException] = useState(false);
  const [newException, setNewException] = useState({ date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '18:00', is_available: false, note: '' });

  const border = t?.border || '#262626';
  const text = t?.text || '#F5F0EB';
  const muted = t?.muted || 'rgba(245,240,235,0.4)';
  const cardBg = t?.cardBg || 'transparent';

  useEffect(() => {
    if (!artistId) return;
    base44.entities.ArtistAvailability.filter({ artist_id: artistId }).then(all => {
      setRecurring(all.filter(r => r.type === 'recurring'));
      setExceptions(all.filter(r => r.type === 'exception').sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      setLoading(false);
    });
  }, [artistId]);

  const isDayActive = (dow) => recurring.some(r => r.day_of_week === dow && r.is_available !== false);
  const getDayEntry = (dow) => recurring.find(r => r.day_of_week === dow);

  const toggleDay = async (dow) => {
    setSaving(true);
    const entry = getDayEntry(dow);
    if (entry) {
      await base44.entities.ArtistAvailability.delete(entry.id);
      setRecurring(r => r.filter(x => x.id !== entry.id));
    } else {
      const def = DEFAULT_SCHEDULE.find(d => d.day_of_week === dow);
      const created = await base44.entities.ArtistAvailability.create({
        artist_id: artistId,
        type: 'recurring',
        day_of_week: dow,
        start_time: def?.start_time || '09:00',
        end_time: def?.end_time || '18:00',
        is_available: true,
      });
      setRecurring(r => [...r, created]);
    }
    setSaving(false);
  };

  const updateDayTime = async (entry, field, value) => {
    const updated = { ...entry, [field]: value };
    setRecurring(r => r.map(x => x.id === entry.id ? updated : x));
    await base44.entities.ArtistAvailability.update(entry.id, { [field]: value });
  };

  const applyDefaultSchedule = async () => {
    setSaving(true);
    // Delete all existing recurring
    await Promise.all(recurring.map(r => base44.entities.ArtistAvailability.delete(r.id)));
    // Create defaults
    const created = await Promise.all(DEFAULT_SCHEDULE.map(d =>
      base44.entities.ArtistAvailability.create({ artist_id: artistId, type: 'recurring', is_available: true, ...d })
    ));
    setRecurring(created);
    setSaving(false);
  };

  const addException = async () => {
    setSaving(true);
    const created = await base44.entities.ArtistAvailability.create({
      artist_id: artistId, type: 'exception', ...newException,
    });
    setExceptions(e => [...e, created].sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setShowAddException(false);
    setNewException({ date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '18:00', is_available: false, note: '' });
    setSaving(false);
  };

  const deleteException = async (id) => {
    await base44.entities.ArtistAvailability.delete(id);
    setExceptions(e => e.filter(x => x.id !== id));
  };

  const inp = (val, onChange) => ({
    value: val,
    onChange,
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '6px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' },
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = border,
  });

  if (loading) return <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted, letterSpacing: '0.1em' }}>ŁADOWANIE...</div>;

  const activeCount = DAYS.filter(d => isDayActive(d.value)).length;

  return (
    <div className="space-y-4">
      {/* Weekly recurring */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            GRAFIK TYGODNIOWY ({activeCount} dni)
          </p>
          <button
            onClick={applyDefaultSchedule}
            disabled={saving}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer' }}
          >
            DOMYŚLNY (Wt–Pt 9–18, Sb 9–14)
          </button>
        </div>

        <div className="space-y-1">
          {DAYS.map(({ label, value }) => {
            const active = isDayActive(value);
            const entry = getDayEntry(value);
            return (
              <div key={value} className="flex items-center gap-3" style={{ padding: '6px 0', borderBottom: `0.5px solid ${border}20` }}>
                {/* Day toggle */}
                <button
                  onClick={() => toggleDay(value)}
                  style={{ width: '28px', height: '28px', flexShrink: 0, border: `0.5px solid ${active ? '#FF007F' : border}`, background: active ? 'rgba(255,0,127,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', color: active ? '#FF007F' : muted, letterSpacing: '0.06em' }}
                >
                  {label}
                </button>

                {active && entry ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      {...inp(entry.start_time || '09:00', e => updateDayTime(entry, 'start_time', e.target.value))}
                      style={{ ...inp().style, width: '90px', colorScheme: 'dark' }}
                    />
                    <span style={{ color: muted, fontSize: '11px', flexShrink: 0 }}>–</span>
                    <input
                      type="time"
                      {...inp(entry.end_time || '18:00', e => updateDayTime(entry, 'end_time', e.target.value))}
                      style={{ ...inp().style, width: '90px', colorScheme: 'dark' }}
                    />
                  </div>
                ) : (
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted, letterSpacing: '0.08em', marginLeft: '4px' }}>wolne</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exceptions / blocks */}
      <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '16px' }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            WYJĄTKI / BLOKADY ({exceptions.length})
          </p>
          <button
            onClick={() => setShowAddException(v => !v)}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${showAddException ? '#FF007F' : border}`, color: showAddException ? '#FF007F' : muted, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={10} /> DODAJ
          </button>
        </div>

        {showAddException && (
          <div className="mb-3 p-3" style={{ border: `0.5px solid rgba(255,0,127,0.3)`, background: 'rgba(255,0,127,0.03)' }}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>DATA</label>
                <input type="date" {...inp(newException.date, e => setNewException(n => ({ ...n, date: e.target.value })))} style={{ ...inp().style, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>TYP</label>
                <select
                  value={newException.is_available ? 'available' : 'blocked'}
                  onChange={e => setNewException(n => ({ ...n, is_available: e.target.value === 'available' }))}
                  style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '6px 0', fontSize: '13px', width: '100%', outline: 'none', colorScheme: 'dark' }}
                >
                  <option value="blocked">Zablokowany</option>
                  <option value="available">Dodatkowy dzień pracy</option>
                </select>
              </div>
            </div>
            {newException.is_available && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>OD</label>
                  <input type="time" {...inp(newException.start_time, e => setNewException(n => ({ ...n, start_time: e.target.value })))} style={{ ...inp().style, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>DO</label>
                  <input type="time" {...inp(newException.end_time, e => setNewException(n => ({ ...n, end_time: e.target.value })))} style={{ ...inp().style, colorScheme: 'dark' }} />
                </div>
              </div>
            )}
            <div className="mb-3">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>NOTATKA</label>
              <input type="text" placeholder="np. urlop, choroba..." {...inp(newException.note, e => setNewException(n => ({ ...n, note: e.target.value })))} />
            </div>
            <button onClick={addException} disabled={saving} className="btn-oxblood" style={{ fontSize: '8px', padding: '6px 14px' }}>ZAPISZ WYJĄTEK</button>
          </div>
        )}

        {exceptions.length === 0 ? (
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>Brak wyjątków</p>
        ) : (
          <div className="space-y-1">
            {exceptions.map(ex => (
              <div key={ex.id} className="flex items-center justify-between" style={{ padding: '6px 8px', border: `0.5px solid ${ex.is_available ? 'rgba(22,163,74,0.3)' : 'rgba(255,0,127,0.2)'}`, background: ex.is_available ? 'rgba(22,163,74,0.04)' : 'rgba(255,0,127,0.03)' }}>
                <div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: ex.is_available ? '#16a34a' : '#FF007F', letterSpacing: '0.06em' }}>
                    {ex.date} · {ex.is_available ? `${ex.start_time}–${ex.end_time}` : 'ZABLOKOWANY'}
                  </span>
                  {ex.note && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: muted, marginLeft: '8px' }}>· {ex.note}</span>}
                </div>
                <button onClick={() => deleteException(ex.id)} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: zwraca info o dostępności dla konkretnego artysty i daty
// Użyj tego w DailyScheduleView
export function getAvailabilityForDay(availabilityRecords, artistId, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun..6=Sat
  const artistRecords = availabilityRecords.filter(r => r.artist_id === artistId);

  // Sprawdź wyjątek na ten konkretny dzień
  const exception = artistRecords.find(r => r.type === 'exception' && r.date === dateStr);
  if (exception) {
    return {
      isWorkday: exception.is_available,
      start_time: exception.start_time || '09:00',
      end_time: exception.end_time || '18:00',
      isException: true,
    };
  }

  // Grafik cykliczny
  const recurring = artistRecords.find(r => r.type === 'recurring' && r.day_of_week === dow && r.is_available !== false);
  if (recurring) {
    return {
      isWorkday: true,
      start_time: recurring.start_time || '09:00',
      end_time: recurring.end_time || '18:00',
      isException: false,
    };
  }

  return { isWorkday: false, start_time: null, end_time: null, isException: false };
}