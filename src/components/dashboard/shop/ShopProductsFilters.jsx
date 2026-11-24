import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const selectStyle = (t, theme) => ({
  background: 'transparent',
  border: `0.5px solid ${t.border}`,
  color: t.text,
  padding: '7px 9px',
  borderRadius: 'var(--radius)',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.06em',
  colorScheme: theme === 'light' ? 'light' : 'dark',
});

const buttonStyle = (t, active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 12px',
  background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
  border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
  color: active ? 'var(--brand)' : t.text,
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 'var(--radius)',
});

// Filtry listy produktów: szukanie + rozwijany panel filtrów (kategoria, status, dostępność).
export default function ShopProductsFilters({ search, onSearch, category, onCategory, status, onStatus, availability, onAvailability, categories, theme, t }) {
  const [open, setOpen] = useState(false);
  const activeCount = [category, status, availability].filter(Boolean).length;

  const clearAll = () => {
    onCategory('');
    onStatus('');
    onAvailability('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 flex-1">
      <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '7px 12px', borderRadius: 'var(--radius)', minWidth: '200px', flex: '1 1 200px' }}>
        <Search size={12} color={t.muted} />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Szukaj po nazwie, SKU lub kategorii..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '12px' }}
        />
      </div>

      <button onClick={() => setOpen(o => !o)} style={buttonStyle(t, open || activeCount > 0)} title="Pokaż filtry produktów">
        <SlidersHorizontal size={11} /> Filtry{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {activeCount > 0 && (
        <button onClick={clearAll} style={buttonStyle(t, false)} title="Wyczyść filtry">
          <X size={11} /> Wyczyść
        </button>
      )}

      {open && (
        <div className="w-full flex flex-wrap items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }}>
          <select value={category} onChange={e => onCategory(e.target.value)} style={selectStyle(t, theme)} title="Filtruj po kategorii">
            <option value="">Wszystkie kategorie</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <select value={status} onChange={e => onStatus(e.target.value)} style={selectStyle(t, theme)} title="Filtruj po statusie">
            <option value="">Wszystkie statusy</option>
            <option value="active">Aktywne</option>
            <option value="inactive">Wyłączone</option>
          </select>

          <select value={availability} onChange={e => onAvailability(e.target.value)} style={selectStyle(t, theme)} title="Filtruj po dostępności">
            <option value="">Każda dostępność</option>
            <option value="in_stock">Dostępne</option>
            <option value="soon">Wkrótce</option>
            <option value="sold_out">Wyprzedane</option>
          </select>
        </div>
      )}
    </div>
  );
}