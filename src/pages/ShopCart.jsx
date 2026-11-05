import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import { useCart } from '@/components/shop/CartProvider';
import { useAuth } from '@/lib/AuthContext';
import { money, cartShipping } from '@/lib/shop';

export default function ShopCart() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { items, setQty, remove, loading } = useCart();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' }).then(list => setSettings(list[0] || {})).catch(() => setSettings({}));
  }, []);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
  const freeFrom = Number(settings?.free_shipping_from) || 0;
  const baseShipping = cartShipping(items, settings || {});
  const shipping = subtotal === 0 ? 0 : (baseShipping > 0 && freeFrom > 0 && subtotal >= freeFrom ? 0 : baseShipping);
  const total = subtotal + shipping;

  if (isLoadingAuth) {
    return <PageLayout><div className="pt-40 pb-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div></PageLayout>;
  }

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6" style={{ minHeight: '70vh' }}>
          <div className="max-w-md mx-auto text-center p-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
            <ShoppingBag size={28} style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.03em', lineHeight: 1 }}>Koszyk</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', lineHeight: 1.7, margin: '12px 0 24px' }}>
              Aby korzystać z koszyka i składać zamówienia, zaloguj się na swoje konto klienta.
            </p>
            <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="btn-oxblood w-full" style={{ padding: '14px' }}>ZALOGUJ SIĘ</button>
            <Link to="/sklep" className="block mt-4 text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em' }}>WRÓĆ DO SKLEPU</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-micro" style={{ fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.22em', marginBottom: '10px' }}>SKLEP</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1, letterSpacing: '0.02em', marginBottom: '28px' }}>Koszyk</h1>

          {loading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
              <p className="text-micro" style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em', marginBottom: '18px' }}>TWÓJ KOSZYK JEST PUSTY</p>
              <Link to="/sklep" className="btn-ghost-parchment">PRZEJDŹ DO SKLEPU</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
              <div style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
                {items.map((item, i) => (
                  <div key={`${item.product_id}-${item.variant_key}`} className="flex gap-4 p-4" style={{ borderBottom: i < items.length - 1 ? '0.5px solid hsl(var(--border))' : 'none' }}>
                    <Link to={`/sklep/produkt/${item.slug}`} className="shrink-0 overflow-hidden" style={{ width: '76px', height: '94px', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.03)' }}>
                      {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/sklep/produkt/${item.slug}`} style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', letterSpacing: '0.03em', color: 'hsl(var(--foreground))', lineHeight: 1.1 }}>{item.product_name}</Link>
                      <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em', marginTop: '5px' }}>{item.variant_label}</p>
                      {(item.shipping_option || item.shipping_info) && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: '3px' }}>
                          {[item.shipping_option, item.shipping_info].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-4 mt-3">
                        <div className="inline-flex items-center" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
                          <button onClick={() => setQty(item.product_id, item.variant_key, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--foreground))', padding: '7px 10px' }}><Minus size={12} /></button>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', minWidth: '26px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => setQty(item.product_id, item.variant_key, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--foreground))', padding: '7px 10px' }}><Plus size={12} /></button>
                        </div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'hsl(var(--foreground))' }}>{money(item.unit_price * item.quantity)}</p>
                      </div>
                    </div>
                    <button onClick={() => remove(item.product_id, item.variant_key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', alignSelf: 'flex-start', padding: '4px' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-5" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '16px' }}>PODSUMOWANIE</p>
                <div className="space-y-2.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                  <div className="flex justify-between"><span>Produkty</span><span style={{ color: 'hsl(var(--foreground))' }}>{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Dostawa</span><span style={{ color: 'hsl(var(--foreground))' }}>{shipping === 0 ? 'Gratis' : money(shipping)}</span></div>
                  {freeFrom > 0 && subtotal < freeFrom && (
                    <p style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.06em' }}>Darmowa dostawa od {money(freeFrom)}</p>
                  )}
                </div>
                <div className="flex justify-between items-baseline mt-4 pt-4" style={{ borderTop: '0.5px solid hsl(var(--border))', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>RAZEM</span>
                  <span style={{ fontSize: '17px', color: 'hsl(var(--foreground))' }}>{money(total)}</span>
                </div>
                <Link to="/sklep/zamowienie" className="btn-oxblood w-full mt-5 flex items-center justify-center gap-2" style={{ padding: '14px' }}>
                  DO KASY <ArrowRight size={13} />
                </Link>
                <p className="text-micro" style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: '12px', lineHeight: 1.7 }}>
                  Płatność ustalimy po potwierdzeniu zamówienia. Kody zniżkowe i vouchery możesz wykorzystać w kolejnym kroku.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}