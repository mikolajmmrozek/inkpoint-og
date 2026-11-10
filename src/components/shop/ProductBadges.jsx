import { hasDiscount, availability, isNewProduct, pricingModeOf } from '@/lib/shop';

const TONES = {
  sale: { color: '#16a34a', border: 'rgba(22,163,74,0.55)', background: 'rgba(22,163,74,0.14)' },
  soon: { color: '#f59e0b', border: 'rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.14)' },
  sold: { color: 'hsl(var(--muted-foreground))', border: 'hsl(var(--border))', background: 'hsl(var(--background))' },
  new: { color: 'var(--btn-text)', border: 'var(--brand)', background: 'var(--brand)' },
};

// Znaczki na zdjęciu produktu — może ich być kilka naraz
// (np. promocja + wkrótce dostępne albo promocja + wyprzedane).
export default function ProductBadges({ product, newDays = 30, detailed = false, className = '' }) {
  if (!product) return null;

  const badges = [];
  if (hasDiscount(product)) badges.push({ key: 'sale', label: 'PROMOCJA' });
  if (isNewProduct(product, newDays)) badges.push({ key: 'new', label: 'NOWOŚĆ' });
  // Vouchery (suwak kwoty) nie mają stanu magazynowego — bez znaczków dostępności.
  if (pricingModeOf(product) !== 'slider') {
    const state = availability(product).state;
    if (state === 'soon') badges.push({ key: 'soon', label: 'WKRÓTCE DOSTĘPNE' });
    if (state === 'sold_out') badges.push({ key: 'sold', label: 'WYPRZEDANE' });
  }

  if (badges.length === 0) return null;

  return (
    <div className={`absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10 ${className}`}>
      {badges.map(b => {
        const tone = TONES[b.key];
        return (
          <span
            key={b.key}
            className="text-micro"
            style={{
              background: tone.background,
              border: `0.5px solid ${tone.border}`,
              color: tone.color,
              padding: detailed ? '5px 10px' : '4px 8px',
              fontSize: detailed ? '10px' : '9px',
              letterSpacing: '0.15em',
              borderRadius: 'var(--radius)',
              backdropFilter: b.key === 'new' ? 'none' : 'blur(4px)',
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </span>
        );
      })}
    </div>
  );
}