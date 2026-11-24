import { Power, PowerOff, Trash2, X, Loader2 } from 'lucide-react';
import { mono } from './shopTheme';

const actionBtn = (t, tone) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '6px 11px',
  background: 'transparent',
  border: `0.5px solid ${tone === 'danger' ? 'var(--brand)' : t.border}`,
  color: tone === 'danger' ? 'var(--brand)' : t.text,
  fontFamily: 'var(--font-mono)',
  fontSize: '8px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 'var(--radius)',
});

// Pasek zaznaczania i akcji zbiorczych na liście produktów.
export default function ShopProductsBulkBar({ count, total, allSelected, onToggleAll, onEnable, onDisable, onDelete, onClear, busy, t }) {
  const active = count > 0;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2"
      style={{
        border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
        background: active ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
        borderRadius: 'var(--radius)',
      }}
    >
      <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          style={{ accentColor: 'var(--brand)', width: '13px', height: '13px', cursor: 'pointer' }}
        />
        <span style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? 'var(--brand)' : t.muted }}>
          {active ? `Zaznaczono ${count} z ${total}` : 'Zaznacz wszystkie'}
        </span>
      </label>

      {active && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onEnable} disabled={busy} style={actionBtn(t)} title="Włącz zaznaczone produkty">
            <Power size={10} /> Włącz
          </button>
          <button onClick={onDisable} disabled={busy} style={actionBtn(t)} title="Wyłącz zaznaczone produkty">
            <PowerOff size={10} /> Wyłącz
          </button>
          <button onClick={onDelete} disabled={busy} style={actionBtn(t, 'danger')} title="Usuń zaznaczone produkty">
            {busy ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Usuń
          </button>
          <button onClick={onClear} disabled={busy} style={actionBtn(t)} title="Odznacz wszystko">
            <X size={10} /> Odznacz
          </button>
        </div>
      )}
    </div>
  );
}