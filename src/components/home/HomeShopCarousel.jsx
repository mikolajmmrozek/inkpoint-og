import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useSiteContent from '@/hooks/useSiteContent';
import ShopProductCard from '@/components/shop/ShopProductCard';

export default function HomeShopCarousel() {
  const { content } = useSiteContent();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!content.show_shop) return;
    base44.entities.ShopProduct.filter({ is_active: true }, '-created_date', 60)
      .then(list => setProducts(list))
      .catch(() => setProducts([]));
  }, [content.show_shop]);

  if (!content.show_shop) return null;

  const featured = products.filter(p => p.is_featured);
  const list = (featured.length > 0 ? featured : products).slice(0, 10);
  if (list.length === 0) return null;

  return (
    <section className="pt-10 pb-16 overflow-hidden">
      <div className="px-8 md:px-16 mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
              SKLEP
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 0.95, letterSpacing: '0.04em' }}>
              Sprawdź nasze produkty polecane
            </h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px', lineHeight: 1.7, marginTop: '12px', maxWidth: '520px' }}>
              Rzeczy, które robimy i nosimy sami — odzież, dodatki i vouchery na sesje w studio.
            </p>
          </div>
          <Link to="/sklep" className="btn-ghost-parchment self-start md:self-auto inline-flex items-center gap-2">
            ZOBACZ CAŁY SKLEP <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="flex gap-4 px-8 md:px-16 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        {list.map(p => (
          <div key={p.id} className="flex-shrink-0" style={{ width: '250px' }}>
            <ShopProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}