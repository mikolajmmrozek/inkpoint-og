import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Package, X, RotateCcw, Check } from 'lucide-react';
import { money, ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS, formatDate } from '@/lib/shop';

export default function ClientOrders() {
  const { user, theme } = useOutletContext();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.6)', panelBg: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.7)', panelBg: '#141414' };

  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [returnFor, setReturnFor] = useState(null);
  const [returnKind, setReturnKind] = useState('return');
  const [returnReason, setReturnReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user?.email) return;
    Promise.all([
      base44.entities.ShopOrder.filter({ user_email: user.email }, '-created_date', 100).catch(() => []),
      base44.entities.ShopReturn.filter({ user_email: user.email }, '-created_date', 100).catch(() => []),
    ]).then(([o, r]) => { setOrders(o); setReturns(r); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.email]);

  const submitReturn = async () => {
    if (!returnReason.trim()) return;
    setSaving(true);
    try {
      await base44.entities.ShopReturn.create({
        order_id: returnFor.id,
        order_number: returnFor.order_number,
        user_email: user.email,
        client_name: returnFor.client_name || user.full_name,
        kind: returnKind,
        items: (returnFor.items || []).map(i => ({ product_id: i.product_id, product_name: i.product_name, variant_label: i.variant_label, quantity: i.quantity })),
        reason: returnReason,
        status: 'requested',
      });
      setReturnFor(null);
      setReturnReason('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const Badge = ({ info }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: info.color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: info.color }} />{info.label}
    </span>
  );

  const orderReturns = selected ? returns.filter(r => r.order_id === selected.id) : [];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>SKLEP</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Zamówienia</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.05em', marginTop: '10px', maxWidth: '480px', lineHeight: 1.6 }}>
          Historia zamówień, statusy i zgłoszenia zwrotów.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg, borderRadius: 'var(--radius)' }}>
          <Package size={28} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '16px' }}>BRAK ZAMÓWIEŃ</p>
          <Link to="/sklep" className="btn-oxblood" style={{ padding: '11px 22px', fontSize: '10px' }}>PRZEJDŹ DO SKLEPU</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
            return (
              <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left p-4 transition-colors"
                style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--brand-rgb) / 0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.1em', color: t.title, fontWeight: 600 }}>{o.order_number}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px' }}>
                      {formatDate(o.created_date)} · {(o.items || []).length} {((o.items || []).length === 1) ? 'pozycja' : 'pozycje'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--brand)' }}>{money(o.total)}</p>
                    <div className="mt-1.5"><Badge info={st} /></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {formatDate(selected.created_date)}
                </p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{selected.order_number}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4">
                <Badge info={ORDER_STATUS[selected.status] || ORDER_STATUS.pending} />
                <Badge info={PAYMENT_STATUS[selected.payment_status] || PAYMENT_STATUS.unpaid} />
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>POZYCJE</p>
                <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                  {(selected.items || []).map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3" style={{ borderBottom: idx < selected.items.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                      <div className="min-w-0">
                        <p style={{ color: t.text, fontSize: '13px' }}>{i.product_name}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>{i.variant_label} · {i.quantity} szt.</p>
                      </div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text, whiteSpace: 'nowrap' }}>{money(i.unit_price * i.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                <div className="flex justify-between"><span>Produkty</span><span style={{ color: t.text }}>{money(selected.subtotal)}</span></div>
                {selected.discount_amount > 0 && <div className="flex justify-between"><span>Zniżka {selected.discount_code}</span><span style={{ color: '#16a34a' }}>−{money(selected.discount_amount)}</span></div>}
                {selected.voucher_amount > 0 && <div className="flex justify-between"><span>Voucher {selected.voucher_code}</span><span style={{ color: '#16a34a' }}>−{money(selected.voucher_amount)}</span></div>}
                <div className="flex justify-between"><span>Dostawa</span><span style={{ color: t.text }}>{selected.shipping_cost ? money(selected.shipping_cost) : 'Gratis'}</span></div>
                <div className="flex justify-between pt-2 mt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <span style={{ color: t.title }}>RAZEM</span><span style={{ color: 'var(--brand)', fontSize: '13px' }}>{money(selected.total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>DOSTAWA</p>
                  <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                    {selected.shipping_address?.first_name} {selected.shipping_address?.last_name}<br />
                    {selected.shipping_address?.street}<br />
                    {selected.shipping_address?.postal_code} {selected.shipping_address?.city}<br />
                    {selected.shipping_address?.country}
                  </p>
                </div>
                {selected.invoice_details?.company && (
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>FAKTURA</p>
                    <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                      {selected.invoice_details.company}<br />
                      NIP: {selected.invoice_details.nip || '—'}<br />
                      {selected.invoice_details.street}, {selected.invoice_details.postal_code} {selected.invoice_details.city}
                    </p>
                  </div>
                )}
              </div>

              {selected.customer_note && (
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>UWAGI</p>
                  <p style={{ color: t.text, fontSize: '12px' }}>{selected.customer_note}</p>
                </div>
              )}

              {(selected.status_history || []).length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>HISTORIA</p>
                  <div className="space-y-2">
                    {selected.status_history.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={10} color="var(--brand)" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.04em' }}>
                          {(ORDER_STATUS[h.status] || {}).label || h.status} · {formatDate(h.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orderReturns.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZGŁOSZENIA</p>
                  <div className="space-y-2">
                    {orderReturns.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2.5" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.06em' }}>{r.kind === 'complaint' ? 'REKLAMACJA' : 'ZWROT'}</span>
                        <Badge info={RETURN_STATUS[r.status] || RETURN_STATUS.requested} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selected.status === 'completed' || selected.status === 'shipped') && (
                <button onClick={() => { setReturnFor(selected); setReturnKind('return'); setReturnReason(''); }} className="btn-ghost-parchment w-full flex items-center justify-center gap-2" style={{ padding: '11px', fontSize: '10px' }}>
                  <RotateCcw size={12} /> ZGŁOŚ ZWROT LUB REKLAMACJĘ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {returnFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setReturnFor(null)}>
          <div className="w-full max-w-md p-6" style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em' }}>Zgłoszenie</h3>
              <button onClick={() => setReturnFor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={16} /></button>
            </div>
            <div className="flex gap-2 mb-5">
              {[['return', 'ZWROT'], ['complaint', 'REKLAMACJA']].map(([v, l]) => (
                <button key={v} onClick={() => setReturnKind(v)} style={{ flex: 1, border: `0.5px solid ${returnKind === v ? 'var(--brand)' : t.border}`, color: returnKind === v ? 'var(--brand)' : t.muted, background: returnKind === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', padding: '9px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>{l}</button>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Powód *</p>
            <textarea rows={4} value={returnReason} onChange={e => setReturnReason(e.target.value)} style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.text, padding: '10px', fontSize: '13px', outline: 'none', resize: 'vertical', borderRadius: 'var(--radius)' }} />
            <div className="flex gap-3 mt-5">
              <button onClick={submitReturn} disabled={saving || !returnReason.trim()} className="btn-oxblood flex-1" style={{ padding: '11px', fontSize: '10px', opacity: saving || !returnReason.trim() ? 0.5 : 1 }}>
                {saving ? 'WYSYŁANIE...' : 'WYŚLIJ ZGŁOSZENIE'}
              </button>
              <button onClick={() => setReturnFor(null)} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}