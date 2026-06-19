import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

const REPEAT_LABELS = { weekly: 'Co tydzień', biweekly: 'Co 2 tygodnie', monthly: 'Co miesiąc' };
const DAY_NAMES = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

// Modal with two modes:
// 1. Confirm dialog — "edit this occurrence or whole cycle?"
// 2. Edit form

export default function AvailabilityEditModal({ record, dateStr, theme, onClose, onSaved }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const isRecurring = record.repeat && record.repeat !== 'none';

  // Step: 'view' | 'confirm' | 'edit'
  const [step, setStep] = useState('view');
  // 'occurrence' = only this date, 'cycle' = the whole record
  const [editScope, setEditScope] = useState(null);
  const [saving, setSaving] = useState(false);

  const initForm = () => ({
    kind: record.is_available ? 'free' : 'block',
    start_time: record.start_time || '09:00',
    end_time: record.end_time || '18:00',
    timeMode: record.start_time && record.end_time ? 'hours' : 'allday',
    note: record.note || '',
    repeat: record.repeat || 'none',
    repeat_until: record.repeat_until === 'indefinite' ? '' : (record.repeat_until || ''),
    repeat_indefinite: record.repeat_until === 'indefinite',
    date: dateStr || record.date || '',
  });

  const [form, setForm] = useState(initForm);

  const inp = (field, type = 'text') => ({
    type,
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '8px 0', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: 'dark' },
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.inputBorder,
  });

  const lbl = txt => (
    <label style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const SegBtn = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick} style={{ flex: 1, padding: '6px 8px', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: active ? 'rgba(255,0,127,0.1)' : 'transparent', border: `0.5px solid ${active ? '#FF007F' : t.border}`, color: active ? '#FF007F' : t.muted, cursor: 'pointer' }}>
      {children}
    </button>
  );

  const handleEditClick = () => {
    if (isRecurring) {
      setStep('confirm');
    } else {
      setEditScope('cycle');
      setStep('edit');
    }
  };

  const handleScopeSelect = (scope) => {
    setEditScope(scope);
    setStep('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    const isAvail = form.kind === 'free';
    const allDay = form.timeMode === 'allday';
    const effectiveUntil = form.repeat_indefinite ? 'indefinite' : (form.repeat_until || undefined);

    if (editScope === 'occurrence') {
      // Create a new single-day exception for this specific date (overrides the cycle for that day)
      await base44.entities.ArtistAvailability.create({
        artist_id: record.artist_id,
        type: 'exception',
        date: dateStr,
        is_available: isAvail,
        start_time: allDay ? null : form.start_time,
        end_time: allDay ? null : form.end_time,
        note: form.note || undefined,
        repeat: 'none',
        repeat_until: undefined,
      });
    } else {
      // Edit the whole record
      await base44.entities.ArtistAvailability.update(record.id, {
        is_available: isAvail,
        start_time: allDay ? null : form.start_time,
        end_time: allDay ? null : form.end_time,
        note: form.note || undefined,
        repeat: form.repeat !== 'none' ? form.repeat : 'none',
        repeat_until: form.repeat !== 'none' ? effectiveUntil : undefined,
        date: form.date || record.date,
      });
    }

    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    setSaving(true);
    if (editScope === 'occurrence' || !isRecurring) {
      // For non-recurring or when user chose "this only" — create a blocking override for this day
      // Actually for delete: if cycle, just delete the record; if occurrence, create a "cancelled" marker isn't needed —
      // For simplicity: delete is only available on cycle scope (whole record)
      await base44.entities.ArtistAvailability.delete(record.id);
    }
    setSaving(false);
    onSaved();
  };

  // Format display info
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
  const typeColor = record.is_available ? '#16a34a' : '#FF007F';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md"
          style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '28px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: typeColor, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {step === 'edit' ? 'EDYTUJ WPIS' : 'DYSPOZYCJA / BLOKADA'}
              </p>
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
                {typeLabel}
              </h3>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={16} /></button>
          </div>

          {/* ── VIEW ── */}
          {step === 'view' && (
            <div className="space-y-4">
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }} className="space-y-3">
                <Row label="DATA" value={dateDisplay} color={typeColor} t={t} />
                <Row label="CZAS" value={timeDisplay} color={typeColor} t={t} />
                {isRecurring && (
                  <Row label="POWTARZANIE" value={repeatDisplay} color={typeColor} t={t} icon={<RefreshCw size={9} />} />
                )}
                {record.note && <Row label="NOTATKA" value={record.note} color={typeColor} t={t} />}
              </div>
              <div className="flex gap-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleEditClick} className="btn-oxblood flex-1" style={{ fontSize: '9px' }}>EDYTUJ</button>
                {!isRecurring && (
                  <button onClick={handleDelete} disabled={saving} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid rgba(255,0,127,0.4)`, color: '#FF007F', background: 'transparent', cursor: 'pointer' }}>
                    {saving ? '...' : 'USUŃ'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── CONFIRM scope ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text, letterSpacing: '0.04em', lineHeight: 1.6 }}>
                Ten wpis jest wydarzeniem cyklicznym ({REPEAT_LABELS[record.repeat]}).<br />
                Co chcesz edytować?
              </p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleScopeSelect('occurrence')}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#FF007F'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>TYLKO TEN DZIEŃ</p>
                  <p style={{ fontSize: '12px', color: t.muted }}>{dateDisplay}</p>
                </button>
                <button
                  onClick={() => handleScopeSelect('cycle')}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#FF007F'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>CAŁY CYKL</p>
                  <p style={{ fontSize: '12px', color: t.muted }}>{repeatDisplay}</p>
                </button>
              </div>
              <button onClick={() => setStep('view')} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>← WRÓĆ</button>
            </div>
          )}

          {/* ── EDIT FORM ── */}
          {step === 'edit' && (
            <div className="space-y-4">
              {editScope === 'occurrence' && (
                <div style={{ padding: '8px 10px', background: 'rgba(255,0,127,0.05)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.1em' }}>
                    EDYTUJESZ TYLKO: {dateDisplay}
                  </p>
                </div>
              )}

              {/* Typ */}
              <div>
                {lbl('TYP')}
                <div className="flex gap-2">
                  <SegBtn active={form.kind === 'block'} onClick={() => setForm(f => ({ ...f, kind: 'block' }))}>Blokada</SegBtn>
                  <SegBtn active={form.kind === 'free'} onClick={() => setForm(f => ({ ...f, kind: 'free' }))}>Dyspozycja</SegBtn>
                </div>
              </div>

              {/* Czas */}
              <div>
                {lbl('CZAS')}
                <div className="flex gap-2 mb-3">
                  <SegBtn active={form.timeMode === 'allday'} onClick={() => setForm(f => ({ ...f, timeMode: 'allday' }))}>Cały dzień</SegBtn>
                  <SegBtn active={form.timeMode === 'hours'} onClick={() => setForm(f => ({ ...f, timeMode: 'hours' }))}>Godziny</SegBtn>
                </div>
                {form.timeMode === 'hours' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>{lbl('OD')}<input {...inp('start_time', 'time')} /></div>
                    <div>{lbl('DO')}<input {...inp('end_time', 'time')} /></div>
                  </div>
                )}
              </div>

              {/* Data (only cycle edit) */}
              {editScope === 'cycle' && (
                <div>{lbl('DATA STARTU')}<input {...inp('date', 'date')} /></div>
              )}

              {/* Repeat (only cycle edit and non-occurrence) */}
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
                          style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '8px 0', fontSize: '13px', flex: 1, outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: 'dark', opacity: form.repeat_indefinite ? 0.3 : 1 }}
                        />
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, repeat_indefinite: !f.repeat_indefinite, repeat_until: '' }))}
                          style={{ flexShrink: 0, fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 8px', border: `0.5px solid ${form.repeat_indefinite ? '#FF007F' : t.border}`, color: form.repeat_indefinite ? '#FF007F' : t.muted, background: form.repeat_indefinite ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Do odwołania
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Notatka */}
              <div>{lbl('NOTATKA')}<input {...inp('note')} placeholder="np. urlop..." /></div>

              <div className="flex gap-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleSave} disabled={saving} className="btn-oxblood flex-1" style={{ fontSize: '9px' }}>
                  {saving ? 'ZAPISUJĘ...' : 'ZAPISZ'}
                </button>
                {editScope === 'cycle' && (
                  <button onClick={handleDelete} disabled={saving} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid rgba(255,0,127,0.4)`, color: '#FF007F', background: 'transparent', cursor: 'pointer' }}>
                    USUŃ
                  </button>
                )}
                <button onClick={() => setStep(isRecurring ? 'confirm' : 'view')} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>
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

function Row({ label, value, color, t, icon }) {
  return (
    <div>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon}{label}
      </p>
      <p style={{ color: t.text, fontSize: '13px' }}>{value}</p>
    </div>
  );
}