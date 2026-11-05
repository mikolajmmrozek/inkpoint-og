import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Search, X, Package, Check, Ban, Pencil } from 'lucide-react';
import { money, ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS, formatDate } from '@/lib/shop';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import StatsTile from '@/components/dashboard/StatsTile';

const STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'returned'];

export default function ShopOrdersPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);

  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.ShopOrder.list('-created_date', 300).catch(() => []),
      base44.entities.ShopReturn.list('-created_date', 200).catch(() => []),
    ]).then(([o, r]) => { setOrders(o); setReturns(r); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openOrder = (o) => { setSelected(o); setAdminNote(o.admin_note || ''); };

  const updateOrder = async (patch) => {
    const history = [...(selected.status_history || [])];
    if (patch.status) history.push({ date: new Date().toISOString(), status: patch.status, note: 'Zmiana statusu', by: 'admin' });
    const updated = await base44.entities.ShopOrder.update(selected.id, { ...patch, status_history: history });
    setSelected({ ...selected, ...updated });
    load();
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.ShopOrder.update(selected.id, { admin_note: adminNote });
      setSelected({ ...selected, ...updated });
      load();
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageShopOrder', { action: 'cancel', order_id: selected.id });
      if (res.data?.order) setSelected(res.data.order);
      load();
    } finally {
      setSaving(false);
    }
  };

  const filtered = orders.filter(o => {
    if (filter && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.order_number || '').toLowerCase().includes(q)
        || (o.user_email || '').toLowerCase().includes(q)
        || (o.client_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const stats = [
    { label: 'Nowe', value: orders.filter(o => o.status === 'pending').length },
    { label: 'W realizacji', value: orders.filter(o => o.status === 'processing').length },
    { label: 'Zwroty', value: returns.filter(r => r.status === 'requested').length },
    { label: 'Sprzedaż', value: `${orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0).toLocaleString('pl-PL')} zł` },
  ];

  const Badge = ({ info }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: info.color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: info.color }} />{info.label}
    </span>
  );

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap">
        {stats.map(s => <StatsTile key={s.label} label={s.label} value={s.value} t={t} />)}
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('')} style={{ border: `0.5px solid ${filter === '' ? 'var(--brand)' : t.border}`, color: filter === '' ? 'var(--brand)' : t.muted, background: filter === '' ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 13px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>WSZYSTKIE</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ border: `0.5px solid ${filter === s ? 'var(--brand)' : t.border}`, color: filter === s ? 'var(--brand)' : t.muted, background: filter === s ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 13px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
              {ORDER_STATUS[s].label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '7px 12px', borderRadius: 'var(--radius)' }}>
            <Search size={12} color={t.muted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Numer, e-mail, klient..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '12px' }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Package size={26} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ZAMÓWIEŃ</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {filtered.map((o, i) => {
            const openReturns = returns.filter(r => r.order_id === o.id && ['requested', 'approved', 'received'].includes(r.status));
            return (
              <button key={o.id} onClick={() => openOrder(o)} className="w-full text-left grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center"
                style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="col-span-2 md:col-span-3">
                  <p style={{ ...mono, fontSize: '12px', letterSpacing: '0.08em', color: t.title, fontWeight: 600 }}>{o.order_number}</p>
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{formatDate(o.created_date)}</p>
                </div>
                <div className="col-span-1 md:col-span-3">
                  <p style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_name || o.user_email}</p>
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(o.items || []).length} poz.</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p style={{ ...mono, fontSize: '12px', color: 'var(--brand)' }}>{money(o.total)}</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Badge info={ORDER_STATUS[o.status] || ORDER_STATUS.pending} />
                </div>
                <div className="col-span-1 md:col-span-2 flex items-center gap-2 justify-end">
                  {openReturns.length > 0 && <span style={{ ...mono, fontSize: '8px', color: '#f59e0b', letterSpacing: '0.08em' }}>ZWROT</span>}
                  <Badge info={PAYMENT_STATUS[o.payment_status] || PAYMENT_STATUS.unpaid} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div>
                <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '5px' }}>ZAMÓWIENIE</p>
                <h3 style={{ ...display, fontSize: '1.7rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{selected.order_number}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p style={{ fontSize: '13px', color: t.text }}>{selected.client_name}</p>
                  <p style={{ ...mono, fontSize: '9px', color: t.muted }}>{selected.user_email}{selected.client_phone ? ` · ${selected.client_phone}` : ''}</p>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em' }}>PŁATNOŚĆ</p>
                    <Badge info={PAYMENT_STATUS[selected.payment_status] || PAYMENT_STATUS.unpaid} />
                  </div>
                  <div>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em' }}>STATUS</p>
                    <Badge info={ORDER_STATUS[selected.status] || ORDER_STATUS.pending} />
                  </div>
                </div>
              </div>

              <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                {(selected.items || []).map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3" style={{ borderBottom: idx < selected.items.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                    <div className="min-w-0">
                      <p style={{ fontSize: '12px', color: t.text }}>{i.product_name}</p>
                      <p style={{ ...mono, fontSize: '8px', color: t.muted }}>{i.variant_label}{i.shipping_option ? ` · ${i.shipping_option}` : ''} · {i.quantity} szt.</p>
                    </div>
                    <p style={{ ...mono, fontSize: '11px', color: t.text }}>{money(i.unit_price * i.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5" style={{ ...mono, fontSize: '10px', color: t.muted }}>
                <div className="flex justify-between"><span>Produkty</span><span style={{ color: t.text }}>{money(selected.subtotal)}</span></div>
                {selected.discount_amount > 0 && <div className="flex justify-between"><span>Zniżka {selected.discount_code}</span><span style={{ color: '#16a34a' }}>−{money(selected.discount_amount)}</span></div>}
                {selected.voucher_amount > 0 && <div className="flex justify-between"><span>Voucher {selected.voucher_code}</span><span style={{ color: '#16a34a' }}>−{money(selected.voucher_amount)}</span></div>}
                <div className="flex justify-between"><span>Dostawa</span><span style={{ color: t.text }}>{selected.shipping_cost ? money(selected.shipping_cost) : 'Gratis'}</span></div>
                <div className="flex justify-between pt-2 mt-1" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <span style={{ color: t.title }}>RAZEM</span><span style={{ color: 'var(--brand)', fontSize: '13px' }}>{money(selected.total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p style={{ ...labelStyle(t) }}>DOSTAWA</p>
                  <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.6 }}>
                    {selected.shipping_address?.first_name} {selected.shipping_address?.last_name}<br />
                    {selected.shipping_address?.street}<br />
                    {selected.shipping_address?.postal_code} {selected.shipping_address?.city}<br />
                    {selected.shipping_address?.country}
                  </p>
                </div>
                {selected.invoice_details?.company && (
                  <div>
                    <p style={{ ...labelStyle(t) }}>FAKTURA</p>
                    <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.6 }}>
                      {selected.invoice_details.company}<br />
                      NIP: {selected.invoice_details.nip || '—'}<br />
                      {selected.invoice_details.street}, {selected.invoice_details.postal_code} {selected.invoice_details.city}
                    </p>
                  </div>
                )}
              </div>

              {selected.customer_note && (
                <div>
                  <p style={{ ...labelStyle(t) }}>UWAGI KLIENTA</p>
                  <p style={{ fontSize: '12px', color: t.text }}>{selected.customer_note}</p>
                </div>
              )}

              <div>
                <p style={{ ...labelStyle(t) }}>ZMIEŃ STATUS</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter(s => s !== selected.status && s !== 'cancelled').map(s => (
                    <button key={s} onClick={() => updateOrder({ status: s })} style={{ border: `0.5px solid ${ORDER_STATUS[s].color}`, color: ORDER_STATUS[s].color, background: 'transparent', ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                      {ORDER_STATUS[s].label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => updateOrder({ payment_status: selected.payment_status === 'paid' ? 'unpaid' : 'paid' })} style={{ border: `0.5px solid ${t.border}`, color: '#16a34a', background: 'transparent', ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                    <Check size={10} style={{ display: 'inline', marginRight: '4px' }} /> {selected.payment_status === 'paid' ? 'OZNACZ JAKO NIEPŁATNE' : 'OZNACZ JAKO OPŁACONE'}
                  </button>
                  {selected.status !== 'cancelled' && (
                    <button onClick={cancelOrder} disabled={saving} style={{ border: `0.5px solid ${t.border}`, color: '#ef4444', background: 'transparent', ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                      <Ban size={10} style={{ display: 'inline', marginRight: '4px' }} /> ANULUJ I PRZYWRÓĆ STANY
                    </button>
                  )}
                </div>
              </div>

              {returns.filter(r => r.order_id === selected.id).length > 0 && (
                <div>
                  <p style={{ ...labelStyle(t) }}>ZGŁOSZENIA</p>
                  <div className="space-y-2">
                    {returns.filter(r => r.order_id === selected.id).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2.5" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                        <span style={{ ...mono, fontSize: '9px', color: t.text }}>{r.kind === 'complaint' ? 'REKLAMACJA' : 'ZWROT'} · {r.reason?.slice(0, 40)}</span>
                        <Badge info={RETURN_STATUS[r.status] || RETURN_STATUS.requested} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p style={{ ...labelStyle(t) }}>NOTATKA WEWNĘTRZNA</p>
                <textarea rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)} style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} />
                <button onClick={saveNote} disabled={saving} className="btn-oxblood mt-3 flex items-center gap-2" style={{ fontSize: '9px', padding: '9px 16px' }}>
                  <Pencil size={11} /> ZAPISZ NOTATKĘ
                </button>
              </div>

              {(selected.status_history || []).length > 0 && (
                <div>
                  <p style={{ ...labelStyle(t) }}>HISTORIA</p>
                  <div className="space-y-1.5">
                    {selected.status_history.map((h, i) => (
                      <p key={i} style={{ ...mono, fontSize: '9px', color: t.muted }}>
                        {formatDate(h.date)} · {(ORDER_STATUS[h.status] || {}).label || h.status}{h.note ? ` · ${h.note}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}