import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import VariantPicker from '@/components/shop/VariantPicker';
import { useCart } from '@/components/shop/CartProvider';
import { useAuth } from '@/lib/AuthContext';
import { money, variantsOf, priceRange, availability, productStock, productShipping } from '@/lib/shop';

export default function ShopProduct() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    base44.entities.ShopProduct.filter({ slug }).catch(() => [])
      .then(list => {
        const found = list[0] || null;
        setProduct(found);
        if (found) {
          setActiveImage(found.image_url || '');
          const list = variantsOf(found).filter(v => v.is_active !== false);
          setVariant(list.find(v => (Number(v.stock) || 0) > 0) || list[0] || null);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAdd = async () => {
    setError('');
    if (!isAuthenticated) { base44.auth.redirectToLogin(window.location.href); return; }
    if (variant && (Number(variant.stock) || 0) <= 0) { setError('Ten wariant jest wyprzedany — wybierz inny.'); return; }
    const ok = await add(product, variant, quantity);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  if (loading) {
    return <PageLayout><div className="pt-40 pb-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div></PageLayout>;
  }

  if (!product) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6 text-center">
          <p className="text-micro" style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em', marginBottom: '16px' }}>NIE ZNALEZIONO PRODUKTU</p>
          <Link to="/sklep" className="btn-ghost-parchment">WRÓĆ DO SKLEPU</Link>
        </div>
      </PageLayout>
    );
  }

  const variants = variantsOf(product).filter(v => v.is_active !== false);
  const avail = availability(product);
  const canBuy = avail.state === 'in_stock';
  const stock = variant ? Number(variant.stock) || 0 : (productStock(product) ?? 99);
  const ship = productShipping(product);
  const price = variant?.price || product.price;
  const range = priceRange(product);
  const images = [product.image_url, ...(product.images || [])].filter(Boolean);

  return (
    <PageLayout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <Link to="/sklep" className="inline-flex items-center gap-2 text-micro mb-8" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em' }}>
            <ChevronLeft size={12} /> SKLEP
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Zdjęcia */}
            <div>
              <div className="overflow-hidden" style={{ aspectRatio: '4 / 5', border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.03)' }}>
                {activeImage
                  ? <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}>BRAK ZDJĘCIA</span></div>}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-3">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(img)} className="overflow-hidden" style={{ width: '64px', height: '80px', border: `0.5px solid ${activeImage === img ? 'var(--brand)' : 'hsl(var(--border))'}`, borderRadius: 'var(--radius)' }}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informacje */}
            <div>
              {product.category_name && (
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', marginBottom: '10px' }}>{product.category_name.toUpperCase()}</p>
              )}
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 0.98, letterSpacing: '0.02em' }}>{product.name}</h1>

              <div className="flex items-baseline gap-3 mt-4 pb-6" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'hsl(var(--foreground))', letterSpacing: '0.03em' }}>
                  {variants.length > 1 && range.min !== range.max ? `od ${money(range.min)}` : money(price)}
                </p>
                {product.compare_at_price > 0 && product.compare_at_price > price && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }}>{money(product.compare_at_price)}</p>
                )}
              </div>

              {product.short_description && (
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px', lineHeight: 1.75, marginTop: '20px' }}>{product.short_description}</p>
              )}

              <div className="mt-8">
                {!canBuy ? (
                  <div
                    className="p-4"
                    style={{
                      border: `0.5px solid ${avail.state === 'soon' ? 'rgba(245,158,11,0.5)' : 'hsl(var(--border))'}`,
                      background: avail.state === 'soon' ? 'rgba(245,158,11,0.06)' : 'transparent',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <p className="text-micro" style={{ fontSize: '10px', color: avail.state === 'soon' ? '#f59e0b' : 'hsl(var(--muted-foreground))', letterSpacing: '0.14em' }}>
                      {avail.state === 'soon' ? 'WKRÓTCE DOSTĘPNE' : 'WYPRZEDANE'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '6px', lineHeight: 1.6 }}>
                      {avail.state === 'soon' ? 'Trwa uzupełnianie stanu — ten produkt wróci do sprzedaży.' : 'Ten produkt nie jest już dostępny.'}
                    </p>
                  </div>
                ) : (
                  <VariantPicker
                    product={{ ...product, variants }}
                    variant={variant}
                    onSelect={(v) => { setVariant(v); setQuantity(1); }}
                    quantity={quantity}
                    onQuantity={setQuantity}
                    stock={stock}
                  />
                )}
              </div>

              {canBuy && (
                <button onClick={handleAdd} className="btn-oxblood w-full mt-8 flex items-center justify-center gap-2" style={{ padding: '15px' }}>
                  {added ? <><Check size={14} /> DODANO DO KOSZYKA</> : <><ShoppingBag size={14} /> DODAJ DO KOSZYKA</>}
                </button>
              )}
              {error && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#f59e0b', letterSpacing: '0.06em', marginTop: '10px', textAlign: 'center' }}>{error}</p>
              )}
              {!isAuthenticated && canBuy && (
                <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em', marginTop: '10px', textAlign: 'center' }}>
                  DO KOSZYKA I ZAMÓWIENIA POTRZEBNE JEST KONTO KLIENTA
                </p>
              )}

              <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '8px' }}>DOSTAWA</p>
                {ship.info && <p style={{ color: 'hsl(var(--foreground))', fontSize: '13px', lineHeight: 1.6 }}>{ship.info}</p>}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: ship.info ? '4px' : 0 }}>
                  Koszt dostawy: {ship.cost > 0 ? money(ship.cost) : 'gratis'}
                </p>
              </div>

              {product.description && (
                <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                  <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '10px' }}>OPIS</p>
                  <p style={{ color: 'hsl(var(--foreground))', fontSize: '13px', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{product.description}</p>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/panel/orders" className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em', textDecoration: 'underline' }}>MOJE ZAMÓWIENIA</Link>
                <Link to="/sklep/koszyk" className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em', textDecoration: 'underline' }}>KOSZYK</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}