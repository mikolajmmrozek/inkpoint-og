import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, CalendarOff, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { nextDateStr } from '@/lib/availability';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const btnStyle = (active) => ({
  flex: 1,
  padding: '8px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: '8px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: active ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent',
  border: `0.5px solid ${active ? 'var(--brand)' : 'inherit'}`,
  color: active ? 'var(--brand)' : 'inherit',
  cursor: 'pointer',
  borderRadius: 'var(--radius)',
});

// Dni wolne i zajęte ustawiane przez administratora — obowiązują wszystkich artystów.
export default function StudioDaysOffPanel({ t, theme }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('off');
  const [dateMode, setDateMode] = useState('single');
  const [date, setDate] = useState(TODAY);
  const [dateTo, setDateTo] = useState('');
  const [note, setNote] = useState('');

  const isLight = theme === 'light';
  const border = t.border;
  const text = t.text;
  const muted = t.muted;

  const load = useCallback(() => {
    base44.entities.ArtistAvailability.filter({ scope: 'studio', type: 'exception' }, '-date', 300)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const range = dateMode === 'range' && dateTo > date;
      await base44.entities.ArtistAvailability.create({
        artist_id: 'studio',
        scope: 'studio',
        type: 'exception',
        date,
        ...(range ? { end_date: dateTo } : {}),
        is_available: mode === 'duty',
        repeat: 'none',
        note: note || undefined,
      });
      setShowForm(false);
      setNote('');
      setMode('off');
      setDateMode('single');
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.ArtistAvailability.delete(id);
    load();
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${border}`,
    color: text,
    padding: '8px 0',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    colorScheme: isLight ? 'light' : 'dark',
  };

  const label = (txt) => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const dateLabel = (r) => {
    try {
      if (r.end_date && r.end_date > r.date) {
        return `${format(parseISO(r.date), 'd MMM', { locale: pl })} – ${format(parseISO(r.end_date), 'd MMM yyyy', { locale: pl })}`;
      }
      return format(parseISO(r.date), 'd MMM yyyy', { locale: pl });
    } catch { return r.date; }
  };

  return (
    <div className="max-w-2xl" style={{ border: `0.5px solid ${border}`, background: t.bg, padding: '32px', borderRadius: 'var(--radius)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
        DNI WOLNE STUDIA
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted, letterSpacing: '0.05em', lineHeight: 1.8, marginBottom: '20px' }}>
        Wpisy ustawione tutaj obowiązują wszystkich artystów — np. święta państwowe. Artyści widzą je w swoim grafiku jako dzień wolny lub dyspozycję, bez możliwości edycji.
      </p>

      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          WPISY ({records.length})
        </span>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
            <Plus size={10} /> DODAJ
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 space-y-4" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.25)', background: 'rgb(var(--brand-rgb) /0.02)', borderRadius: 'var(--radius)' }}>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>NOWY WPIS</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}><X size={13} /></button>
          </div>

          <div>
            {label('TYP')}
            <div className="flex gap-2">
              <button onClick={() => setMode('off')} style={{ ...btnStyle(mode === 'off'), borderColor: mode === 'off' ? 'var(--brand)' : border, color: mode === 'off' ? 'var(--brand)' : muted }}>Wolne (zamknięte)</button>
              <button onClick={() => setMode('duty')} style={{ ...btnStyle(mode === 'duty'), borderColor: mode === 'duty' ? 'var(--brand)' : border, color: mode === 'duty' ? 'var(--brand)' : muted }}>Zajęte (dyspozycja)</button>
            </div>
          </div>

          <div>
            {label('ZAKRES')}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setDateMode('single')} style={{ ...btnStyle(dateMode === 'single'), borderColor: dateMode === 'single' ? 'var(--brand)' : border, color: dateMode === 'single' ? 'var(--brand)' : muted }}>Jeden dzień</button>
              <button onClick={() => { setDateMode('range'); if (!dateTo || dateTo <= date) setDateTo(nextDateStr(date)); }} style={{ ...btnStyle(dateMode === 'range'), borderColor: dateMode === 'range' ? 'var(--brand)' : border, color: dateMode === 'range' ? 'var(--brand)' : muted }}>Zakres od–do</button>
            </div>
            {dateMode === 'single' ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>{label('OD')}<input type="date" value={date} onChange={e => { setDate(e.target.value); if (dateTo <= e.target.value) setDateTo(nextDateStr(e.target.value)); }} style={inputStyle} /></div>
                <div>{label('DO')}<input type="date" value={dateTo} min={date} onChange={e => setDateTo(e.target.value)} style={inputStyle} /></div>
              </div>
            )}
          </div>

          <div>
            {label('NOTATKA (opcjonalnie)')}
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="np. Boże Narodzenie" style={inputStyle} />
          </div>

          <button onClick={save} disabled={saving} className="btn-oxblood" style={{ fontSize: '9px', padding: '9px 18px' }}>
            {saving ? 'ZAPISUJĘ...' : 'ZAPISZ'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center" style={{ border: `0.5px solid ${border}`, borderRadius: 'var(--radius)' }}>
          <CalendarOff size={20} color={muted} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted, letterSpacing: '0.1em' }}>BRAK WPISÓW</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${border}`, borderRadius: 'var(--radius)' }}>
          {records.map((r, i) => {
            const off = r.is_available === false;
            const color = off ? 'var(--brand)' : '#16a34a';
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: i < records.length - 1 ? `0.5px solid ${border}` : 'none' }}>
                <div className="min-w-0">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {off ? 'WOLNE' : 'ZAJĘTE'} · {dateLabel(r)}
                  </p>
                  {r.note && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, letterSpacing: '0.05em', marginTop: '2px' }}>{r.note}</p>}
                </div>
                <button onClick={() => remove(r.id)} title="Usuń wpis" style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}><Trash2 size={12} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}