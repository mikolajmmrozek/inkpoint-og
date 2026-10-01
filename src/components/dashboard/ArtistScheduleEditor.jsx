import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, X, RefreshCw, ChevronDown } from 'lucide-react';
import { format, parseISO, addDays, addWeeks, addMonths, eachDayOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import AvailabilityEditModal from '@/components/dashboard/AvailabilityEditModal';

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

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

const EMPTY_ENTRY = {
  kind: 'block',
  timeMode: 'allday',
  dateMode: 'single',
  date_from: TODAY,
  date_to: TODAY,
  start_time: '09:00',
  end_time: '18:00',
  repeat: 'none',
  repeat_indefinite: false,
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
    try { dayStr = DAY_NAMES_PL[parseISO(ex.date).getDay()]; } catch {}
  }
  let untilStr = '';
  if (ex.repeat_until === 'indefinite' || !ex.repeat_until) {
    untilStr = 'do odwołania';
  } else {
    try { untilStr = `do ${format(parseISO(ex.repeat_until), 'd MMM yyyy', { locale: pl })}`; }
    catch { untilStr = ex.repeat_until; }
  }
  return `${repeatStr}${dayStr ? ` (${dayStr})` : ''} · ${untilStr}`;
}

// Generate all occurrence dates for a group of exceptions
function getGroupDates(records) {
  return records.map(r => r.date).filter(Boolean).sort();
}

// Generate expected dates from a repeat pattern
function generateDates(dateFrom, dateTo, repeat, repeatUntil, repeatIndefinite) {
  const start = parseISO(dateFrom);
  const endLimit = repeatIndefinite
    ? addMonths(new Date(), 24) // 2 years ahead as practical limit
    : (repeatUntil ? parseISO(repeatUntil) : (dateTo ? parseISO(dateTo) : start));

  if (!repeat || repeat === 'none') {
    // Range: all days from date_from to date_to
    if (dateTo && dateTo > dateFrom) {
      return eachDayOfInterval({ start, end: parseISO(dateTo) }).map(d => format(d, 'yyyy-MM-dd'));
    }
    return [dateFrom];
  }

  const dates = [];
  let cur = start;
  while (cur <= endLimit) {
    dates.push(format(cur, 'yyyy-MM-dd'));
    if (repeat === 'weekly') cur = addWeeks(cur, 1);
    else if (repeat === 'biweekly') cur = addWeeks(cur, 2);
    else if (repeat === 'monthly') cur = addMonths(cur, 1);
    else break;
  }
  return dates;
}

// TimeDropdown — godziny i minuty osobno jako natywne selecty
function TimeDropdown({ value, onChange, border, text }) {
  const parts = (value || '09:00').split(':');
  const h = parts[0] || '09';
  const m = MINUTE_OPTIONS.includes(parts[1]) ? parts[1] : '00';
  const setH = (newH) => onChange(`${newH}:${m}`);
  const setM = (newM) => onChange(`${h}:${newM}`);

  const selectStyle = {
    background: text === '#F5F0EB' ? '#1a1a1a' : '#FFFFFF',
    border: `0.5px solid ${border}`,
    color: text,
    padding: '6px 8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    borderRadius: 0,
    flex: 1,
  };

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <select value={h} onChange={e => setH(e.target.value)} style={selectStyle}>
        {HOUR_OPTIONS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color: text, fontSize: '14px', flexShrink: 0 }}>:</span>
      <select value={m} onChange={e => setM(e.target.value)} style={selectStyle}>
        {MINUTE_OPTIONS.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

function ExceptionRow({ group, color, border, muted, text, onView, onEdit, onDelete }) {
  const ex = group.representative;
  const count = group.count;
  const timeStr = ex.start_time && ex.end_time ? `${ex.start_time}–${ex.end_time}` : 'cały dzień';
  const isRecurring = ex.repeat && ex.repeat !== 'none';
  const isGrouped = count > 1;
  const repeatLabel = formatRepeatLabel(ex);

  let dateStr = ex.date || '';
  try { dateStr = format(parseISO(ex.date), 'd MMM yyyy', { locale: pl }); } catch {}

  return (
    <div className="cursor-pointer" style={{ border: `0.5px solid ${color}33`, background: `${color}06` }}
      onClick={() => onView(group)}
      onMouseEnter={e => e.currentTarget.style.background = `${color}10`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}06`}
    >
      {/* Baner cykliczności */}
      {isRecurring && (
        <div className="flex items-center gap-1 px-3 py-1" style={{ borderBottom: `0.5px solid ${color}20`, background: `${color}0a` }}>
          <RefreshCw size={8} color={color} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            WYDARZENIE CYKLICZNE · {count} {count === 1 ? 'wpis' : count < 5 ? 'wpisy' : 'wpisów'}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isRecurring ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em' }}>
              {repeatLabel}
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em' }}>
              {isGrouped ? `${dateStr} (+${count - 1} więcej)` : dateStr}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, opacity: 0.7, letterSpacing: '0.04em' }}>· {timeStr}</span>
        </div>
        {ex.note && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: muted, marginTop: '2px' }}>{ex.note}</p>}
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); onEdit(group); }} title="Edytuj" style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={10} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} title={isGrouped ? `Usuń wszystkie ${count} wpisy` : 'Usuń'} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={11} /></button>
      </div>
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
  const [editingGroup, setEditingGroup] = useState(null); // group being edited
  const [viewModal, setViewModal] = useState(null); // { record, dateStr, startInEdit }
  const theme = t?.bg?.includes('FFF') || t?.bg === '#FFFFFF' ? 'light' : 'dark';

  const border = t?.border || '#262626';
  const text = t?.text || '#F5F0EB';
  const muted = t?.muted || 'rgba(245,240,235,0.4)';

  const reload = async () => {
    const all = await base44.entities.ArtistAvailability.filter({ artist_id: artistId }, '-date', 500);
    setRecurring(all.filter(r => r.type === 'recurring'));
    setExceptions(all.filter(r => r.type === 'exception').sort((a, b) => (a.date || '').localeCompare(b.date || '')));
  };

  useEffect(() => {
    if (!artistId) return;
    reload().then(() => setLoading(false));
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

  // Group exceptions by fingerprint: same note + start_time + end_time + repeat
  function groupExceptions(list) {
    const groupMap = new Map();
    for (const ex of list) {
      const key = `${ex.note || ''}|${ex.start_time || ''}|${ex.end_time || ''}|${ex.repeat || 'none'}|${ex.is_available}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { representative: ex, allRecords: [], count: 0 });
      }
      const g = groupMap.get(key);
      g.allRecords.push(ex);
      g.count++;
    }
    return Array.from(groupMap.values());
  }

  const saveEntry = async () => {
    setSaving(true);
    const isAvailable = entry.kind === 'free';
    const allDay = entry.timeMode === 'allday';
    const effectiveUntil = entry.repeat_indefinite ? 'indefinite' : (entry.repeat_until || undefined);
    const dates = generateDates(entry.date_from, entry.date_to, entry.repeat, entry.repeat_until, entry.repeat_indefinite);

    await Promise.all(dates.map(date =>
      base44.entities.ArtistAvailability.create({
        artist_id: artistId,
        type: 'exception',
        date,
        is_available: isAvailable,
        start_time: allDay ? null : entry.start_time,
        end_time: allDay ? null : entry.end_time,
        note: entry.note || undefined,
        repeat: entry.repeat !== 'none' ? entry.repeat : 'none',
        repeat_until: entry.repeat !== 'none' ? effectiveUntil : undefined,
      })
    ));

    await reload();
    setShowForm(false);
    setEditingGroup(null);
    setEntry(EMPTY_ENTRY);
    setSaving(false);
  };

  const saveEditGroup = async () => {
    setSaving(true);
    const isAvailable = entry.kind === 'free';
    const allDay = entry.timeMode === 'allday';
    const newDates = new Set(generateDates(entry.date_from, entry.date_to, entry.repeat, entry.repeat_until, entry.repeat_indefinite));
    const oldRecords = editingGroup.allRecords;
    const oldDates = new Set(oldRecords.map(r => r.date));

    // Dates to remove (in old but not new)
    const toDelete = oldRecords.filter(r => !newDates.has(r.date));
    // Dates to update (in both)
    const toUpdate = oldRecords.filter(r => newDates.has(r.date));
    // Dates to add (in new but not old)
    const toAdd = [...newDates].filter(d => !oldDates.has(d));

    const effectiveUntil = entry.repeat_indefinite ? 'indefinite' : (entry.repeat_until || undefined);
    const updateData = {
      is_available: isAvailable,
      start_time: allDay ? null : entry.start_time,
      end_time: allDay ? null : entry.end_time,
      note: entry.note || undefined,
      repeat: entry.repeat !== 'none' ? entry.repeat : 'none',
      repeat_until: entry.repeat !== 'none' ? effectiveUntil : undefined,
    };

    // Wykonuj partiami po 5 żeby nie przekroczyć rate limit
    const allOps = [
      ...toDelete.map(r => () => base44.entities.ArtistAvailability.delete(r.id).catch(() => null)),
      ...toUpdate.map(r => () => base44.entities.ArtistAvailability.update(r.id, { ...updateData, date: r.date }).catch(() => null)),
      ...toAdd.map(date => () => base44.entities.ArtistAvailability.create({ artist_id: artistId, type: 'exception', date, ...updateData })),
    ];
    const BATCH = 5;
    for (let i = 0; i < allOps.length; i += BATCH) {
      await Promise.all(allOps.slice(i, i + BATCH).map(fn => fn()));
      if (i + BATCH < allOps.length) await new Promise(res => setTimeout(res, 1200));
    }

    await reload();
    setShowForm(false);
    setEditingGroup(null);
    setEntry(EMPTY_ENTRY);
    setSaving(false);
  };

  const deleteGroup = async (group) => {
    await Promise.all(group.allRecords.map(r => base44.entities.ArtistAvailability.delete(r.id)));
    setExceptions(e => e.filter(x => !group.allRecords.find(r => r.id === x.id)));
  };

  const openViewModal = (group, startInEdit = false) => {
    const ex = group.representative;
    const dateStr = ex.date || '';
    setViewModal({ record: ex, allRecords: group.allRecords, dateStr, startInEdit });
  };

  const openEditGroup = (group) => {
    const ex = group.representative;
    const dates = group.allRecords.map(r => r.date).filter(Boolean).sort();
    setEditingGroup(group);
    setEntry({
      kind: ex.is_available ? 'free' : 'block',
      timeMode: ex.start_time && ex.end_time ? 'hours' : 'allday',
      dateMode: dates.length > 1 ? 'range' : 'single',
      date_from: dates[0] || ex.date || TODAY,
      date_to: dates[dates.length - 1] || ex.date || TODAY,
      start_time: ex.start_time || '09:00',
      end_time: ex.end_time || '18:00',
      repeat: ex.repeat || 'none',
      repeat_indefinite: ex.repeat_until === 'indefinite',
      repeat_until: ex.repeat_until === 'indefinite' ? '' : (ex.repeat_until || ''),
      note: ex.note || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setEntry(EMPTY_ENTRY);
  };

  const lbl = (txt) => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const inp = (val, onChange, type = 'text') => ({
    type,
    value: val,
    onChange,
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '7px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark' },
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = border,
  });

  const SegBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{ flex: 1, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', background: active ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', border: `0.5px solid ${active ? 'var(--brand)' : border}`, color: active ? 'var(--brand)' : muted, cursor: 'pointer' }}>
      {children}
    </button>
  );

  if (loading) return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted }}>ŁADOWANIE...</div>;

  const activeCount = DAYS.filter(d => isDayActive(d.value)).length;
  const blocks = groupExceptions(exceptions.filter(e => !e.is_available));
  const frees = groupExceptions(exceptions.filter(e => e.is_available));

  return (
    <div className="space-y-6">
      {/* ── Grafik tygodniowy ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            GRAFIK TYGODNIOWY ({activeCount} dni)
          </p>
          <button onClick={applyDefault} disabled={saving} style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer' }}>
            RESETUJ DO DOMYŚLNEGO
          </button>
        </div>
        <div className="space-y-1">
          {DAYS.map(({ label, value }) => {
            const active = isDayActive(value);
            const rec = getDayEntry(value);
            return (
              <div key={value} className="flex items-center gap-3" style={{ padding: '5px 0', borderBottom: `0.5px solid ${border}18` }}>
                <button onClick={() => toggleDay(value)} style={{ width: '28px', height: '28px', flexShrink: 0, border: `0.5px solid ${active ? 'var(--brand)' : border}`, background: active ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', color: active ? 'var(--brand)' : muted }}>
                  {label}
                </button>
                {active && rec ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div style={{ width: '90px' }}>
                      <TimeDropdown value={rec.start_time || '09:00'} onChange={v => updateDayTime(rec, 'start_time', v)} border={border} text={text} muted={muted} />
                    </div>
                    <span style={{ color: muted, fontSize: '11px' }}>–</span>
                    <div style={{ width: '90px' }}>
                      <TimeDropdown value={rec.end_time || '18:00'} onChange={v => updateDayTime(rec, 'end_time', v)} border={border} text={text} muted={muted} />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>wolne</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Blokady / Dodaj wolne ── */}
      <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DODAJ WOLNE
          </p>
          {!showForm && (
            <button onClick={() => { setShowForm(true); setEditingGroup(null); setEntry(EMPTY_ENTRY); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={10} /> DODAJ
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-4 p-4 space-y-4" style={{ border: `0.5px solid rgb(var(--brand-rgb) /0.25)`, background: 'rgb(var(--brand-rgb) /0.02)' }}>
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {editingGroup ? `EDYTUJ WPIS (×${editingGroup.count})` : 'NOWY WPIS'}
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

            {/* Date mode */}
            <div>
              {lbl('ZAKRES DAT')}
              <div className="flex gap-2">
                <SegBtn active={entry.dateMode === 'single'} onClick={() => setEntry(e => ({ ...e, dateMode: 'single', date_to: e.date_from }))}>Jeden dzień</SegBtn>
                <SegBtn active={entry.dateMode === 'range'} onClick={() => setEntry(e => ({ ...e, dateMode: 'range' }))}>Zakres (od–do)</SegBtn>
              </div>
            </div>

            {/* Date inputs */}
            {entry.dateMode === 'single' ? (
              <div>{lbl('DATA')}<input {...inp(entry.date_from, e => setEntry(n => ({ ...n, date_from: e.target.value, date_to: e.target.value })), 'date')} /></div>
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
                <div>
                  {lbl('OD GODZINY')}
                  <TimeDropdown value={entry.start_time} onChange={v => setEntry(n => ({ ...n, start_time: v }))} border={border} text={text} muted={muted} />
                </div>
                <div>
                  {lbl('DO GODZINY')}
                  <TimeDropdown value={entry.end_time} onChange={v => setEntry(n => ({ ...n, end_time: v }))} border={border} text={text} muted={muted} />
                </div>
              </div>
            )}

            {/* Repeat */}
            <div>
              {lbl('POWTARZANIE')}
              <div className="flex gap-1 flex-wrap">
                {[['none','Brak'], ['weekly','Co tydzień'], ['biweekly','Co 2 tyg.'], ['monthly','Co miesiąc']].map(([val, label]) => (
                  <SegBtn key={val} active={entry.repeat === val} onClick={() => setEntry(e => ({ ...e, repeat: val }))}>{label}</SegBtn>
                ))}
              </div>
            </div>

            {/* Repeat until */}
            {entry.repeat !== 'none' && (
              <div>
                {lbl('ZAKOŃCZENIE POWTARZANIA')}
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={entry.repeat_until}
                    onChange={e => setEntry(n => ({ ...n, repeat_until: e.target.value, repeat_indefinite: false }))}
                    disabled={entry.repeat_indefinite}
                    style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${border}`, color: text, padding: '7px 0', fontSize: '13px', flex: 1, outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark', opacity: entry.repeat_indefinite ? 0.3 : 1 }}
                  />
                  <button
                    onClick={() => setEntry(e => ({ ...e, repeat_indefinite: !e.repeat_indefinite, repeat_until: '' }))}
                    style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${entry.repeat_indefinite ? 'var(--brand)' : border}`, color: entry.repeat_indefinite ? 'var(--brand)' : muted, background: entry.repeat_indefinite ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
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

            {editingGroup && (
              <div style={{ padding: '8px 10px', background: 'rgb(var(--brand-rgb) /0.04)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', letterSpacing: '0.1em' }}>
                  Zmiana zakresu dat: wpisy poza nowym zakresem zostaną usunięte, nowe daty zostaną dodane.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={editingGroup ? saveEditGroup : saveEntry}
                disabled={saving}
                className="btn-oxblood"
                style={{ fontSize: '9px', padding: '8px 18px' }}
              >
                {saving ? 'ZAPISUJĘ...' : editingGroup ? 'ZAPISZ ZMIANY' : 'ZAPISZ'}
              </button>
              <button onClick={cancelForm} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid ${border}`, color: muted, background: 'transparent', cursor: 'pointer' }}>ANULUJ</button>
            </div>
          </div>
        )}

        {/* Blocks list */}
        {blocks.length > 0 && (
          <div className="mb-4">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>BLOKADY ({blocks.length})</p>
            <div className="space-y-1">
              {blocks.map(group => (
                <ExceptionRow key={group.representative.id} group={group} color="var(--brand)" border={border} muted={muted} text={text} onView={g => openViewModal(g, false)} onEdit={g => openViewModal(g, true)} onDelete={() => deleteGroup(group)} />
              ))}
            </div>
          </div>
        )}

        {/* Free days list */}
        {frees.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>DYSPOZYCJE / DOSTĘPNE ({frees.length})</p>
            <div className="space-y-1">
              {frees.map(group => (
                <ExceptionRow key={group.representative.id} group={group} color="#16a34a" border={border} muted={muted} text={text} onView={g => openViewModal(g, false)} onEdit={g => openViewModal(g, true)} onDelete={() => deleteGroup(group)} />
              ))}
            </div>
          </div>
        )}

        {blocks.length === 0 && frees.length === 0 && !showForm && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>Brak wpisów</p>
        )}
      </div>

      {/* Popup podglądu/edycji */}
      {viewModal && (
        <AvailabilityEditModal
          record={viewModal.record}
          allRecords={viewModal.allRecords}
          dateStr={viewModal.dateStr}
          theme={theme}
          startInEdit={viewModal.startInEdit}
          onClose={() => setViewModal(null)}
          onSaved={async () => { setViewModal(null); await reload(); }}
        />
      )}
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