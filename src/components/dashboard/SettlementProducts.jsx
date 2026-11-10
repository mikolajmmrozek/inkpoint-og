import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Trash2, Tag, X } from 'lucide-react';
import { money } from '@/lib/shop';
import { r2, afterDiscount, discountOf } from '@/lib/settlement';

const input = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '6px 0',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const DiscountPanel = ({ item, onChange, t }) => {
  const type = item.discount_type === 'percent' ? 'percent' : item.discount_type === 'amount' ? 'amount' : 'none';
  const setType = (next) => onChange({ discount_type: next, discount_value: next === 'none' ? 0 : (item.discount_value || 0) });
  const chip = (active) => ({
    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
    color: active ? 'var(--brand)' : t.muted,
    background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
    fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)',
  });
  return (
    <div className="mt-2 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setType('amount')} style={chip(type === 'amount')}>Kwota</button>
        <button onClick={() => setType('percent')} style={chip(type === 'percent')}>Procent</button>
        {type !== 'none' && (
          <>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.discount_value ?? 0}
              onChange={(e) => onChange({ discount_value: Math.max(0, num(e.target.value)) })}
              style={{ ...input, color: 'var(--brand)', borderBottomColor: t.border, width: '80px', textAlign: 'right' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{type === 'percent' ? '%' : 'PLN'}</span>
          </>
        )}
        <button onClick={() => setType('none')} style={chip(type === 'none')} title="Bez rabatu">
          <X size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Brak
        </button>
      </div>
      {type !== 'none' && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '5px' }}>
          Rabat {money(discountOf(item.unit_price, type, item.discount_value))} od sztuki
        </p>
      )}
    </div>
  );
};

export default function SettlementProducts({ value = [], onChange, t }) {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [discountFor, setDiscountFor] = useState(null);

  useEffect(() => {
    base44.entities.ShopProduct.filter({ is_active: true }, 'order', 300)
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const add = (product) => {
    const variant = (product.variants || []).find((v) => v.is_active !== false) || null;
    const price = r2(variant ? variant.price : product.price);
    onChange([...value, {
      product_id: product.id,
      name: product.name,
      category_id: product.category_id || '',
      variant_key: variant?.key || '',
      variant_label: variant ? (variant.options || []).map((o) => o.value).join(' / ') : '',
      qty: 1,
      unit_price: price,
      price,
      discount_type: 'none',
      discount_value: 0,
    }]);
    setQuery('');
    setOpen(false);
  };

  const update = (index, patch) => onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const applyDiscount = (index, patch) => {
    const item = value[index];
    const next = { ...item, ...patch };
    const price = afterDiscount(next.unit_price, next.discount_type, next.discount_value);
    update(index, { ...patch, price });
  };

  const setVariant = (index, product, variantKey) => {
    const variant = (product.variants || []).find((v) => v.key === variantKey);
    const unit = r2(variant ? variant.price : product.price);
    const item = value[index];
    update(index, {
      variant_key: variantKey,
      variant_label: variant ? (variant.options || []).map((o) => o.value).join(' / ') : '',
      unit_price: unit,
      price: afterDiscount(unit, item.discount_type, item.discount_value),
    });
  };

  const matches = products
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const total = value.reduce((s, item) => s + r2(item.price) * num(item.qty), 0);
  const baseTotal = value.reduce((s, item) => s + r2(item.unit_price) * num(item.qty), 0);
  const saved = Math.max(0, r2(baseTotal - total));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>PRODUKTY</p>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5" style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', padding: '6px 11px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}>
          {open ? <X size={11} /> : <Plus size={11} />} {open ? 'ZAMKNIJ' : 'DODAJ PRODUKT'}
        </button>
      </div>

      {open && (
        <>
          <div className="flex items-center gap-2 mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '7px 11px', borderRadius: 'var(--radius)' }}>
            <Search size={12} color={t.muted} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj produktu..."
              style={{ ...input, color: t.text, flex: 1, borderBottom: 'none' }}
            />
          </div>
          {matches.length > 0 && (
            <div style={{ border: `0.5px solid ${t.border}`, marginBottom: '12px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  className="w-full flex items-center justify-between px-3 py-2"
                  style={{ background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '12px', color: t.text }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>{money(p.price)} · stan {p.unlimited_stock ? '∞' : (p.stock ?? 0)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {value.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          Brak produktów w rozliczeniu. „Dodaj produkt” otwiera wyszukiwanie w katalogu.
        </p>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          {value.map((item, i) => {
            const product = products.find((p) => p.id === item.product_id);
            const variants = (product?.variants || []).filter((v) => v.is_active !== false);
            const discounted = r2(item.price) < r2(item.unit_price);
            const showDiscount = discountFor === i;
            return (
              <div key={`${item.product_id}-${i}`} className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px' }}>
                      {discounted && <span style={{ textDecoration: 'line-through', marginRight: '5px' }}>{money(item.unit_price)}</span>}
                      <span style={{ color: discounted ? '#16a34a' : t.muted }}>{money(item.price)}</span>/szt.
                      {item.variant_label ? ` · ${item.variant_label}` : ''}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => update(i, { qty: Math.max(1, Math.round(num(e.target.value))) })}
                    style={{ ...input, color: t.text, borderBottomColor: t.border, width: '44px', textAlign: 'center' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#16a34a', minWidth: '68px', textAlign: 'right' }}>{money(r2(item.price) * num(item.qty))}</span>
                  <button onClick={() => setDiscountFor(showDiscount ? null : i)} title="Rabat na tę pozycję" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showDiscount || discounted ? 'var(--brand)' : t.muted, padding: '3px' }}>
                    <Tag size={12} />
                  </button>
                  <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '3px' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {variants.length > 0 && (
                  <select
                    value={item.variant_key}
                    onChange={(e) => setVariant(i, product, e.target.value)}
                    style={{ ...input, color: t.muted, borderBottomColor: t.border, width: '100%', marginTop: '4px', fontSize: '11px' }}
                  >
                    <option value="">— bez wariantu —</option>
                    {variants.map((v) => (
                      <option key={v.key} value={v.key}>{(v.options || []).map((o) => o.value).join(' / ')} · {money(v.price)}</option>
                    ))}
                  </select>
                )}
                {showDiscount && <DiscountPanel item={item} onChange={(patch) => applyDiscount(i, patch)} t={t} />}
              </div>
            );
          })}
          {saved > 0 && (
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rabat na produktach</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>−{money(saved)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Produkty razem</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text, fontWeight: 600 }}>{money(total)}</span>
          </div>
        </div>
      )}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '8px', lineHeight: 1.7 }}>
        Zatwierdzenie zdejmuje sztuki z magazynu. Edycja koryguje tylko różnicę, anulowanie przywraca stan.
      </p>
    </div>
  );
}