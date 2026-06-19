import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

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
  { day_of_week: 2, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 6, start_time: '09:00', end_time: '14:00' },
];

const TODAY = format(new Date(), 'yyyy-MM-dd');

const EMPTY_ENTRY = {
  kind: 'block',           // 'block' | 'free'
  timeMode: 'allday',      // 'allday' | 'hours'
  dateMode: 'single',      // 'single' | 'range'
  date_from: TODAY,
  date_to: TODAY,
  start_time: '09:00',
  end_time: '18:00',
  repeat: 'none',          // 'none' | 'weekly' | 'biweekly' | 'monthly'
  repeat_indefinite: false, // true = do odwołania (ignoruje repeat_until)
  repeat_until: '',
  note: '',
};

const REPEAT_LABELS = {
  weekly: 'co tydzień',
  biweekly: 'co 2 tygodnie',
  monthly: 'co miesiąc',
};

const DAY_NAMES_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

function formatRepeatLabel(ex) {
  if (!ex.repeat || ex.repeat === 'none') return null;
  const repeatStr = REPEAT_LABELS[ex.repeat] || ex.repeat;
  let dayStr = '';
  if (ex.date) {
    try {
      const d = parseISO(ex.date);
      dayStr = DAY_NAMES_PL[d.getDay()];
    } catch {}
  }
  let untilStr = '';
  if (ex.repeat_until === 'indefinite' || !ex.repeat_until) {
    untilStr = 'do odwołania';
  } else {
    try {
      untilStr = `do ${format(parseISO(ex.repeat_until), 'd MMM yyyy', { locale: pl })}`;
    } catch { untilStr = ex.repeat_until; }
  }
  return `${repeatStr}${dayStr ? ` (${dayStr})` : ''} · ${untilStr}`;
}

function ExceptionRow({ ex, count, color, border, muted, text, onEdit, onDelete }) {
  const timeStr = ex.start_time && ex.end_time ? `${ex.start_time}–${ex.end_time}` : 'cały dzień';
  const isRecurring = ex.repeat && ex.repeat !== 'none';
  const isGrouped = count > 1; // grouped single-day duplicates
  const repeatLabel = formatRepeatLabel(ex);

  let dateStr = ex.date || '';
  try { dateStr = format(parseISO(ex.date), 'd MMM yyyy', { locale: pl }); } catch {}

  return (
    <div className="flex items-start justify-between px-3 py-2" style={{ border: `0.5px solid ${color}33`, background: `${color}06` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isRecurring ? (
            <span className="flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color, letterSpacing: '0.06em' }}>
              <RefreshCw size={8} /> {repeatLabel}
            </span>
          ) : (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color, letterSpacing: '0.06em' }}>
              {dateStr}
            </span>
          )}
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color, opacity: 0.7, letterSpacing: '0.04em' }}>· {timeStr}</span>
          {isGrouped && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color, opacity: 0.6, letterSpacing: '0.06em', background: `${color}18`, padding: '1px 5px', border: `0.5px solid ${color}40` }}>
              ×{count} wpisów
            </span>
          )}
        </div>
        {ex.note && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: muted, marginTop: '2px' }}>{ex.note}</p>}
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <button onClick={() => onEdit(ex)} title="Edytuj" style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={10} /></button>
        <button onClick={onDelete} title={isGrouped ? `Usuń wszystkie ${count} wpisy` : 'Usuń'} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

export default function ArtistScheduleEditor({ artistId, t }) {
  const [recurring, setRecurring] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [editingException, setEditingException] = useState(null); // id of exception being edited

  const border = t?.border || '#262626';
  const text = t?.text || '#F5F0EB';
  const muted = t?.muted || 'rgba(245,240,235,0.4)';

  useEffect(() => {
    if (!artistId) return;
    base44.entities.ArtistAvailability.filter({ artist_id: artistId }).then(all => {
      setRecurring(all.filter(r => r.type === 'recurring'));
      setExceptions(all.filter(r => r.type === 'exception').sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      setLoading(false);
    });
  }, [artistId]);

  const isDayActive = (dow) => recurring.some(r => r.day_of_week === dow);
  const getDayEntry = (dow) => recurring.find(r => r.day_of_week === dow);

  const toggleDay = async (dow) => {
    setSaving(true);
    const existing = getDayEntry(dow);
    if (existing) {
      await base44.entities.ArtistAvailability.delete(existing.id);
      setRecurring(r => r.filter(x => x.id !== existing.id));
    } else {
      const def = DEFAULT_SCHEDULE.find(d => d.day_of_week === dow);
      const created = await base44.entities.ArtistAvailability.create({
        artist_id: artistId, type: 'recurring', is_available: true,
        day_of_week: dow,
        start_time: def?.start_time || '09:00',
        end_time: def?.end_time || '18:00',
      });
      setRecurring(r => [...r, created]);
    }
    setSaving(false);
  };

  const updateDayTime = async (rec, field, value) => {
    setRecurring(r => r.map(x => x.id === rec.id ? { ...x, [field]: value } : x));
    await base44.entities.ArtistAvailability.update(rec.id, { [field]: value });
  };

  const applyDefault = async () => {
    setSaving(true);
    await Promise.all(recurring.map(r => base44.entities.ArtistAvailability.delete(r.id)));
    const created = await Promise.all(DEFAULT_SCHEDULE.map(d =>
      base44.entities.ArtistAvailability.create({ artist_id: artistId, type: 'recurring', is_available: true, ...d })
    ));
    setRecurring(created);
    setSaving(false);
  };

  const saveEntry = async () => {
    setSaving(true);
    const isAvailable = entry.kind === 'free';
    const allDay = entry.timeMode === 'allday';
    const effectiveUntil = entry.repeat_indefinite ? 'indefinite' : (entry.repeat_until || undefined);

    const created = await base44.entities.ArtistAvailability.create({
      artist_id: artistId,
      type: 'exception',
      date: entry.date_from,
      is_available: isAvailable,
      start_time: allDay ? null : entry.start_time,
      end_time: allDay ? null : entry.end_time,
      note: entry.note || undefined,
      repeat: entry.repeat !== 'none' ? entry.repeat : 'none',
      repeat_until: entry.repeat !== 'none' ? effectiveUntil : undefined,
    });

    setExceptions(prev => [...prev, created].sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setShowForm(false);
    setEditingException(null);
    setEntry(EMPTY_ENTRY);
    setSaving(false);
  };

  const deleteException = async (id) => {
    await base44.entities.ArtistAvailability.delete(id);
    setExceptions(e => e.filter(x => x.id !== id));
  };

  const openEditException = (ex) => {
    setEditingException(ex.id);
    const isIndefinite = ex.repeat_until === 'indefinite';
    setEntry({
      kind: ex.is_available ? 'free' : 'block',
      timeMode: ex.start_time && ex.end_time ? 'hours' : 'allday',
      dateMode: 'single',
      date_from: ex.date || TODAY,
      date_to: ex.date || TODAY,
      start_time: ex.start_time || '09:00',
      end_time: ex.end_time || '18:00',
      repeat: ex.repeat || 'none',
      repeat_indefinite: isIndefinite,
      repeat_until: isIndefinite ? '' : (ex.repeat_until || ''),
      note: ex.note || '',
    });
    setShowForm(true);
  };

  const saveEditException = async () => {
    setSaving(true);
    const isAvailable = entry.kind === 'free';
    const allDay = entry.timeMode === 'allday';
    const effectiveUntil = entry.repeat_indefinite ? 'indefinite' : (entry.repeat_until || undefined);
    await base44.entities.ArtistAvailability.update(editingException, {
      date: entry.date_from,
      is_available: isAvailable,
      start_time: allDay ? null : entry.start_time,
      end_time: allDay ? null : entry.end_time,
      note: entry.note || undefined,
      repeat: entry.repeat !== 'none' ? entry.repeat : 'none',
      repeat_until: entry.repeat !== 'none' ? effectiveUntil : undefined,
    });
    const updated = await base44.entities.ArtistAvailability.filter({ artist_id: artistId });
    setExceptions(updated.filter(r => r.type === 'exception').sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setShowForm(false);
    setEditingException(null);
    setEntry(EMPTY_ENTRY);
    setSaving(false);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingException(null);
    setEntry(EMPTY_ENTRY);
  };

  const lbl = (txt) => (
    <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const inp = (val, onChange, type = 'text') => ({
    type,
    value: val,
    onChange,
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '7px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: 'dark' },
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = border,
  });

  const SegBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{ flex: 1, padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', background: active ? 'rgba(255,0,127,0.1)' : 'transparent', border: `0.5px solid ${active ? '#FF007F' : border}`, color: active ? '#FF007F' : muted, cursor: 'pointer' }}>
      {children}
    </button>
  );

  if (loading) return <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted }}>ŁADOWANIE...</div>;

  const activeCount = DAYS.filter(d => isDayActive(d.value)).length;

  // Group exceptions: recurring records with same fingerprint → single "group" tile
  function groupExceptions(list) {
    const groups = [];
    const used = new Set();
    for (const ex of list) {
      if (used.has(ex.id)) continue;
      // fingerprint: same repeat+start_time+end_time+note = same cycle series
      if (ex.repeat && ex.repeat !== 'none') {
        // find others that are single-day duplicates of this cycle
        // (i.e., same is_available, same start/end, no repeat themselves)
        const siblings = list.filter(e =>
          !used.has(e.id) &&
          e.id !== ex.id &&
          (!e.repeat || e.repeat === 'none') &&
          e.is_available === ex.is_available &&
          e.start_time === ex.start_time &&
          e.end_time === ex.end_time
        );
        siblings.forEach(s => used.add(s.id));
        used.add(ex.id);
        groups.push({ representative: ex, siblingIds: siblings.map(s => s.id), count: 1 + siblings.length });
      } else {
        // check if this single-day record matches any recurring group already added
        const matchingGroup = groups.find(g =>
          g.representative.repeat && g.representative.repeat !== 'none' &&
          g.representative.is_available === ex.is_available &&
          g.representative.start_time === ex.start_time &&
          g.representative.end_time === ex.end_time
        );
        if (matchingGroup) {
          used.add(ex.id);
          matchingGroup.siblingIds.push(ex.id);
          matchingGroup.count++;
        } else {
          used.add(ex.id);
          groups.push({ representative: ex, siblingIds: [], count: 1 });
        }
      }
    }
    return groups;
  }

  const blocks = groupExceptions(exceptions.filter(e => !e.is_available));
  const frees = groupExceptions(exceptions.filter(e => e.is_available));

  const deleteGroup = async (group) => {
    const allIds = [group.representative.id, ...group.siblingIds];
    await Promise.all(allIds.map(id => base44.entities.ArtistAvailability.delete(id)));
    setExceptions(e => e.filter(x => !allIds.includes(x.id)));
  };

  return (
    <div className="space-y-6">
      {/* ── Grafik tygodniowy ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            GRAFIK TYGODNIOWY ({activeCount} dni)
          </p>
          <button onClick={applyDefault} disabled={saving} style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer' }}>
            RESETUJ DO DOMYŚLNEGO
          </button>
        </div>
        <div className="space-y-1">
          {DAYS.map(({ label, value }) => {
            const active = isDayActive(value);
            const rec = getDayEntry(value);
            return (
              <div key={value} className="flex items-center gap-3" style={{ padding: '5px 0', borderBottom: `0.5px solid ${border}18` }}>
                <button onClick={() => toggleDay(value)} style={{ width: '28px', height: '28px', flexShrink: 0, border: `0.5px solid ${active ? '#FF007F' : border}`, background: active ? 'rgba(255,0,127,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', color: active ? '#FF007F' : muted }}>
                  {label}
                </button>
                {active && rec ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={rec.start_time || '09:00'} onChange={e => updateDayTime(rec, 'start_time', e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '4px 0', fontSize: '13px', outline: 'none', colorScheme: 'dark', width: '88px' }} />
                    <span style={{ color: muted, fontSize: '11px' }}>–</span>
                    <input type="time" value={rec.end_time || '18:00'} onChange={e => updateDayTime(rec, 'end_time', e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '4px 0', fontSize: '13px', outline: 'none', colorScheme: 'dark', width: '88px' }} />
                  </div>
                ) : (
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>wolne</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Blokady / Dodaj wolne ── */}
      <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DODAJ WOLNE
          </p>
          {!showForm && (
            <button onClick={() => { setShowForm(true); setEditingException(null); setEntry(EMPTY_ENTRY); }} style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={10} /> DODAJ
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-4 p-4 space-y-4" style={{ border: `0.5px solid rgba(255,0,127,0.25)`, background: 'rgba(255,0,127,0.02)' }}>
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {editingException ? 'EDYTUJ WPIS' : 'NOWY WPIS'}
              </p>
              <button onClick={cancelForm} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} /></button>
            </div>

            {/* Kind */}
            <div>
              {lbl('TYP')}
              <div className="flex gap-2">
                <SegBtn active={entry.kind === 'block'} onClick={() => setEntry(e => ({ ...e, kind: 'block' }))}>Blokada (niedostępny)</SegBtn>
                <SegBtn active={entry.kind === 'free'} onClick={() => setEntry(e => ({ ...e, kind: 'free' }))}>Dyspozycja (dostępny)</SegBtn>
              </div>
            </div>

            {/* Date mode — hidden when editing (single date only) */}
            {!editingException && (
              <div>
                {lbl('ZAKRES DAT')}
                <div className="flex gap-2">
                  <SegBtn active={entry.dateMode === 'single'} onClick={() => setEntry(e => ({ ...e, dateMode: 'single' }))}>Jeden dzień</SegBtn>
                  <SegBtn active={entry.dateMode === 'range'} onClick={() => setEntry(e => ({ ...e, dateMode: 'range' }))}>Zakres (od–do)</SegBtn>
                </div>
              </div>
            )}

            {/* Date inputs */}
            {entry.dateMode === 'single' || editingException ? (
              <div>{lbl('DATA')}<input {...inp(entry.date_from, e => setEntry(n => ({ ...n, date_from: e.target.value })), 'date')} /></div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>{lbl('OD')}<input {...inp(entry.date_from, e => setEntry(n => ({ ...n, date_from: e.target.value })), 'date')} /></div>
                <div>{lbl('DO')}<input {...inp(entry.date_to, e => setEntry(n => ({ ...n, date_to: e.target.value })), 'date')} /></div>
              </div>
            )}

            {/* Time mode */}
            <div>
              {lbl('CZAS')}
              <div className="flex gap-2">
                <SegBtn active={entry.timeMode === 'allday'} onClick={() => setEntry(e => ({ ...e, timeMode: 'allday' }))}>Cały dzień</SegBtn>
                <SegBtn active={entry.timeMode === 'hours'} onClick={() => setEntry(e => ({ ...e, timeMode: 'hours' }))}>Godziny (od–do)</SegBtn>
              </div>
            </div>

            {entry.timeMode === 'hours' && (
              <div className="grid grid-cols-2 gap-4">
                <div>{lbl('OD GODZINY')}<input {...inp(entry.start_time, e => setEntry(n => ({ ...n, start_time: e.target.value })), 'time')} /></div>
                <div>{lbl('DO GODZINY')}<input {...inp(entry.end_time, e => setEntry(n => ({ ...n, end_time: e.target.value })), 'time')} /></div>
              </div>
            )}

            {/* Repeat — only for new entries */}
            {!editingException && (
              <div>
                {lbl('POWTARZANIE')}
                <div className="flex gap-1 flex-wrap">
                  {[['none','Brak'], ['weekly','Co tydzień'], ['biweekly','Co 2 tygodnie'], ['monthly','Co miesiąc']].map(([val, label]) => (
                    <SegBtn key={val} active={entry.repeat === val} onClick={() => setEntry(e => ({ ...e, repeat: val }))}>{label}</SegBtn>
                  ))}
                </div>
              </div>
            )}

            {/* Repeat until + "Do odwołania" — shown when repeat != none, for new entries only */}
            {!editingException && entry.repeat !== 'none' && (
              <div>
                {lbl('ZAKOŃCZENIE POWTARZANIA')}
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={entry.repeat_until}
                    onChange={e => setEntry(n => ({ ...n, repeat_until: e.target.value, repeat_indefinite: false }))}
                    disabled={entry.repeat_indefinite}
                    style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '7px 0', fontSize: '13px', flex: 1, outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: 'dark', opacity: entry.repeat_indefinite ? 0.3 : 1, cursor: entry.repeat_indefinite ? 'not-allowed' : 'text' }}
                    onFocus={e => { if (!entry.repeat_indefinite) e.target.style.borderBottomColor = '#FF007F'; }}
                    onBlur={e => e.target.style.borderBottomColor = border}
                  />
                  <button
                    onClick={() => setEntry(e => ({ ...e, repeat_indefinite: !e.repeat_indefinite, repeat_until: '' }))}
                    style={{ flexShrink: 0, fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${entry.repeat_indefinite ? '#FF007F' : border}`, color: entry.repeat_indefinite ? '#FF007F' : muted, background: entry.repeat_indefinite ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Do odwołania
                  </button>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              {lbl('NOTATKA (opcjonalnie)')}
              <input {...inp(entry.note, e => setEntry(n => ({ ...n, note: e.target.value })))} placeholder="np. urlop, choroba..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={editingException ? saveEditException : saveEntry}
                disabled={saving}
                className="btn-oxblood"
                style={{ fontSize: '9px', padding: '8px 18px' }}
              >
                {saving ? 'ZAPISUJĘ...' : editingException ? 'ZAPISZ ZMIANY' : 'ZAPISZ'}
              </button>
              <button onClick={cancelForm} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer' }}>ANULUJ</button>
            </div>
          </div>
        )}

        {/* Blocks list */}
        {blocks.length > 0 && (
          <div className="mb-4">
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>BLOKADY ({blocks.length})</p>
            <div className="space-y-1">
              {blocks.map(group => (
                <ExceptionRow key={group.representative.id} ex={group.representative} count={group.count} color="#FF007F" border={border} muted={muted} text={text} onEdit={openEditException} onDelete={() => deleteGroup(group)} />
              ))}
            </div>
          </div>
        )}

        {/* Free days list */}
        {frees.length > 0 && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>DYSPOZYCJE / DOSTĘPNE ({frees.length})</p>
            <div className="space-y-1">
              {frees.map(group => (
                <ExceptionRow key={group.representative.id} ex={group.representative} count={group.count} color="#16a34a" border={border} muted={muted} text={text} onEdit={openEditException} onDelete={() => deleteGroup(group)} />
              ))}
            </div>
          </div>
        )}

        {blocks.length === 0 && frees.length === 0 && !showForm && (
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>Brak wpisów</p>
        )}
      </div>
    </div>
  );
}

function matchesRepeat(ex, dateStr) {
  if (!ex.date || ex.date > dateStr) return false;
  if (ex.repeat_until && ex.repeat_until !== 'indefinite' && ex.repeat_until < dateStr) return false;
  if (!ex.repeat || ex.repeat === 'none') return ex.date === dateStr;

  const start = parseISO(ex.date);
  const target = parseISO(dateStr);
  const diffDays = Math.round((target - start) / 86400000);
  if (diffDays < 0) return false;

  if (ex.repeat === 'weekly') return diffDays % 7 === 0;
  if (ex.repeat === 'biweekly') return diffDays % 14 === 0;
  if (ex.repeat === 'monthly') {
    return start.getDate() === target.getDate() && (
      (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) >= 0
    );
  }
  return false;
}

// Helper exported for DailyScheduleView
export function getAvailabilityForDay(availabilityRecords, artistId, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const artistRecords = availabilityRecords.filter(r => r.artist_id === artistId);

  const exception = artistRecords.find(r => r.type === 'exception' && matchesRepeat(r, dateStr));
  if (exception) {
    return {
      isWorkday: exception.is_available,
      start_time: exception.start_time || '09:00',
      end_time: exception.end_time || '18:00',
      isException: true,
    };
  }

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