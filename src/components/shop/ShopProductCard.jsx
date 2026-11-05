import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const money = (n) => `${Number(n || 0).toLocaleString('pl-PL')} PLN`;

export default function ShopProductCard({ product }) {
  const soldOut = product.sold_out;
  return (
    <Link
      to={`/sklep/produkt/${product.slug}`}
      className="group block overflow-hidden transition-all duration-500"
      style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)', background: 'hsl(var(--card))' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--brand-rgb) / 0.55)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5', background: 'rgba(255,255,255,0.03)' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ filter: soldOut ? 'grayscale(1) brightness(0.6)' : 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.2em' }}>BRAK ZDJĘCIA</span>
          </div>
        )}
        {soldOut && (
          <span className="absolute top-3 left-3 text-micro" style={{ background: 'hsl(var(--background))', border: '0.5px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', padding: '4px 8px', fontSize: '9px', letterSpacing: '0.15em', borderRadius: 'var(--radius)' }}>
            WYPRZEDANE
          </span>
        )}
        {product.is_new && !soldOut && (
          <span className="absolute top-3 left-3 text-micro" style={{ background: 'var(--brand)', color: 'var(--btn-text)', padding: '4px 8px', fontSize: '9px', letterSpacing: '0.15em', borderRadius: 'var(--radius)' }}>
            NOWOŚĆ
          </span>
        )}
      </div>
      <div className="p-4">
        {product.category_name && (
          <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.16em', marginBottom: '6px' }}>{product.category_name}</p>
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.03em', color: 'hsl(var(--foreground))', lineHeight: 1.1 }}>{product.name}</h3>
          <ArrowUpRight size={14} className="shrink-0 mt-1 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: 'var(--brand)' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'hsl(var(--foreground))', marginTop: '8px', letterSpacing: '0.04em' }}>
          {money(product.price)}
        </p>
      </div>
    </Link>
  );
}