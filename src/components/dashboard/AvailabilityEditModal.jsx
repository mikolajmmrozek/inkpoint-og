import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addWeeks, addMonths, eachDayOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';

export function generateDates(dateFrom, dateTo, repeat, repeatUntil, repeatIndefinite) {
  const start = parseISO(dateFrom);
  const endLimit = repeatIndefinite
    ? addMonths(new Date(), 24)
    : (repeatUntil ? parseISO(repeatUntil) : (dateTo ? parseISO(dateTo) : start));

  if (!repeat || repeat === 'none') {
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

const REPEAT_LABELS = { weekly: 'Co tydzień', biweekly: 'Co 2 tygodnie', monthly: 'Co miesiąc' };
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function TimeDropdown({ value, onChange, border, text }) {
  const parts = (value || '09:00').split(':');
  const h = parts[0] || '09';
  const m = MINUTE_OPTIONS.includes(parts[1]) ? parts[1] : '00';
  const setH = (newH) => onChange(`${newH}:${m}`);
  const setM = (newM) => onChange(`${h}:${newM}`);
  const selectStyle = {
    background: '#1a1a1a', border: `0.5px solid ${border}`, color: text,
    padding: '6px 8px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-body)',
    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', borderRadius: 0, flex: 1,
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

function Row({ label, value, color, t }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
      <p style={{ color: t.text, fontSize: '13px' }}>{value}</p>
    </div>
  );
}

// steps: 'view' | 'confirm_edit' | 'edit' | 'confirm_delete_scope' | 'confirm_delete'
export default function AvailabilityEditModal({ record, allRecords, dateStr, theme, onClose, onSaved, startInEdit = false }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const isRecurring = !!(record.repeat && record.repeat !== 'none');
  const groupRecords = allRecords && allRecords.length > 0 ? allRecords : [record];

  const initialStep = startInEdit
    ? (isRecurring ? 'confirm_edit' : 'edit')
    : 'view';
  const initialScope = startInEdit && !isRecurring ? 'cycle' : null;

  const [step, setStep] = useState(initialStep);
  const [editScope, setEditScope] = useState(initialScope);
  const [deleteScope, setDeleteScope] = useState(null); // 'occurrence' | 'cycle'
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    kind: record.is_available ? 'free' : 'block',
    timeMode: record.start_time && record.end_time ? 'hours' : 'allday',
    start_time: record.start_time || '09:00',
    end_time: record.end_time || '18:00',
    note: record.note || '',
    repeat: record.repeat || 'none',
    repeat_until: record.repeat_until === 'indefinite' ? '' : (record.repeat_until || ''),
    repeat_indefinite: record.repeat_until === 'indefinite',
    date: dateStr || record.date || '',
  });

  let dateDisplay = '';
  try { dateDisplay = format(parseISO(dateStr || record.date), 'd MMMM yyyy (EEEE)', { locale: pl }); } catch {}
  let repeatDisplay = '';
  if (isRecurring) {
    const label = REPEAT_LABELS[record.repeat] || record.repeat;
    const until = record.repeat_until === 'indefinite' || !record.repeat_until ? 'do odwołania' : `do ${record.repeat_until}`;
    repeatDisplay = `${label} · ${until}`;
  }
  const timeDisplay = record.start_time && record.end_time ? `${record.start_time}–${record.end_time}` : 'Cały dzień';
  const typeLabel = record.is_available ? 'Dyspozycja (dostępny)' : 'Blokada (niedostępny)';
  const typeColor = record.is_available ? '#16a34a' : 'var(--brand)';

  const lbl = txt => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const SegBtn = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick} style={{ flex: 1, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: active ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, cursor: 'pointer' }}>
      {children}
    </button>
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const isAvail = form.kind === 'free';
      const allDay = form.timeMode === 'allday';
      const effectiveUntil = form.repeat_indefinite ? 'indefinite' : (form.repeat_until || undefined);

      if (editScope === 'occurrence') {
        // Utwórz osobny wyjątek dla tego konkretnego dnia
        await base44.entities.ArtistAvailability.create({
          artist_id: record.artist_id,
          type: 'exception',
          date: dateStr || record.date,
          is_available: isAvail,
          start_time: allDay ? null : form.start_time,
          end_time: allDay ? null : form.end_time,
          note: form.note || undefined,
          repeat: 'none',
        });
      } else {
        // Edytuj cały cykl
        const newDates = new Set(generateDates(form.date || record.date, null, form.repeat, form.repeat_until, form.repeat_indefinite));
        const oldDates = new Set(groupRecords.map(r => r.date));
        const updateData = {
          is_available: isAvail,
          start_time: allDay ? null : form.start_time,
          end_time: allDay ? null : form.end_time,
          note: form.note || undefined,
          repeat: form.repeat !== 'none' ? form.repeat : 'none',
          repeat_until: form.repeat !== 'none' ? effectiveUntil : undefined,
        };
        const toDelete = groupRecords.filter(r => !newDates.has(r.date));
        const toUpdate = groupRecords.filter(r => newDates.has(r.date));
        const toAdd = [...newDates].filter(d => !oldDates.has(d));
        const allOps = [
          ...toDelete.map(r => () => base44.entities.ArtistAvailability.delete(r.id).catch(() => null)),
          ...toUpdate.map(r => () => base44.entities.ArtistAvailability.update(r.id, { ...updateData, date: r.date }).catch(() => null)),
          ...toAdd.map(date => () => base44.entities.ArtistAvailability.create({ artist_id: record.artist_id, type: 'exception', date, ...updateData }).catch(() => null)),
        ];
        const BATCH = 15;
        for (let i = 0; i < allOps.length; i += BATCH) {
          await Promise.all(allOps.slice(i, i + BATCH).map(fn => fn()));
          if (i + BATCH < allOps.length) await new Promise(res => setTimeout(res, 1200));
        }
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      if (deleteScope === 'occurrence') {
        const exactRecord = groupRecords.find(r => r.date === (dateStr || record.date)) || record;
        await base44.entities.ArtistAvailability.delete(exactRecord.id).catch(() => null);
      } else {
        // Usuń cały cykl sekwencyjnie po 5 z opóźnieniem
        const BATCH = 5;
        for (let i = 0; i < groupRecords.length; i += BATCH) {
          const batch = groupRecords.slice(i, i + BATCH);
          await Promise.all(batch.map(r => base44.entities.ArtistAvailability.delete(r.id).catch(() => null)));
          if (i + BATCH < groupRecords.length) await new Promise(res => setTimeout(res, 1200));
        }
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const cyclePreview = (() => {
    if (editScope !== 'cycle' || step !== 'edit') return null;
    const newDates = new Set(generateDates(form.date || record.date, null, form.repeat, form.repeat_until, form.repeat_indefinite));
    const oldDates = new Set(groupRecords.map(r => r.date));
    return {
      total: newDates.size,
      toDelete: groupRecords.filter(r => !newDates.has(r.date)).length,
      toAdd: [...newDates].filter(d => !oldDates.has(d)).length,
    };
  })();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md overflow-y-auto"
          style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '28px', maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: typeColor, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {step === 'edit' ? 'EDYTUJ WPIS' : 'DYSPOZYCJA / BLOKADA'}
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
                {typeLabel}
              </h3>
              {isRecurring && (
                <div className="flex items-center gap-1 mt-2">
                  <RefreshCw size={9} color={typeColor} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: typeColor, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>
                    Wydarzenie cykliczne · {REPEAT_LABELS[record.repeat]}
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={16} /></button>
          </div>

          {/* ── VIEW ── */}
          {step === 'view' && (
            <div className="space-y-4">
              {isRecurring && (
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: `${typeColor}08`, border: `0.5px solid ${typeColor}30` }}>
                  <RefreshCw size={10} color={typeColor} style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: typeColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      WYDARZENIE CYKLICZNE
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '1px' }}>
                      {repeatDisplay} · {groupRecords.length} {groupRecords.length === 1 ? 'wpis' : groupRecords.length < 5 ? 'wpisy' : 'wpisów'} w cyklu
                    </p>
                  </div>
                </div>
              )}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }} className="space-y-3">
                <Row label="DATA" value={dateDisplay} color={typeColor} t={t} />
                <Row label="CZAS" value={timeDisplay} color={typeColor} t={t} />
                {record.note && <Row label="NOTATKA" value={record.note} color={typeColor} t={t} />}
              </div>
              <div className="flex gap-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button
                  onClick={() => isRecurring ? setStep('confirm_edit') : (setEditScope('cycle'), setStep('edit'))}
                  className="btn-oxblood flex-1" style={{ fontSize: '9px' }}
                >EDYTUJ</button>
                <button
                  onClick={() => isRecurring ? setStep('confirm_delete_scope') : setStep('confirm_delete')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid rgb(var(--brand-rgb) /0.4)`, color: 'var(--brand)', background: 'transparent', cursor: 'pointer' }}
                >USUŃ</button>
              </div>
            </div>
          )}

          {/* ── CONFIRM EDIT SCOPE ── */}
          {step === 'confirm_edit' && (
            <div className="space-y-4">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.04em', lineHeight: 1.6 }}>
                To wydarzenie jest częścią cyklu ({REPEAT_LABELS[record.repeat]}).<br />Co chcesz edytować?
              </p>
              <div className="space-y-2 pt-2">
                {[
                  ['occurrence', 'TYLKO TEN DZIEŃ', dateDisplay],
                  ['cycle', 'CAŁY CYKL', `${repeatDisplay} · ${groupRecords.length} wpisów`],
                ].map(([scope, title, sub]) => (
                  <button key={scope} onClick={() => { setEditScope(scope); setStep('edit'); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</p>
                    <p style={{ fontSize: '12px', color: t.muted }}>{sub}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('view')} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>← WRÓĆ</button>
            </div>
          )}

          {/* ── CONFIRM DELETE SCOPE (dla cyklicznych) ── */}
          {step === 'confirm_delete_scope' && (
            <div className="space-y-4">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.04em', lineHeight: 1.6 }}>
                To wydarzenie jest częścią cyklu ({REPEAT_LABELS[record.repeat]}).<br />Co chcesz usunąć?
              </p>
              <div className="space-y-2 pt-2">
                {[
                  ['occurrence', 'TYLKO TEN DZIEŃ', dateDisplay],
                  ['cycle', 'CAŁY CYKL', `${repeatDisplay} · ${groupRecords.length} wpisów`],
                ].map(([scope, title, sub]) => (
                  <button key={scope} onClick={() => { setDeleteScope(scope); setStep('confirm_delete'); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</p>
                    <p style={{ fontSize: '12px', color: t.muted }}>{sub}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('view')} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>← WRÓĆ</button>
            </div>
          )}

          {/* ── CONFIRM DELETE (monit potwierdzenia) ── */}
          {step === 'confirm_delete' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-3 py-3" style={{ background: 'rgb(var(--brand-rgb) /0.06)', border: '0.5px solid rgb(var(--brand-rgb) /0.3)' }}>
                <AlertTriangle size={16} color="var(--brand)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    POTWIERDŹ USUNIĘCIE
                  </p>
                  <p style={{ fontSize: '13px', color: t.text, lineHeight: 1.5 }}>
                    {deleteScope === 'cycle' || !isRecurring
                      ? `Usunięcie obejmie ${isRecurring ? `cały cykl (${groupRecords.length} ${groupRecords.length === 1 ? 'wpis' : groupRecords.length < 5 ? 'wpisy' : 'wpisów'})` : 'to wydarzenie'}. Tej operacji nie można cofnąć.`
                      : `Zostanie usunięty tylko wpis z dnia ${dateDisplay}.`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleDelete} disabled={saving}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 14px', background: 'linear-gradient(135deg,var(--brand),var(--brand))', color: '#F5F0EB', border: 'none', cursor: 'pointer' }}>
                  {saving ? 'USUWAM...' : 'TAK, USUŃ'}
                </button>
                <button onClick={() => setStep(isRecurring ? 'confirm_delete_scope' : 'view')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 14px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>
                  ANULUJ
                </button>
              </div>
            </div>
          )}

          {/* ── EDIT FORM ── */}
          {step === 'edit' && (
            <div className="space-y-4">
              {editScope === 'occurrence' && (
                <div style={{ padding: '8px 10px', background: 'rgb(var(--brand-rgb) /0.05)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em' }}>EDYTUJESZ TYLKO: {dateDisplay}</p>
                </div>
              )}
              {editScope === 'cycle' && (
                <div style={{ padding: '10px 12px', background: 'rgba(22,163,74,0.05)', border: '0.5px solid rgba(22,163,74,0.25)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>EDYTUJESZ CAŁY CYKL</p>
                  {cyclePreview && (
                    <div className="space-y-1">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>
                        Łącznie po zapisie: <span style={{ color: t.text }}>{cyclePreview.total} wpisów</span>
                      </p>
                      {cyclePreview.toAdd > 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a' }}>+ {cyclePreview.toAdd} nowych</p>}
                      {cyclePreview.toDelete > 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)' }}>− {cyclePreview.toDelete} usuniętych</p>}
                    </div>
                  )}
                </div>
              )}

              <div>
                {lbl('TYP')}
                <div className="flex gap-2">
                  <SegBtn active={form.kind === 'block'} onClick={() => setForm(f => ({ ...f, kind: 'block' }))}>Blokada</SegBtn>
                  <SegBtn active={form.kind === 'free'} onClick={() => setForm(f => ({ ...f, kind: 'free' }))}>Dyspozycja</SegBtn>
                </div>
              </div>

              {editScope === 'cycle' && (
                <div>
                  {lbl('DATA STARTU')}
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '8px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark' }} />
                </div>
              )}

              <div>
                {lbl('CZAS')}
                <div className="flex gap-2 mb-3">
                  <SegBtn active={form.timeMode === 'allday'} onClick={() => setForm(f => ({ ...f, timeMode: 'allday' }))}>Cały dzień</SegBtn>
                  <SegBtn active={form.timeMode === 'hours'} onClick={() => setForm(f => ({ ...f, timeMode: 'hours' }))}>Godziny</SegBtn>
                </div>
                {form.timeMode === 'hours' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>{lbl('OD')}<TimeDropdown value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} border={t.inputBorder} text={t.text} /></div>
                    <div>{lbl('DO')}<TimeDropdown value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} border={t.inputBorder} text={t.text} /></div>
                  </div>
                )}
              </div>

              {editScope === 'cycle' && (
                <>
                  <div>
                    {lbl('POWTARZANIE')}
                    <div className="flex gap-1 flex-wrap">
                      {[['none', 'Brak'], ['weekly', 'Co tydzień'], ['biweekly', 'Co 2 tyg.'], ['monthly', 'Co miesiąc']].map(([val, label]) => (
                        <SegBtn key={val} active={form.repeat === val} onClick={() => setForm(f => ({ ...f, repeat: val }))}>{label}</SegBtn>
                      ))}
                    </div>
                  </div>
                  {form.repeat !== 'none' && (
                    <div>
                      {lbl('ZAKOŃCZENIE')}
                      <div className="flex items-center gap-3">
                        <input type="date" value={form.repeat_until}
                          onChange={e => setForm(f => ({ ...f, repeat_until: e.target.value, repeat_indefinite: false }))}
                          disabled={form.repeat_indefinite}
                          style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '8px 0', fontSize: '13px', flex: 1, outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark', opacity: form.repeat_indefinite ? 0.3 : 1 }} />
                        <button type="button" onClick={() => setForm(f => ({ ...f, repeat_indefinite: !f.repeat_indefinite, repeat_until: '' }))}
                          style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 8px', border: `0.5px solid ${form.repeat_indefinite ? 'var(--brand)' : t.border}`, color: form.repeat_indefinite ? 'var(--brand)' : t.muted, background: form.repeat_indefinite ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Do odwołania
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                {lbl('NOTATKA')}
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="np. urlop..."
                  style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '8px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' }} />
              </div>

              <div className="flex gap-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleSave} disabled={saving} className="btn-oxblood flex-1" style={{ fontSize: '9px' }}>
                  {saving ? 'ZAPISUJĘ...' : 'ZAPISZ'}
                </button>
                <button onClick={() => setStep(isRecurring ? 'confirm_edit' : 'view')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>
                  ANULUJ
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}