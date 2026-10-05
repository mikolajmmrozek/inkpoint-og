import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wallet, Plus, Trash2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VoucherPicker from '@/components/dashboard/VoucherPicker';

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

export default function SettlementModal({ booking, user, onClose, onSettled, t }) {
  const isEditing = booking?.is_settled === true;
  const [finalAmount, setFinalAmount] = useState(booking?.final_amount || booking?.estimated_price || '');
  const [depositAmount, setDepositAmount] = useState(booking?.deposit_amount || 0);
  const [payments, setPayments] = useState(
    booking?.payment_breakdown?.length
      ? booking.payment_breakdown.map(p => ({ method: p.method, amount: String(p.amount) }))
      : [{ method: 'cash', amount: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [voucherFor, setVoucherFor] = useState({}); // { [rowIndex]: voucherObj }

  const finalNum = Number(finalAmount) || 0;
  const depositNum = Number(depositAmount) || 0;
  const remainder = Math.max(0, finalNum - depositNum);
  const paymentsSum = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const isValid = finalNum >= 0 && paymentsSum === remainder && (remainder === 0 || payments.every(p => p.method && (Number(p.amount) || 0) > 0));
  const diff = paymentsSum - remainder;

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
        .map((p, i) => ({ method: p.method, amount: Math.round(Number(p.amount) * 100) / 100, voucher_id: p.method === 'voucher' ? (voucherFor[i]?.id || '') : '' }))
        .filter(p => p.amount > 0);
      const updates = {
        final_amount: Math.round(finalNum * 100) / 100,
        // Sync the booking price with the settled amount so stats (which read
        // estimated_price) reflect the actual session price after settlement.
        estimated_price: Math.round(finalNum * 100) / 100,
        deposit_amount: Math.round(depositNum * 100) / 100,
        deposit_paid: depositNum > 0,
        payment_breakdown: breakdown,
        is_settled: true,
        settled_by_id: user?.id || '',
        settled_by_name: user?.full_name || user?.email || '',
        settled_date: new Date().toISOString(),
        status: 'completed',
      };
      await base44.entities.Booking.update(booking.id, updates);
      // Redeem vouchers on both first settlement and edit. The backend rejects an amount
      // exceeding the current balance, so an already-fully-redeemed voucher is skipped
      // (error caught below) — no double deduction — while a voucher stored but never
      // actually redeemed (e.g. from the old edit-skip bug) finally gets deducted.
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
        } catch (e) { /* voucher redeem failed — booking still settled */ console.warn('Voucher redeem failed', e); }
      }
      onSettled({ ...booking, ...updates });
    } finally {
      setSaving(false);
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
        className="w-full max-w-lg max-h-screen overflow-y-auto p-5 sm:p-8"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A' }}
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
          {/* Kwoty */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KWOTY</p>
            <div className="mb-4">
              {label('Finałna kwota (PLN) *')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={finalAmount}
                onChange={e => setFinalAmount(e.target.value)}
                onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderBottomColor = t.border}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
              />
            </div>
            <div className="mb-4">
              {label('Zaliczka (PLN) — część finalnej kwoty)')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderBottomColor = t.border}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
              />
            </div>
            <div className="flex items-center justify-between p-3" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.04)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Do rozliczenia</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--brand)', fontWeight: 600 }}>{remainder.toLocaleString('pl-PL')} PLN</span>
            </div>
          </div>

          {/* Metody płatności */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>METODY PŁATNOŚCI</p>
            {payments.map((p, i) => {
              return (
                <div key={i} className="mb-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={e => {
                        setPayment(i, 'method', e.target.value);
                        if (e.target.value !== 'voucher') setVoucherFor(v => { const n = { ...v }; delete n[i]; return n; });
                      }}
                      style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, flex: '0 0 130px', colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                    >
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    {p.method === 'voucher' ? (
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={p.amount}
                          onChange={e => setPayment(i, 'amount', e.target.value)}
                          onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                          onBlur={e => e.target.style.borderBottomColor = t.border}
                          style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, width: '100%', colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={p.amount}
                        onChange={e => setPayment(i, 'amount', e.target.value)}
                        onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                        onBlur={e => e.target.style.borderBottomColor = t.border}
                        style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, flex: 1, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                      />
                    )}
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
              );
            })}
            {payments.length < 3 && (
              <button onClick={addPayment} className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>
                <Plus size={12} /> DODAJ METODĘ
              </button>
            )}

            {/* Suma */}
            <div className="flex items-center justify-between p-3 mt-4" style={{ border: `0.5px solid ${diff === 0 ? '#16a34a' : '#ef4444'}`, background: diff === 0 ? 'rgba(22,163,74,0.05)' : 'rgba(239,68,68,0.05)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma wpłat</span>
              <div className="text-right">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: diff === 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{paymentsSum.toLocaleString('pl-PL')} PLN</span>
                {diff !== 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#ef4444', letterSpacing: '0.06em' }}>
                    {diff > 0 ? `+${diff.toFixed(2)} za dużo` : `${Math.abs(diff).toFixed(2)} za mało`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSettle} disabled={!isValid || saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ opacity: (!isValid || saving) ? 0.5 : 1 }}>
            {saving ? 'ZAPISYWANIE...' : <><Check size={13} /> {isEditing ? 'ZAPISZ ROZLICZENIE' : 'ROZLICZ I ZAKOŃCZ'}</>}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}