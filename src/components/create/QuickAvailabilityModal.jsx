import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateDates } from '@/components/dashboard/AvailabilityEditModal';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const REPEATS = [
  { value: 'none', label: 'Jednorazowo' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'biweekly', label: 'Co 2 tyg.' },
  { value: 'monthly', label: 'Co miesiąc' },
];

export default function QuickAvailabilityModal({ prefill, role, onClose, onSaved, t }) {
  const isLight = t.bg === '#FFFFFF';
  const [artists, setArtists] = useState([]);
  const [artistId, setArtistId] = useState(prefill?.artist_id || '');
  const [mode, setMode] = useState('off'); // 'off' = wolne, 'avail' = dostępność
  const [dateMode, setDateMode] = useState('single'); // 'single' | 'range'
  const [date, setDate] = useState(prefill?.date || '');
  const [dateFrom, setDateFrom] = useState(prefill?.date || '');
  const [dateTo, setDateTo] = useState('');
  const [startTime, setStartTime] = useState(prefill?.start_time || '');
  const [endTime, setEndTime] = useState(prefill?.end_time || '');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [saving, setSaving] = useState(false);

  const lockedArtist = role === 'artist' && !!prefill?.artist_id;

  useEffect(() => {
    base44.entities.Artist.list()
      .then((list) => setArtists(list.filter((a) => a.is_active !== false)))
      .catch(() => {});
  }, []);

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    color: t.text,
    colorScheme: isLight ? 'light' : 'dark',
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const handleSave = async () => {
    if (!artistId) { alert('Wybierz artystę.'); return; }
    if (dateMode === 'range') {
      if (!dateFrom || !dateTo) { alert('Wybierz datę od i do.'); return; }
      if (dateTo < dateFrom) { alert('Data „do" musi być po dacie „od".'); return; }
    } else {
      if (!date) { alert('Wybierz datę.'); return; }
    }
    setSaving(true);
    try {
      const timeProps = allDay
        ? { start_time: undefined, end_time: undefined }
        : { start_time: startTime || undefined, end_time: endTime || undefined };
      if (dateMode === 'range') {
        const dates = generateDates(dateFrom, dateTo, 'none', '', false);
        const records = dates.map((d) => ({
          artist_id: artistId,
          type: 'exception',
          date: d,
          is_available: mode === 'avail',
          note: note || undefined,
          repeat: 'none',
          ...timeProps,
        }));
        await base44.entities.ArtistAvailability.bulkCreate(records);
      } else {
        await base44.entities.ArtistAvailability.create({
          artist_id: artistId,
          type: 'exception',
          date,
          is_available: mode === 'avail',
          note: note || undefined,
          repeat,
          repeat_until: repeat !== 'none' ? (repeatUntil || 'indefinite') : undefined,
          ...timeProps,
        });
      }
      onSaved();
    } catch (e) {
      alert('Nie udało się zapisać: ' + (e.message || 'błąd'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md p-6 sm:p-8"
        style={{ border: `0.5px solid ${t.border}`, background: isLight ? '#FFFFFF' : '#0A0A0A' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>DYPOZYCJA</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>Wolne / Dostępność</h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            {label('Artysta')}
            <select
              value={artistId}
              disabled={lockedArtist}
              onChange={(e) => setArtistId(e.target.value)}
              style={{ ...inputStyle, colorScheme: isLight ? 'light' : 'dark', cursor: lockedArtist ? 'not-allowed' : 'pointer' }}
            >
              <option value="">Wybierz artystę</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            {label('Typ')}
            <div className="flex gap-2">
              {[['off', 'WOLNE'], ['avail', 'DOSTĘPNOŚĆ']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  style={{
                    flex: 1,
                    border: `0.5px solid ${mode === val ? 'var(--brand)' : t.border}`,
                    color: mode === val ? 'var(--brand)' : t.muted,
                    background: mode === val ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    padding: '9px 0',
                    cursor: 'pointer',
                  }}
                >{lbl}</button>
              ))}
            </div>
          </div>

          <div>
            {label('Okres')}
            <div className="flex gap-2 mb-3">
              {[['single', 'JEDEN DZIEŃ'], ['range', 'ZAKRES OD–DO']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDateMode(val)}
                  style={{
                    flex: 1,
                    border: `0.5px solid ${dateMode === val ? 'var(--brand)' : t.border}`,
                    color: dateMode === val ? 'var(--brand)' : t.muted,
                    background: dateMode === val ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    padding: '9px 0',
                    cursor: 'pointer',
                  }}
                >{lbl}</button>
              ))}
            </div>
            {dateMode === 'single' ? (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Od *')}
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  {label('Do *')}
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              className="flex items-center gap-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: allDay ? t.muted : 'var(--brand)' }}
            >
              <div style={{ width: '12px', height: '12px', border: `0.5px solid ${allDay ? t.border : 'var(--brand)'}`, background: allDay ? 'transparent' : 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!allDay && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
              </div>
              Określ godziny
            </button>
            {!allDay && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  {label('Od')}
                  <div className="flex gap-1 items-center">
                    <select value={(startTime || '09:00').split(':')[0]} onChange={(e) => setStartTime(`${e.target.value}:${(startTime || '09:00').split(':')[1] || '00'}`)} style={{ ...inputStyle, padding: '6px 8px', flex: 1 }}>
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ color: t.text }}>:</span>
                    <select value={(startTime || '09:00').split(':')[1]} onChange={(e) => setStartTime(`${(startTime || '09:00').split(':')[0] || '09'}:${e.target.value}`)} style={{ ...inputStyle, padding: '6px 8px', flex: 1 }}>
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  {label('Do')}
                  <div className="flex gap-1 items-center">
                    <select value={(endTime || '17:00').split(':')[0]} onChange={(e) => setEndTime(`${e.target.value}:${(endTime || '17:00').split(':')[1] || '00'}`)} style={{ ...inputStyle, padding: '6px 8px', flex: 1 }}>
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ color: t.text }}>:</span>
                    <select value={(endTime || '17:00').split(':')[1]} onChange={(e) => setEndTime(`${(endTime || '17:00').split(':')[0] || '17'}:${e.target.value}`)} style={{ ...inputStyle, padding: '6px 8px', flex: 1 }}>
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {dateMode === 'single' && (
            <div>
              {label('Powtarzanie')}
              <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ ...inputStyle, colorScheme: isLight ? 'light' : 'dark' }}>
                {REPEATS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {repeat !== 'none' && (
                <div className="mt-3">
                  {label('Powtarzaj do (opcjonalnie)')}
                  <input type="date" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} style={inputStyle} />
                </div>
              )}
            </div>
          )}

          <div>
            {label('Notatka (opcjonalnie)')}
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. urlop, wyjazd..." style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} className="btn-oxblood flex-1" style={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? 'ZAPISYWANIE...' : 'DODAJ DYPOZYCJĘ'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}