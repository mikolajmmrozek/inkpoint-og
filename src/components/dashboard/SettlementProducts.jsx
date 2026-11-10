import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Trash2 } from 'lucide-react';
import { money } from '@/lib/shop';

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
const r2 = (v) => Math.round(num(v) * 100) / 100;

export default function SettlementProducts({ value = [], onChange, t }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');

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
      variant_key: variant?.key || '',
      variant_label: variant ? (variant.options || []).map((o) => o.value).join(' / ') : '',
      qty: 1,
      unit_price: price,
      price,
    }]);
    setQuery('');
  };

  const update = (index, patch) => onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const setVariant = (index, product, variantKey) => {
    const variant = (product.variants || []).find((v) => v.key === variantKey);
    const price = r2(variant ? variant.price : product.price);
    update(index, {
      variant_key: variantKey,
      variant_label: variant ? (variant.options || []).map((o) => o.value).join(' / ') : '',
      unit_price: price,
      price,
    });
  };

  const matches = products
    .filter((p) => !value.some((v) => v.product_id === p.id))
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const total = value.reduce((s, item) => s + r2(item.price) * num(item.qty), 0);

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>PRODUKTY Z KATALOGU</p>

      <div className="flex items-center gap-2 mb-3" style={{ border: `0.5px solid ${t.border}`, padding: '7px 11px', borderRadius: 'var(--radius)' }}>
        <Search size={12} color={t.muted} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj produktu..."
          style={{ ...input, color: t.text, flex: 1, borderBottom: 'none' }}
        />
      </div>

      {query && matches.length > 0 && (
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

      {value.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          Brak produktów w rozliczeniu.
        </p>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          {value.map((item, i) => {
            const product = products.find((p) => p.id === item.product_id);
            const variants = (product?.variants || []).filter((v) => v.is_active !== false);
            return (
              <div key={`${item.product_id}-${i}`} className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px' }}>
                      cena bieżąca {money(item.unit_price)}{item.variant_label ? ` · ${item.variant_label}` : ''}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => update(i, { qty: Math.max(1, Math.round(num(e.target.value))) })}
                    style={{ ...input, color: t.text, borderBottomColor: t.border, width: '48px', textAlign: 'center' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => update(i, { price: r2(e.target.value) })}
                    style={{ ...input, color: '#16a34a', borderBottomColor: t.border, width: '78px', textAlign: 'right' }}
                  />
                  <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
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
              </div>
            );
          })}
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