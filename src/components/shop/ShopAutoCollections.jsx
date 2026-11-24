import { useState, useEffect, useRef } from 'react';
import { Sparkles, Flame, Star, ChevronDown, ChevronUp } from 'lucide-react';

const AUTO = [
  { key: 'new', label: 'Nowości', sub: 'Ostatnio dodane', Icon: Sparkles },
  { key: 'best', label: 'Bestsellery', sub: 'Najczęściej zamawiane', Icon: Flame },
  { key: 'featured', label: 'Polecane', sub: 'Wybór studia', Icon: Star },
];

const CARD_HEIGHT = 110;
const ROW_GAP = 12;

export default function ShopAutoCollections({ active, onSelect, collections = [], activeCollection = '', onSelectCollection }) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const wrapRef = useRef(null);
  const total = AUTO.length + collections.length;

  // Sprawdzamy, czy kafle mieszczą się w jednym rzędzie — jeśli nie, resztę
  // pokazujemy po rozwinięciu (bez poziomego paska przewijania).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const check = () => {
      const rows = Math.ceil(el.scrollHeight / (CARD_HEIGHT + ROW_GAP));
      setHasMore(rows > 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  const cardStyle = (isActive) => ({
    height: `${CARD_HEIGHT}px`,
    border: `0.5px solid ${isActive ? 'var(--brand)' : 'hsl(var(--border))'}`,
    background: isActive ? 'rgb(var(--brand-rgb) / 0.1)' : 'transparent',
    borderRadius: 'var(--radius)',
  });

  return (
    <div>
      <div
        ref={wrapRef}
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          maxHeight: expanded ? 'none' : `${CARD_HEIGHT}px`,
          overflow: 'hidden',
        }}
      >
        {AUTO.map(({ key, label, sub, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(isActive ? '' : key)}
              className="relative overflow-hidden transition-all duration-500 flex flex-col justify-between p-4 text-left"
              style={cardStyle(isActive)}
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
              className="relative overflow-hidden transition-all duration-500"
              style={cardStyle(isActive)}
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

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-micro inline-flex items-center gap-2 mt-3"
          style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? 'ZWIŃ' : `POKAŻ WSZYSTKIE (${total})`}
        </button>
      )}
    </div>
  );
}