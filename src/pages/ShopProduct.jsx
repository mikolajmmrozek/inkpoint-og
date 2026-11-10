import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import ShopUnavailable from '@/components/shop/ShopUnavailable';
import useSiteContent from '@/hooks/useSiteContent';
import VariantPicker from '@/components/shop/VariantPicker';
import PriceSliderPicker from '@/components/shop/PriceSliderPicker';
import MultipackPicker from '@/components/shop/MultipackPicker';
import ProductShippingList from '@/components/shop/ProductShippingList';
import ProductBadges from '@/components/shop/ProductBadges';
import useShopSettings from '@/hooks/useShopSettings';
import { useCart } from '@/components/shop/CartProvider';
import { useAuth } from '@/lib/AuthContext';
import { money, variantsOf, availability, productStock, shippingOptionsOf, pricingModeOf, priceSliderOf, multipacksOf, packPrice, packLabel, unitPrice, hasDiscount, displayPrice } from '@/lib/shop';

export default function ShopProduct() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add } = useCart();
  const { content, loading: shopLoading } = useSiteContent();
  const shopVisible = content.show_shop;
  const shopSettings = useShopSettings();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState(null);
  const [pack, setPack] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [amount, setAmount] = useState(100);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.ShopProduct.filter({ slug }).catch(() => []),
      base44.entities.ShippingForm.filter({ is_active: true }, 'order', 100).catch(() => []),
    ])
      .then(([list, formList]) => {
        const found = list[0] || null;
        setForms(formList);
        setProduct(found);
        if (found) {
          setActiveImage(found.image_url || '');
          const vList = variantsOf(found).filter(v => v.is_active !== false);
          setVariant(vList.find(v => (Number(v.stock) || 0) > 0) || vList[0] || null);
          setPack(null);
          setAmount(priceSliderOf(found).min);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAdd = async () => {
    setError('');
    if (!isAuthenticated) { base44.auth.redirectToLogin(window.location.href); return; }
    if (pricingModeOf(product) === 'slider') {
      const chosen = {
        key: `kwota:${amount}`,
        options: [{ name: 'Kwota', value: `${amount} zł` }],
        price: amount,
        stock: 99,
      };
      const voucherOk = await add(product, chosen, quantity);
      if (voucherOk) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2200);
      }
      return;
    }
    const units = pack ? Number(pack.units) || 1 : 1;
    const availableUnits = variant ? (Number(variant.stock) || 0) : (productStock(product) ?? 99);
    const needed = units * quantity;
    if (availableUnits <= 0) { setError('Ten wariant jest wyprzedany — wybierz inny.'); return; }
    if (needed > availableUnits) { setError(`Brak wystarczającej ilości — dostępne ${availableUnits} szt.`); return; }
    const ok = await add(product, variant, quantity, pack);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  if (!shopLoading && !shopVisible) return <ShopUnavailable />;

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

  const isSlider = pricingModeOf(product) === 'slider';
  const slider = priceSliderOf(product);
  const variants = variantsOf(product).filter(v => v.is_active !== false);
  const avail = availability(product);
  const canBuy = isSlider || avail.state === 'in_stock';
  const stock = isSlider ? 99 : (variant ? Number(variant.stock) || 0 : (productStock(product) ?? 99));
  const shipOptions = shippingOptionsOf(product, forms);
  const netPrice = unitPrice(product, variant);
  // Cena na górze zawsze od najtańszego wariantu (i jego cena przed zniżką) —
  // nie zmienia się przy przełączaniu wariantów.
  const headline = displayPrice(product);
  const packs = multipacksOf(product, variant);
  const unitsPerPack = pack ? Number(pack.units) || 1 : 1;
  const linePrice = isSlider ? Number(amount) || 0 : (pack ? packPrice(netPrice, pack) : netPrice);
  const total = linePrice * (Number(quantity) || 1);
  const maxPacks = Math.max(1, Math.floor(stock / unitsPerPack));
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
              <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5', border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.03)' }}>
                {activeImage
                  ? <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}>BRAK ZDJĘCIA</span></div>}
                <ProductBadges product={product} newDays={shopSettings.new_badge_days ?? 30} detailed />
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
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: !isSlider && hasDiscount(product) ? '#16a34a' : 'hsl(var(--foreground))', letterSpacing: '0.03em' }}>
                  {isSlider ? money(amount) : variants.length > 0 ? `od ${money(headline.min)}` : money(netPrice)}
                </p>
                {!isSlider && hasDiscount(product) && headline.was > headline.min && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }}>{money(headline.was)}</p>
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
                ) : isSlider ? (
                  <PriceSliderPicker amount={amount} onChange={setAmount} {...slider} />
                ) : (
                  <VariantPicker
                    product={{ ...product, variants }}
                    variant={variant}
                    onSelect={(v) => { setVariant(v); setPack(null); setQuantity(1); }}
                    quantity={quantity}
                    onQuantity={setQuantity}
                    stock={pack ? maxPacks : stock}
                  />
                )}
              </div>

              {canBuy && !isSlider && packs.length > 0 && (
                <MultipackPicker
                  packs={packs}
                  basePrice={netPrice}
                  pack={pack}
                  onSelect={(p) => { setPack(p); setQuantity(1); }}
                  availableUnits={stock}
                />
              )}

              {canBuy && (
                <>
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.16em' }}>RAZEM</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em', marginTop: '5px' }}>
                        {isSlider
                          ? 'wybrana kwota vouchera'
                          : pack
                            ? `${packLabel(pack)} · ${quantity} × ${money(linePrice)}`
                            : `${quantity} szt. × ${money(linePrice)}`}
                      </p>
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', lineHeight: 1, color: 'hsl(var(--foreground))', letterSpacing: '0.02em' }}>{money(total)}</p>
                  </div>
                  <button onClick={handleAdd} className="btn-oxblood w-full mt-4 flex items-center justify-center gap-2" style={{ padding: '15px' }}>
                    {added ? <><Check size={14} /> DODANO DO KOSZYKA</> : <><ShoppingBag size={14} /> DODAJ DO KOSZYKA</>}
                  </button>
                </>
              )}
              {error && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#f59e0b', letterSpacing: '0.06em', marginTop: '10px', textAlign: 'center' }}>{error}</p>
              )}
              {!isAuthenticated && canBuy && (
                <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em', marginTop: '10px', textAlign: 'center' }}>
                  DO KOSZYKA I ZAMÓWIENIA POTRZEBNE JEST KONTO KLIENTA
                </p>
              )}

              <ProductShippingList options={shipOptions} legacyCost={Number(product.shipping_cost) || 0} />

              {shopSettings.product_note && (
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '11px', lineHeight: 1.8, marginTop: '14px' }}>
                  {shopSettings.product_note}
                </p>
              )}

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