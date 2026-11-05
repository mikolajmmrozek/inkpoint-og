import { Sparkles, Flame, Star } from 'lucide-react';

const AUTO = [
  { key: 'new', label: 'Nowości', sub: '5 najnowszych', Icon: Sparkles },
  { key: 'best', label: 'Bestsellery', sub: 'Najczęściej zamawiane', Icon: Flame },
  { key: 'featured', label: 'Polecane', sub: 'Wybór studia', Icon: Star },
];

export default function ShopAutoCollections({ active, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {AUTO.map(({ key, label, sub, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(isActive ? '' : key)}
            className="relative shrink-0 overflow-hidden transition-all duration-500 flex flex-col justify-between p-4 text-left"
            style={{
              width: '190px',
              height: '110px',
              border: `0.5px solid ${isActive ? 'var(--brand)' : 'hsl(var(--border))'}`,
              background: isActive ? 'rgb(var(--brand-rgb) / 0.1)' : 'transparent',
              borderRadius: 'var(--radius)',
            }}
          >
            <Icon size={16} style={{ color: 'var(--brand)' }} />
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '1.15rem', letterSpacing: '0.05em', lineHeight: 1.1, color: 'hsl(var(--foreground))' }}>{label}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>{sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}