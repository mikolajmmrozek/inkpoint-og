import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Check, Loader2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VoucherPicker from '@/components/dashboard/VoucherPicker';
import SettlementProducts from './SettlementProducts';
import SettlementExtraServices from './SettlementExtraServices';
import { money } from '@/lib/shop';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Gotówka', color: '#16a34a' },
  { value: 'card', label: 'Karta', color: '#2563eb' },
  { value: 'voucher', label: 'Voucher', color: '#f59e0b' },
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

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export default function SettlementModal({ booking, user, onClose, onSettled, t, theme = 'dark' }) {
  const isEditing = booking?.is_settled === true;
  const [finalAmount, setFinalAmount] = useState(booking?.final_amount || booking?.estimated_price || '');
  const [depositAmount, setDepositAmount] = useState(booking?.deposit_amount || 0);
  const [payments, setPayments] = useState(
    booking?.payment_breakdown?.length
      ? booking.payment_breakdown.map(p => ({ method: p.method, amount: String(p.amount) }))
      : [{ method: 'cash', amount: '' }]
  );
  const [products, setProducts] = useState(Array.isArray(booking?.sold_products) ? booking.sold_products : []);
  const [extraServices, setExtraServices] = useState(Array.isArray(booking?.additional_services) ? booking.additional_services : []);
  const [discountPct, setDiscountPct] = useState(0);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [voucherFor, setVoucherFor] = useState({});

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => setSettings(list[0] || {}))
      .catch(() => setSettings({}));
  }, []);

  const productsTotal = r2(products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.qty) || 0), 0));
  const extrasTotal = r2(extraServices.reduce((s, p) => s + (Number(p.price) || 0), 0));
  const finalNum = Number(finalAmount) || 0;
  const servicePart = r2(Math.max(0, finalNum - productsTotal - extrasTotal));
  const depositNum = Number(depositAmount) || 0;
  const remainder = Math.max(0, r2(finalNum - depositNum));
  const paymentsSum = r2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const isValid = finalNum >= 0 && paymentsSum === remainder && (remainder === 0 || payments.every(p => p.method && (Number(p.amount) || 0) > 0));
  const diff = r2(paymentsSum - remainder);

  // Dodanie lub usunięcie pozycji podnosi/obniża finałną kwotę o tę różnicę,
  // żeby kwota usługi pozostała nienaruszona.
  const prevItemsSum = useRef(productsTotal + extrasTotal);
  useEffect(() => {
    const sum = productsTotal + extrasTotal;
    const delta = r2(sum - prevItemsSum.current);
    prevItemsSum.current = sum;
    if (delta !== 0) setFinalAmount(prev => String(r2((Number(prev) || 0) + delta)));
  }, [productsTotal, extrasTotal]);

  const itemsCount = products.reduce((s, p) => s + (Number(p.qty) || 0), 0);
  const commissionType = settings?.product_commission_type || 'none';
  const commissionValue = Number(settings?.product_commission_value) || 0;
  const commissionPreview = commissionType === 'percent'
    ? r2(productsTotal * commissionValue / 100)
    : commissionType === 'amount' ? r2(itemsCount * commissionValue) : 0;

  const applyDiscount = () => {
    const pct = Math.min(100, Math.max(0, Number(discountPct) || 0));
    const base = productsTotal + extrasTotal + (Number(booking?.estimated_price) || 0);
    setFinalAmount(String(r2(base * (1 - pct / 100))));
  };

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
        final_amount: r2(finalNum),
        deposit_amount: r2(depositNum),
        payment_breakdown: breakdown,
        sold_products: products.map(p => ({
          product_id: p.product_id,
          variant_key: p.variant_key || '',
          variant_label: p.variant_label || '',
          qty: Number(p.qty) || 0,
          price: Number(p.price) || 0,
        })),
        additional_services: extraServices,
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
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Produkty */}
          <SettlementProducts value={products} onChange={setProducts} t={t} />

          {/* Usługi dodatkowe */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
            <SettlementExtraServices value={extraServices} onChange={setExtraServices} t={t} theme={theme} />
          </div>

          {/* Kwoty */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KWOTY</p>

            <div className="flex items-center justify-between p-3 mb-4" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Usługa (reszta kwoty)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text }}>{money(servicePart)}</span>
            </div>

            <div className="mb-4">
              {label('Finałna kwota — usługa + produkty + usługi dodatkowe (PLN) *')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={finalAmount}
                onChange={e => setFinalAmount(e.target.value)}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
              />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px' }}>
                Produkty {money(productsTotal)} · usługi dodatkowe {money(extrasTotal)}
              </p>
            </div>

            <div className="flex items-end gap-3 mb-4">
              <div style={{ maxWidth: '140px' }}>
                {label('Rabat (%)')}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPct}
                  onChange={e => setDiscountPct(e.target.value)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }}
                />
              </div>
              <button onClick={applyDiscount} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}>
                PRZELICZ
              </button>
            </div>

            <div className="mb-4">
              {label('Zaliczka (PLN) — część finalnej kwoty')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
              />
            </div>

            <div className="flex items-center justify-between p-3" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.04)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Do rozliczenia</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--brand)', fontWeight: 600 }}>{money(remainder)}</span>
            </div>

            {commissionPreview > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#f59e0b', letterSpacing: '0.08em', marginTop: '8px' }}>
                PROWIZJA PRACOWNIKA OD PRODUKTÓW: {money(commissionPreview)}
              </p>
            )}
          </div>

          {/* Metody płatności */}
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