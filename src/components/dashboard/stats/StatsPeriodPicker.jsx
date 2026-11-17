import { MONTHS_FULL } from '@/lib/statsDates';

// Wybór miesiąca do statystyk dziennych ('' = cały rok).
export default function StatsPeriodPicker({ t, value, onChange }) {
  const mono = { fontFamily: 'var(--font-mono)' };

  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Miesiąc</span>
      <select
        value={value === null || value === undefined ? '' : value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, color: t.text, ...mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 12px', cursor: 'pointer', outline: 'none', borderRadius: 'var(--radius)' }}
      >
        <option value="">Cały rok</option>
        {MONTHS_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
    </div>
  );
}