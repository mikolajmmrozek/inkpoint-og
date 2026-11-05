import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, Tag, Gift, ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import AddressFields from '@/components/shop/AddressFields';
import { useCart } from '@/components/shop/CartProvider';
import { useAuth } from '@/lib/AuthContext';
import { money, cartShipping } from '@/lib/shop';

const t = { border: 'hsl(var(--border))', text: 'hsl(var(--foreground))', muted: 'hsl(var(--muted-foreground))' };

const label = (txt) => (
  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
);

export default function ShopCheckout() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const { items, clear, loading } = useCart();

  const [settings, setSettings] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [promos, setPromos] = useState([]);
  const [shipping, setShipping] = useState({ country: 'Polska', first_name: '', last_name: '', phone: '' });
  const [billing, setBilling] = useState({ country: 'Polska' });
  const [sameBilling, setSameBilling] = useState(true);
  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoice, setInvoice] = useState({ country: 'Polska' });
  const [note, setNote] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.ShopSettings.filter({ key: 'default' }).then(l => setSettings(l[0] || {})).catch(() => {});
    base44.entities.ShopAddress.filter({ user_email: user.email }, '-created_date', 50).then(setAddresses).catch(() => {});
    base44.entities.Promotion.filter({}, '-created_date', 200).then(setPromos).catch(() => {});
    const [first, ...rest] = (user.full_name || '').split(' ');
    setShipping(s => ({ ...s, first_name: s.first_name || first || '', last_name: s.last_name || rest.join(' ') || '' }));
  }, [user?.email]);

  useEffect(() => {
    if (sameBilling) setBilling({ ...shipping });
  }, [shipping, sameBilling]);

  const now = Date.now();
  const validDiscounts = promos.filter(p => p.type === 'discount'
    && p.is_active !== false && !p.revoked
    && (!p.expires_at || new Date(p.expires_at).getTime() > now)
    && !(p.usage_mode === 'single' && p.used_at));
  const validVouchers = promos.filter(p => p.type === 'voucher'
    && p.is_active !== false && !p.revoked
    && (Number(p.balance ?? p.value) || 0) > 0
    && ((!p.expires_at || new Date(p.expires_at).getTime() > now) || (p.is_grace && p.grace_expires_at && new Date(p.grace_expires_at).getTime() > now)));

  const appliedDiscount = validDiscounts.find(p => p.code === discountCode) || null;
  const appliedVoucher = validVouchers.find(p => p.code === voucherCode) || null;

  const subtotal = items.reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
  const discountAmount = appliedDiscount
    ? (appliedDiscount.value_type === 'percent'
      ? Math.round(subtotal * (Number(appliedDiscount.value) || 0)) / 100
      : Math.min(Number(appliedDiscount.value) || 0, subtotal))
    : 0;
  const voucherAmount = appliedVoucher
    ? Math.min(Number(appliedVoucher.balance ?? appliedVoucher.value) || 0, Math.max(0, subtotal - discountAmount))
    : 0;
  const payable = Math.max(0, subtotal - discountAmount - voucherAmount);
  const freeFrom = Number(settings.free_shipping_from) || 0;
  const baseShipping = cartShipping(items, settings);
  const shippingCost = baseShipping > 0 && freeFrom > 0 && payable >= freeFrom ? 0 : baseShipping;
  const total = payable + shippingCost;
  const shippingNotes = [...new Set(items.map(i => [i.shipping_option, i.shipping_info].filter(Boolean).join(' · ')).filter(Boolean))];

  const handleSubmit = async () => {
    setError('');
    if (!shipping.first_name || !shipping.street || !shipping.postal_code || !shipping.city) {
      setError('Uzupełnij adres dostawy: imię, ulica, kod pocztowy i miasto.');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageShopOrder', {
        action: 'create',
        items: items.map(i => ({ product_id: i.product_id, variant_key: i.variant_key, quantity: i.quantity, shipping_option: i.shipping_option || '' })),
        shipping_address: { ...shipping, email: user.email },
        billing_address: sameBilling ? { ...shipping, email: user.email } : { ...billing, email: user.email },
        invoice_details: wantInvoice ? invoice : {},
        discount_code: discountCode,
        voucher_code: voucherCode,
        customer_note: note,
        client_name: `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() || user.full_name,
      });
      const order = res.data?.order;
      if (!order) throw new Error(res.data?.error || 'Nie udało się złożyć zamówienia.');

      if (saveAddress) {
        const existing = addresses.filter(a => a.type === 'shipping');
        if (!existing.some(a => a.street === shipping.street && a.postal_code === shipping.postal_code)) {
          await base44.entities.ShopAddress.create({ ...shipping, user_email: user.email, type: 'shipping', is_default: existing.length === 0 }).catch(() => {});
        }
      }
      setPlaced(order);
      await clear();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Nie udało się złożyć zamówienia.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingAuth) {
    return <PageLayout><div className="pt-40 pb-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div></PageLayout>;
  }

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6" style={{ minHeight: '70vh' }}>
          <div className="max-w-md mx-auto text-center p-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.03em' }}>Zamówienie</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', lineHeight: 1.7, margin: '12px 0 22px' }}>Zaloguj się, aby dokończyć zamówienie.</p>
            <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="btn-oxblood w-full" style={{ padding: '14px' }}>ZALOGUJ SIĘ</button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (placed) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6" style={{ minHeight: '70vh' }}>
          <div className="max-w-lg mx-auto text-center p-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
            <div className="flex justify-center mb-5"><Check size={30} style={{ color: '#16a34a' }} /></div>
            <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', marginBottom: '10px' }}>ZAMÓWIENIE PRZYJĘTE</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '0.03em', lineHeight: 1 }}>{placed.order_number}</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', lineHeight: 1.75, margin: '14px 0 8px' }}>
              Dziękujemy. Skontaktujemy się w sprawie potwierdzenia i płatności.
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'hsl(var(--foreground))', marginBottom: '26px' }}>{money(placed.total)}</p>
            <div className="flex flex-col gap-3">
              <Link to="/panel/orders" className="btn-oxblood" style={{ padding: '13px' }}>MOJE ZAMÓWIENIA</Link>
              <Link to="/sklep" className="btn-ghost-parchment" style={{ padding: '12px' }}>WRÓĆ DO SKLEPU</Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return <PageLayout><div className="pt-40 pb-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div></PageLayout>;
  }

  if (items.length === 0) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6 text-center" style={{ minHeight: '60vh' }}>
          <p className="text-micro" style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em', marginBottom: '18px' }}>KOSZYK JEST PUSTY</p>
          <Link to="/sklep" className="btn-ghost-parchment">PRZEJDŹ DO SKLEPU</Link>
        </div>
      </PageLayout>
    );
  }

  const shippingAddresses = addresses.filter(a => a.type === 'shipping');

  return (
    <PageLayout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-16">
        <div className="max-w-5xl mx-auto">
          <Link to="/sklep/koszyk" className="inline-flex items-center gap-2 text-micro mb-6" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em' }}>
            <ChevronLeft size={12} /> KOSZYK
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1, letterSpacing: '0.02em', marginBottom: '28px' }}>Zamówienie</h1>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
            <div className="space-y-10">
              {/* Dostawa */}
              <div>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '14px' }}>ADRES DOSTAWY</p>
                {shippingAddresses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {shippingAddresses.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setShipping({ ...a, country: a.country || 'Polska' })}
                        className="text-micro text-left"
                        style={{ fontSize: '9px', letterSpacing: '0.08em', padding: '7px 12px', border: '0.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', background: 'transparent', borderRadius: 'var(--radius)' }}
                      >
                        {a.label || `${a.first_name} ${a.last_name}`} · {a.city}
                      </button>
                    ))}
                  </div>
                )}
                <AddressFields value={shipping} onChange={setShipping} t={t} fields="shipping" />
              </div>

              {/* Rozliczenie */}
              <div className="pt-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '14px' }}>ADRES ROZLICZENIOWY</p>
                <button onClick={() => setSameBilling(!sameBilling)} className="flex items-center gap-2 mb-5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: sameBilling ? '#16a34a' : 'hsl(var(--muted-foreground))' }}>
                  <span style={{ width: '12px', height: '12px', border: `0.5px solid ${sameBilling ? '#16a34a' : 'hsl(var(--border))'}`, background: sameBilling ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sameBilling && <Check size={9} color="#fff" />}</span>
                  Taki sam jak adres dostawy
                </button>
                {!sameBilling && <AddressFields value={billing} onChange={setBilling} t={t} fields="billing" />}
              </div>

              {/* Faktura */}
              <div className="pt-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '14px' }}>DANE DO FAKTURY</p>
                <button onClick={() => setWantInvoice(!wantInvoice)} className="flex items-center gap-2 mb-5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: wantInvoice ? '#16a34a' : 'hsl(var(--muted-foreground))' }}>
                  <span style={{ width: '12px', height: '12px', border: `0.5px solid ${wantInvoice ? '#16a34a' : 'hsl(var(--border))'}`, background: wantInvoice ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{wantInvoice && <Check size={9} color="#fff" />}</span>
                  Chcę fakturę na firmę
                </button>
                {wantInvoice && <AddressFields value={invoice} onChange={setInvoice} t={t} fields="invoice" showCompany />}
              </div>

              {/* Promocje */}
              <div className="pt-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '14px' }}>KOD ZNIŻKOWY I VOUCHER</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    {label('Kod zniżkowy')}
                    <input
                      value={discountCode}
                      onChange={e => setDiscountCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="np. SUMMER25"
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', padding: '10px 0', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}
                    />
                  </div>
                  <div>
                    {label('Voucher')}
                    <input
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="np. GIFT100"
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', padding: '10px 0', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}
                    />
                  </div>
                </div>

                {validDiscounts.length > 0 && (
                  <div className="mt-5">
                    <p className="text-micro" style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em', marginBottom: '8px' }}>TWOJE KODY</p>
                    <div className="flex flex-wrap gap-2">
                      {validDiscounts.map(p => (
                        <button key={p.id} onClick={() => setDiscountCode(discountCode === p.code ? '' : p.code)}
                          className="flex items-center gap-1.5 text-micro"
                          style={{ fontSize: '9px', letterSpacing: '0.08em', padding: '6px 10px', border: `0.5px solid ${discountCode === p.code ? 'var(--brand)' : 'hsl(var(--border))'}`, color: discountCode === p.code ? 'var(--brand)' : 'hsl(var(--foreground))', background: discountCode === p.code ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent', borderRadius: 'var(--radius)' }}>
                          <Tag size={10} /> {p.code} · {p.value_type === 'percent' ? `${p.value}%` : money(p.value)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {validVouchers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-micro" style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em', marginBottom: '8px' }}>TWOJE VOUCHERY</p>
                    <div className="flex flex-wrap gap-2">
                      {validVouchers.map(p => (
                        <button key={p.id} onClick={() => setVoucherCode(voucherCode === p.code ? '' : p.code)}
                          className="flex items-center gap-1.5 text-micro"
                          style={{ fontSize: '9px', letterSpacing: '0.08em', padding: '6px 10px', border: `0.5px solid ${voucherCode === p.code ? 'var(--brand)' : 'hsl(var(--border))'}`, color: voucherCode === p.code ? 'var(--brand)' : 'hsl(var(--foreground))', background: voucherCode === p.code ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent', borderRadius: 'var(--radius)' }}>
                          <Gift size={10} /> {p.code} · {money(p.balance ?? p.value)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Uwagi */}
              <div className="pt-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
                {label('Uwagi do zamówienia')}
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', padding: '10px 0', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)' }} />
                <button onClick={() => setSaveAddress(!saveAddress)} className="flex items-center gap-2 mt-5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: saveAddress ? '#16a34a' : 'hsl(var(--muted-foreground))' }}>
                  <span style={{ width: '12px', height: '12px', border: `0.5px solid ${saveAddress ? '#16a34a' : 'hsl(var(--border))'}`, background: saveAddress ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{saveAddress && <Check size={9} color="#fff" />}</span>
                  Zapisz ten adres na przyszłość
                </button>
              </div>
            </div>

            {/* Podsumowanie */}
            <div className="p-5 lg:sticky lg:top-28" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
              <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '16px' }}>PODSUMOWANIE</p>
              <div className="space-y-3 mb-4">
                {items.map(i => (
                  <div key={`${i.product_id}-${i.variant_key}`} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p style={{ fontSize: '12px', color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.product_name}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em' }}>{i.variant_label} · {i.quantity} szt.</p>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>{money(i.unit_price * i.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5 pt-4" style={{ borderTop: '0.5px solid hsl(var(--border))', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                <div className="flex justify-between"><span>Produkty</span><span style={{ color: 'hsl(var(--foreground))' }}>{money(subtotal)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between"><span>Zniżka {discountCode}</span><span style={{ color: '#16a34a' }}>−{money(discountAmount)}</span></div>}
                {voucherAmount > 0 && <div className="flex justify-between"><span>Voucher {voucherCode}</span><span style={{ color: '#16a34a' }}>−{money(voucherAmount)}</span></div>}
                <div className="flex justify-between"><span>Dostawa</span><span style={{ color: 'hsl(var(--foreground))' }}>{shippingCost === 0 ? 'Gratis' : money(shippingCost)}</span></div>
                {shippingNotes.length > 0 && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, paddingTop: '4px' }}>
                    {shippingNotes.join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex justify-between items-baseline mt-4 pt-4" style={{ borderTop: '0.5px solid hsl(var(--border))', fontFamily: 'var(--font-mono)' }}>
                <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>RAZEM</span>
                <span style={{ fontSize: '18px', color: 'hsl(var(--foreground))' }}>{money(total)}</span>
              </div>

              {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#ef4444', letterSpacing: '0.04em', marginTop: '12px', lineHeight: 1.6 }}>⚠ {error}</p>}

              <button onClick={handleSubmit} disabled={saving} className="btn-oxblood w-full mt-5 flex items-center justify-center gap-2" style={{ padding: '14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'SKŁADANIE...' : 'ZŁÓŻ ZAMÓWIENIE'}
              </button>
              <p className="text-micro" style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: '12px', lineHeight: 1.7 }}>
                Składając zamówienie akceptujesz regulamin sklepu. Płatność ustalimy indywidualnie po potwierdzeniu zamówienia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}