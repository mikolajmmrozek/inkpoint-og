import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square, Copy, Loader2, Check, ShoppingBag, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SettlementProducts from '@/components/dashboard/SettlementProducts';
import VoucherPicker from '@/components/dashboard/VoucherPicker';
import { money } from '@/lib/shop';
import { r2 } from '@/lib/settlement';
import { useAuth } from '@/lib/AuthContext';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'voucher', label: 'Voucher' },
];

const mono = { fontFamily: 'var(--font-mono)' };

// Okno sprzedaży — styl okna desktopowego (pasek tytułu, minimalizacja,
// maksymalizacja, pasek statusu). Sprzedaż bez sesji: produkty + płatności.
export default function QuickSaleModal({ onClose, onSaved, t, theme = 'dark', role, selfArtistId }) {
  const { user } = useAuth();
  const isAdmin = role === 'admin';

  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [clientName, setClientName] = useState('');
  const [artists, setArtists] = useState([]);
  const [artistId, setArtistId] = useState(isAdmin ? '' : (selfArtistId || ''));
  const [voucherFor, setVoucherFor] = useState({});
  const [saving, setSaving] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const windowBg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const subtleBg = theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgb(var(--brand-rgb) /0.04)';

  useEffect(() => {
    if (!isAdmin) return;
    base44.entities.Artist.filter({ is_active: true }, 'order', 50)
      .then(setArtists)
      .catch(() => setArtists([]));
  }, [isAdmin]);

  const total = r2(products.reduce((s, p) => s + r2(p.price) * (Number(p.qty) || 0), 0));
  const paymentsSum = r2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const diff = r2(paymentsSum - total);
  const isValid = products.length > 0 && total > 0 && diff === 0;

  const setPayment = (i, field, val) => setPayments(payments.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  const addPayment = () => {
    if (payments.length >= 3) return;
    const used = payments.map((p) => p.method);
    const next = PAYMENT_METHODS.find((m) => !used.includes(m.value))?.value || 'cash';
    setPayments([...payments, { method: next, amount: '' }]);
  };
  const removePayment = (i) => {
    setPayments(payments.filter((_, idx) => idx !== i));
    setVoucherFor((v) => { const n = { ...v }; delete n[i]; return n; });
  };

  const handleSell = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const breakdown = payments
        .map((p, i) => ({ method: p.method, amount: r2(p.amount), voucher_id: p.method === 'voucher' ? (voucherFor[i]?.id || '') : '' }))
        .filter((p) => p.amount > 0);

      const res = await base44.functions.invoke('recordShopSale', {
        items: products.map((p) => ({
          product_id: p.product_id,
          variant_key: p.variant_key || '',
          qty: Number(p.qty) || 1,
          price: r2(p.price),
        })),
        payment_breakdown: breakdown,
        client_name: clientName.trim(),
        artist_id: artistId || '',
      });

      if (res.data?.error) {
        alert(res.data.error);
        return;
      }

      const bookingId = res.data?.booking?.id;
      for (const vp of breakdown.filter((p) => p.method === 'voucher' && p.voucher_id && p.amount > 0)) {
        try {
          await base44.functions.invoke('managePromotion', {
            action: 'redeem',
            promotion_id: vp.voucher_id,
            amount: vp.amount,
            booking_id: bookingId,
            client_email: '',
          });
        } catch (e) { console.warn('Voucher redeem failed', e); }
      }

      onSaved(res.data);
    } finally {
      setSaving(false);
    }
  };

  const ctrlBtn = {
    width: '30px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: t.muted,
    cursor: 'pointer',
    borderRadius: 'var(--radius)',
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full overflow-hidden"
        style={{
          maxWidth: maximized ? '1120px' : '900px',
          maxHeight: '92vh',
          border: `1px solid ${t.border}`,
          background: windowBg,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Pasek tytułu okna */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            height: '38px',
            padding: '0 6px 0 12px',
            background: 'rgb(var(--brand-rgb) /0.12)',
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingBag size={12} color="var(--brand)" />
            <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Sprzedaż — Romans Tattoo
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setMinimized((m) => !m)} title={minimized ? 'Przywróć' : 'Minimalizuj'} style={ctrlBtn}>
              {minimized ? <Square size={11} /> : <Minus size={12} />}
            </button>
            <button onClick={() => setMaximized((m) => !m)} title={maximized ? 'Zmniejsz' : 'Maksymalizuj'} style={ctrlBtn}>
              {maximized ? <Copy size={10} /> : <Square size={10} />}
            </button>
            <button onClick={onClose} title="Zamknij" style={{ ...ctrlBtn, color: 'var(--brand)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {minimized ? (
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: subtleBg }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Zminimalizowane · {products.length} poz. · {money(total)}
            </p>
            <button onClick={() => setMinimized(false)} style={{ ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
              PRZYWRÓĆ
            </button>
          </div>
        ) : (
          <>
            {/* Pasek narzędzi */}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-shrink-0"
              style={{ padding: '8px 14px', borderBottom: `1px solid ${t.border}`, background: subtleBg }}
            >
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {new Date().toLocaleDateString('pl-PL')}
              </p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Kasjer: {user?.full_name || user?.email || '—'}
              </p>
              {isAdmin && (
                <select
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                  style={{
                    ...mono, fontSize: '9px', letterSpacing: '0.06em',
                    background: 'transparent', border: `0.5px solid ${t.border}`,
                    color: t.text, padding: '4px 8px', outline: 'none', cursor: 'pointer',
                    colorScheme: theme === 'light' ? 'light' : 'dark', borderRadius: 'var(--radius)',
                  }}
                >
                  <option value="">— sprzedaż studia —</option>
                  {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Klient (opcjonalnie)"
                style={{
                  ...mono, fontSize: '9px', letterSpacing: '0.04em', flex: '1 1 150px', minWidth: '120px',
                  background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.border}`,
                  color: t.text, padding: '4px 0', outline: 'none',
                }}
              />
            </div>

            {/* Zawartość okna */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_300px]">
              {/* Lewa kolumna — produkty */}
              <div className="border-b md:border-b-0 md:border-r" style={{ padding: '16px', borderColor: t.border }}>
                <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Katalog produktów
                </p>
                <SettlementProducts value={products} onChange={setProducts} t={t} />
              </div>

              {/* Prawa kolumna — podsumowanie i płatności */}
              <div style={{ padding: '16px', background: subtleBg }}>
                <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Podsumowanie
                </p>

                {products.length === 0 ? (
                  <p style={{ ...mono, fontSize: '9px', color: t.muted, lineHeight: 1.7 }}>
                    Dodaj produkty z katalogu po lewej.
                  </p>
                ) : (
                  <div style={{ marginBottom: '10px' }}>
                    {products.map((p, i) => (
                      <div key={`${p.product_id}-${i}`} className="flex items-center justify-between py-1">
                        <span style={{ fontSize: '11px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {p.name} ×{p.qty}
                        </span>
                        <span style={{ ...mono, fontSize: '10px', color: t.muted, marginLeft: '8px' }}>{money(r2(p.price) * (Number(p.qty) || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between py-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Razem</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.03em' }}>{money(total)}</span>
                </div>

                <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '14px 0 8px' }}>
                  Płatności
                </p>

                {payments.map((p, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={p.method}
                        onChange={(e) => {
                          setPayment(i, 'method', e.target.value);
                          if (e.target.value !== 'voucher') setVoucherFor((v) => { const n = { ...v }; delete n[i]; return n; });
                        }}
                        style={{
                          ...mono, fontSize: '9px', flex: '0 0 90px', background: 'transparent',
                          border: 'none', borderBottom: `0.5px solid ${t.border}`, color: t.text,
                          padding: '5px 0', outline: 'none', cursor: 'pointer',
                          colorScheme: theme === 'light' ? 'light' : 'dark',
                        }}
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={p.amount}
                        onChange={(e) => setPayment(i, 'amount', e.target.value)}
                        style={{
                          ...mono, fontSize: '11px', flex: 1, background: 'transparent',
                          border: 'none', borderBottom: `0.5px solid ${t.border}`, color: t.text,
                          padding: '5px 0', outline: 'none', textAlign: 'right',
                          colorScheme: theme === 'light' ? 'light' : 'dark',
                        }}
                      />
                      {total > 0 && (
                        <button
                          onClick={() => setPayment(i, 'amount', String(r2(total - payments.reduce((s, x, idx) => (idx === i ? s : s + (Number(x.amount) || 0)), 0))))}
                          title="Wpisz całą kwotę"
                          style={{ ...mono, fontSize: '8px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}
                        >
                          CAŁOŚĆ
                        </button>
                      )}
                      {payments.length > 1 && (
                        <button onClick={() => removePayment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    {p.method === 'voucher' && (
                      <div className="mt-2">
                        <VoucherPicker
                          t={t}
                          applied={voucherFor[i] || null}
                          onApplied={(v) => {
                            setVoucherFor((prev) => { const n = { ...prev }; if (v) n[i] = v; else delete n[i]; return n; });
                            if (v) {
                              const amt = Math.min(Number(v._appliedAmount) || 0, total);
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
                  <button
                    onClick={addPayment}
                    className="w-full flex items-center justify-center gap-1.5"
                    style={{
                      background: 'transparent', border: `0.5px solid ${t.border}`, cursor: 'pointer',
                      padding: '7px', ...mono, fontSize: '8px', letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: t.muted, borderRadius: 'var(--radius)',
                    }}
                  >
                    <Plus size={10} /> Dodaj metodę
                  </button>
                )}
              </div>
            </div>

            {/* Pasek statusu */}
            <div
              className="flex items-center justify-between gap-3 flex-shrink-0 flex-wrap"
              style={{ padding: '8px 14px', borderTop: `1px solid ${t.border}`, background: subtleBg }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <p style={{ ...mono, fontSize: '9px', color: t.text, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  RAZEM: {money(total)}
                </p>
                <p style={{ ...mono, fontSize: '8px', color: diff === 0 ? '#16a34a' : '#ef4444', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  WPŁATY: {money(paymentsSum)}{diff !== 0 && total > 0 ? ` (${diff > 0 ? '+' : ''}${diff.toFixed(2)})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="btn-ghost-parchment" style={{ padding: '8px 16px', fontSize: '9px' }}>
                  ANULUJ
                </button>
                <button
                  onClick={handleSell}
                  disabled={!isValid || saving}
                  className="btn-oxblood flex items-center gap-1.5"
                  style={{ padding: '8px 18px', fontSize: '9px', opacity: (!isValid || saving) ? 0.5 : 1 }}
                >
                  {saving ? <><Loader2 size={11} className="animate-spin" /> ZAPISYWANIE...</> : <><Check size={11} /> SPRZEDAJ</>}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}