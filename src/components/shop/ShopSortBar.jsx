import { ArrowUpDown } from 'lucide-react';

export const SORT_OPTIONS = [
  { id: '', label: 'Domyślnie' },
  { id: 'popular', label: 'Popularność' },
  { id: 'newest', label: 'Nowości' },
  { id: 'price_asc', label: 'Cena: od najniższej' },
  { id: 'price_desc', label: 'Cena: od najwyższej' },
  { id: 'name_asc', label: 'Nazwa: A–Z' },
  { id: 'name_desc', label: 'Nazwa: Z–A' },
];

export const sortProducts = (list, sort, soldMap = {}) => {
  const arr = [...list];
  switch (sort) {
    case 'popular':
      return arr.sort((a, b) => (soldMap[b.id] || 0) - (soldMap[a.id] || 0));
    case 'newest':
      return arr.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    case 'price_asc':
      return arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    case 'price_desc':
      return arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    case 'name_asc':
      return arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));
    case 'name_desc':
      return arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pl'));
    default:
      return arr;
  }
};

export default function ShopSortBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <ArrowUpDown size={11} style={{ color: 'hsl(var(--muted-foreground))' }} />
      <span className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em' }}>SORTUJ</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-micro"
        style={{
          fontSize: '10px',
          letterSpacing: '0.1em',
          padding: '9px 12px',
          border: '0.5px solid hsl(var(--border))',
          background: 'transparent',
          color: 'hsl(var(--foreground))',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}