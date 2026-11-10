import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Check, Loader2, RotateCcw, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VoucherPicker from '@/components/dashboard/VoucherPicker';
import SettlementProducts from './SettlementProducts';
import SettlementExtraServices from './SettlementExtraServices';
import { money } from '@/lib/shop';
import { r2, afterDiscount, discountOf, commissionFor } from '@/lib/settlement';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'voucher', label: 'Voucher' },
];

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const chipStyle = (active, t) => ({
  border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
  color: active ? 'var(--brand)' : t.muted,
  background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
  fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
  padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)',
});

export default function SettlementModal({ booking, user, onClose, onSettled, t, theme = 'dark' }) {
  const isEditing = booking?.is_settled === true;
  const storedProducts = Array.isArray(booking?.sold_products) ? booking.sold_products : [];
  const storedExtras = Array.isArray(booking?.additional_services) ? booking.additional_services : [];
  const storedProductsTotal = storedProducts.reduce((s, p) => s + r2(p.price) * (Number(p.qty) || 0), 0);
  const storedExtrasTotal = storedExtras.reduce((s, p) => s + r2(p.price), 0);

  // Cena wyjściowa sesji = kwota usługi bez produktów i usług dodatkowych.
  const [serviceBase, setServiceBase] = useState(
    isEditing && booking?.final_amount != null
      ? r2(Number(booking.final_amount) - storedProductsTotal - storedExtrasTotal)
      : (booking?.estimated_price || '')
  );
  const [sessionDiscount, setSessionDiscount] = useState({ type: 'none', value: 0 });
  const [showSessionDiscount, setShowSessionDiscount] = useState(false);
  const [depositAmount, setDepositAmount] = useState(booking?.deposit_amount || 0);
  const [payments, setPayments] = useState(
    booking?.payment_breakdown?.length
      ? booking.payment_breakdown.map(p => ({ method: p.method, amount: String(p.amount) }))
      : [{ method: 'cash', amount: '' }]
  );
  const [products, setProducts] = useState(storedProducts);
  const [extraServices, setExtraServices] = useState(storedExtras);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [voucherFor, setVoucherFor] = useState({});

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => setSettings(list[0] || {}))
      .catch(() => setSettings({}));
    base44.entities.ShopCategory.list('order', 100)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const categoryById = new Map(categories.map(c => [c.id, c]));

  const baseNum = Number(serviceBase) || 0;
  const sessionDiscountValue = discountOf(baseNum, sessionDiscount.type, sessionDiscount.value);
  const serviceFinal = afterDiscount(baseNum, sessionDiscount.type, sessionDiscount.value);

  const productsTotal = r2(products.reduce((s, p) => s + r2(p.price) * (Number(p.qty) || 0), 0));
  const productsBase = r2(products.reduce((s, p) => s + r2(p.unit_price != null ? p.unit_price : p.price) * (Number(p.qty) || 0), 0));
  const extrasTotal = r2(extraServices.reduce((s, p) => s + r2(p.price), 0));
  const extrasBase = r2(extraServices.reduce((s, p) => s + r2(p.base_price != null ? p.base_price : p.price), 0));

  const productsDiscount = Math.max(0, r2(productsBase - productsTotal));
  const extrasDiscount = Math.max(0, r2(extrasBase - extrasTotal));
  const discountsTotal = r2(sessionDiscountValue + productsDiscount + extrasDiscount);

  const total = r2(serviceFinal + extrasTotal + productsTotal);
  const depositNum = Number(depositAmount) || 0;
  const remainder = Math.max(0, r2(total - depositNum));
  const paymentsSum = r2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const isValid = total >= 0 && paymentsSum === remainder && (remainder === 0 || payments.every(p => p.method && (Number(p.amount) || 0) > 0));
  const diff = r2(paymentsSum - remainder);

  const commissionPreview = commissionFor(
    products.map(p => ({ ...p, qty: Number(p.qty) || 0 })),
    settings || {},
    categoryById
  );

  const addPayment = () => {
    if (payments.length >= 3) return;
    const used = payments.map(p => p.method);
    const next = PAYMENT_METHODS.find(m => !used.includes(m.value))?.value || 'cash';
    setPayments([...payments, { method: next, amount: '' }]);
  };
  const removePayment = (i) => {
    setPayments(payments.filter((_, idx) => idx !== i));
    setVoucherFor(v => { const n = { ...v }; delete n[i]; return n; });
  };
  const setPayment = (i, field, val) => setPayments(payments.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const handleSettle = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const breakdown = payments
        .map((p, i) => ({ method: p.method, amount: r2(p.amount), voucher_id: p.method === 'voucher' ? (voucherFor[i]?.id || '') : '' }))
        .filter(p => p.amount > 0);

      const res = await base44.functions.invoke('settleBookingSession', {
        booking_id: booking.id,
        final_amount: total,
        deposit_amount: r2(depositNum),
        payment_breakdown: breakdown,
        sold_products: products.map(p => ({
          product_id: p.product_id,
          variant_key: p.variant_key || '',
          variant_label: p.variant_label || '',
          qty: Number(p.qty) || 0,
          price: r2(p.price),
        })),
        additional_services: extraServices.map(s => ({ ...s, price: r2(s.price) })),
      });

      if (res.data?.error) {
        alert(res.data.error);
        return;
      }

      const voucherPayments = breakdown.filter((p) => p.method === 'voucher' && p.voucher_id && p.amount > 0);
      for (const vp of voucherPayments) {
        try {
          await base44.functions.invoke('managePromotion', {
            action: 'redeem',
            promotion_id: vp.voucher_id,
            amount: vp.amount,
            booking_id: booking.id,
            client_email: booking.client_email || '',
          });
        } catch (e) { console.warn('Voucher redeem failed', e); }
      }

      onSettled(res.data.booking);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSettlement = async () => {
    if (!window.confirm('Anulować rozliczenie? Produkty wrócą na stan magazynowy, a sesja wróci do stanu nierozliczonej.')) return;
    setCancelling(true);
    try {
      const res = await base44.functions.invoke('settleBookingSession', {
        booking_id: booking.id,
        final_amount: 0,
        deposit_amount: 0,
        payment_breakdown: [],
        sold_products: [],
        additional_services: [],
        cancel_inventory: true,
      });
      if (res.data?.error) {
        alert(res.data.error);
        return;
      }
      onSettled(res.data.booking);
    } finally {
      setCancelling(false);
    }
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const summaryRow = (name, value, base) => (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{name}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text }}>
        {base != null && r2(base) > r2(value) && <span style={{ textDecoration: 'line-through', color: t.muted, marginRight: '6px' }}>{money(base)}</span>}
        {money(value)}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl max-h-screen overflow-y-auto p-5 sm:p-8"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A', borderRadius: 'var(--radius)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              {isEditing ? 'EDYCJA ROZLICZENIA' : 'ROZLICZENIE SESJI'}
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
              {booking?.client_name}
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '3px' }}>
              {[booking?.service_name, booking?.session_date, booking?.session_time].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* 1. SESJA — cena wyjściowa i rabat sesji */}
        <div className="mb-6">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>SESJA</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              {label('Cena sesji (wyjściowa, PLN)')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={serviceBase}
                onChange={e => setServiceBase(e.target.value)}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
              />
            </div>
            <button
              onClick={() => setShowSessionDiscount(!showSessionDiscount)}
              className="flex items-center gap-1.5"
              style={{ background: 'none', border: `0.5px solid ${showSessionDiscount || sessionDiscount.type !== 'none' ? 'var(--brand)' : t.border}`, color: showSessionDiscount || sessionDiscount.type !== 'none' ? 'var(--brand)' : t.muted, cursor: 'pointer', padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 'var(--radius)', marginBottom: '8px' }}
            >
              <Tag size={11} /> RABAT
            </button>
          </div>

          {showSessionDiscount && (
            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setSessionDiscount(s => ({ ...s, type: 'amount' }))} style={chipStyle(sessionDiscount.type === 'amount', t)}>Kwota</button>
                <button onClick={() => setSessionDiscount(s => ({ ...s, type: 'percent' }))} style={chipStyle(sessionDiscount.type === 'percent', t)}>Procent</button>
                {sessionDiscount.type !== 'none' && (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={sessionDiscount.value ?? 0}
                      onChange={e => setSessionDiscount(s => ({ ...s, value: Math.max(0, Number(e.target.value) || 0) }))}
                      style={{ ...inputStyle, color: 'var(--brand)', borderBottomColor: t.border, width: '90px', textAlign: 'right', padding: '6px 0' }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{sessionDiscount.type === 'percent' ? '%' : 'PLN'}</span>
                  </>
                )}
                <button onClick={() => setSessionDiscount({ type: 'none', value: 0 })} style={chipStyle(sessionDiscount.type === 'none', t)}>Brak</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 mt-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Usługa po rabacie</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: serviceFinal < baseNum ? '#16a34a' : t.text }}>
              {serviceFinal < baseNum && <span style={{ textDecoration: 'line-through', color: t.muted, marginRight: '6px' }}>{money(baseNum)}</span>}
              {money(serviceFinal)}
            </span>
          </div>
        </div>

        {/* 2. Usługi dodatkowe */}
        <div className="mb-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
          <SettlementExtraServices value={extraServices} onChange={setExtraServices} t={t} theme={theme} />
        </div>

        {/* 3. Produkty */}
        <div className="mb-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
          <SettlementProducts value={products} onChange={setProducts} t={t} />
        </div>

        {/* 4. Rozliczenie — suma, rabaty, zaliczka */}
        <div className="mb-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ROZLICZENIE</p>
          {summaryRow('Usługa', serviceFinal, baseNum)}
          {extraServices.length > 0 && summaryRow('Usługi dodatkowe', extrasTotal, extrasBase)}
          {products.length > 0 && summaryRow('Produkty', productsTotal, productsBase)}

          {discountsTotal > 0 && (
            <div className="flex items-center justify-between py-2 mt-1 px-3" style={{ border: `0.5px solid var(--brand)`, background: 'rgb(var(--brand-rgb) /0.06)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rabaty i zniżki łącznie</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--brand)', fontWeight: 600 }}>−{money(discountsTotal)}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-3 mt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Razem</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.title, letterSpacing: '0.03em' }}>{money(total)}</span>
          </div>

          <div style={{ maxWidth: '200px' }}>
            {label('Zaliczka (PLN) — część kwoty razem')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
            />
          </div>

          <div className="flex items-center justify-between p-3 mt-4" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.04)', borderRadius: 'var(--radius)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Do rozliczenia</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--brand)', fontWeight: 600 }}>{money(remainder)}</span>
          </div>

          {commissionPreview > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#f59e0b', letterSpacing: '0.08em', marginTop: '8px' }}>
              PROWIZJA PRACOWNIKA OD PRODUKTÓW: {money(commissionPreview)}
            </p>
          )}
        </div>

        {/* 5. Metody płatności */}
        <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>METODY PŁATNOŚCI</p>
          {payments.map((p, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-center gap-2">
                <select
                  value={p.method}
                  onChange={e => {
                    setPayment(i, 'method', e.target.value);
                    if (e.target.value !== 'voucher') setVoucherFor(v => { const n = { ...v }; delete n[i]; return n; });
                  }}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, flex: '0 0 130px', colorScheme: theme === 'light' ? 'light' : 'dark' }}
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={p.amount}
                  onChange={e => setPayment(i, 'amount', e.target.value)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, flex: 1, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>PLN</span>
                {remainder > 0 && (
                  <button onClick={() => setPayment(i, 'amount', String(r2(remainder - payments.reduce((s, x, idx) => idx === i ? s : s + (Number(x.amount) || 0), 0))))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em' }}>
                    CAŁOŚĆ
                  </button>
                )}
                {payments.length > 1 && (
                  <button onClick={() => removePayment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {p.method === 'voucher' && (
                <div className="mt-2">
                  <VoucherPicker
                    t={t}
                    applied={voucherFor[i] || null}
                    onApplied={(v) => {
                      setVoucherFor(prev => { const n = { ...prev }; if (v) n[i] = v; else delete n[i]; return n; });
                      if (v) {
                        const amt = Math.min(Number(v._appliedAmount) || 0, remainder);
                        setPayment(i, 'amount', String(amt));
                      } else {
                        setPayment(i, 'amount', '');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {payments.length < 3 && (
            <button onClick={addPayment} className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>
              <Plus size={12} /> DODAJ METODĘ
            </button>
          )}

          <div className="flex items-center justify-between p-3 mt-4" style={{ border: `0.5px solid ${diff === 0 ? '#16a34a' : '#ef4444'}`, background: diff === 0 ? 'rgba(22,163,74,0.05)' : 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma wpłat</span>
            <div className="text-right">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: diff === 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{money(paymentsSum)}</span>
              {diff !== 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#ef4444', letterSpacing: '0.06em' }}>
                  {diff > 0 ? `+${diff.toFixed(2)} za dużo` : `${Math.abs(diff).toFixed(2)} za mało`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSettle} disabled={!isValid || saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ opacity: (!isValid || saving) ? 0.5 : 1 }}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> ZAPISYWANIE...</> : <><Check size={13} /> {isEditing ? 'ZAPISZ ROZLICZENIE' : 'ROZLICZ I ZAKOŃCZ'}</>}
          </button>
          {isEditing && (
            <button onClick={handleCancelSettlement} disabled={cancelling} className="btn-ghost-parchment flex items-center gap-2" title="Cofnij rozliczenie i przywróć magazyn">
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} ANULUJ
            </button>
          )}
          <button onClick={onClose} className="btn-ghost-parchment">ZAMKNIJ</button>
        </div>
      </motion.div>
    </div>
  );
}