import { Sparkles, Flame, Star } from 'lucide-react';

const AUTO = [
  { key: 'new', label: 'Nowości', sub: 'Ostatnio dodane', Icon: Sparkles },
  { key: 'best', label: 'Bestsellery', sub: 'Najczęściej zamawiane', Icon: Flame },
  { key: 'featured', label: 'Polecane', sub: 'Wybór studia', Icon: Star },
];

export default function ShopAutoCollections({ active, onSelect, collections = [], activeCollection = '', onSelectCollection }) {
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

      {collections.map(c => {
        const isActive = activeCollection === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelectCollection(isActive ? '' : c.id)}
            className="relative shrink-0 overflow-hidden transition-all duration-500"
            style={{
              width: '190px',
              height: '110px',
              border: `0.5px solid ${isActive ? 'var(--brand)' : 'hsl(var(--border))'}`,
              borderRadius: 'var(--radius)',
            }}
          >
            {c.image_url && <img src={c.image_url} alt="" className="absolute inset-0 w-full h-full object-cover media-darken-soft" />}
            <span className="absolute inset-0" style={{ background: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.45)' }} />
            <span className="absolute bottom-3 left-3 right-3 text-left">
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.05em', color: '#F5F0EB', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.75)', lineHeight: 1.45, marginTop: '4px', minHeight: '2.9em' }}>{c.description || ''}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}