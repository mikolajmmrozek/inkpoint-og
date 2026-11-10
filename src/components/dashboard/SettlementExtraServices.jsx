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

const chipStyle = (active, t) => ({
  border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
  color: active ? 'var(--brand)' : t.muted,
  background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
  fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
  padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)',
});

export default function SettlementExtraServices({ value = [], onChange, t, theme }) {
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [discountFor, setDiscountFor] = useState(null);

  useEffect(() => {
    base44.entities.Service.filter({ is_active: true }, 'order', 200)
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const add = (service) => {
    const price = r2(service.price_type === 'fixed' ? service.price_fixed : service.price_min);
    onChange([...value, {
      service_id: service.id,
      name: service.name,
      category: service.category || '',
      base_price: price,
      price,
      discount_type: 'none',
      discount_value: 0,
      artist_id: '',
      artist_name: '',
    }]);
    setQuery('');
    setOpen(false);
  };

  const update = (index, patch) => onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const applyDiscount = (index, patch) => {
    const item = value[index];
    const next = { ...item, ...patch };
    const base = next.base_price != null ? next.base_price : next.price;
    update(index, { ...patch, base_price: base, price: afterDiscount(base, next.discount_type, next.discount_value) });
  };

  const matches = services
    .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const total = value.reduce((s, x) => s + r2(x.price), 0);
  const baseTotal = value.reduce((s, x) => s + r2(x.base_price != null ? x.base_price : x.price), 0);
  const saved = Math.max(0, r2(baseTotal - total));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>USŁUGI DODATKOWE</p>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5" style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', padding: '6px 11px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 'var(--radius)' }}>
          {open ? <X size={11} /> : <Plus size={11} />} {open ? 'ZAMKNIJ' : 'DODAJ USŁUGĘ'}
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
              placeholder="Szukaj usługi..."
              style={{ ...input, color: t.text, flex: 1, borderBottom: 'none' }}
            />
          </div>
          {matches.length > 0 && (
            <div style={{ border: `0.5px solid ${t.border}`, marginBottom: '12px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {matches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => add(s)}
                  className="w-full flex items-center justify-between px-3 py-2"
                  style={{ background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '12px', color: t.text }}>{s.name}{s.category ? ` · ${s.category}` : ''}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                    {money(s.price_type === 'fixed' ? s.price_fixed : s.price_min)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {value.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          Brak usług dodatkowych. Dodana usługa zostaje przy tym samym kliencie i terminie — bez nowej rezerwacji i bez konfliktu w kalendarzu.
        </p>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          {value.map((item, i) => {
            const base = item.base_price != null ? item.base_price : item.price;
            const discounted = r2(base) > r2(item.price);
            const showDiscount = discountFor === i;
            const type = item.discount_type === 'percent' ? 'percent' : item.discount_type === 'amount' ? 'amount' : 'none';
            return (
              <div key={`${item.service_id}-${i}`} className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px' }}>
                      {discounted && <span style={{ textDecoration: 'line-through', marginRight: '5px' }}>{money(base)}</span>}
                      <span style={{ color: discounted ? '#16a34a' : t.muted }}>{money(item.price)}</span>
                      {item.category ? ` · ${item.category}` : ''}
                    </p>
                  </div>
                  <button onClick={() => setDiscountFor(showDiscount ? null : i)} title="Rabat na tę usługę" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showDiscount || discounted ? 'var(--brand)' : t.muted, padding: '3px' }}>
                    <Tag size={12} />
                  </button>
                  <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '3px' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {showDiscount && (
                  <div className="mt-2 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => applyDiscount(i, { discount_type: 'amount' })} style={chipStyle(type === 'amount', t)}>Kwota</button>
                      <button onClick={() => applyDiscount(i, { discount_type: 'percent' })} style={chipStyle(type === 'percent', t)}>Procent</button>
                      {type !== 'none' && (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount_value ?? 0}
                            onChange={(e) => applyDiscount(i, { discount_value: Math.max(0, Number(e.target.value) || 0) })}
                            style={{ ...input, color: 'var(--brand)', borderBottomColor: t.border, width: '80px', textAlign: 'right' }}
                          />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{type === 'percent' ? '%' : 'PLN'}</span>
                        </>
                      )}
                      <button onClick={() => applyDiscount(i, { discount_type: 'none', discount_value: 0 })} style={chipStyle(type === 'none', t)}>Brak</button>
                    </div>
                    {type !== 'none' && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '5px' }}>
                        Rabat {money(discountOf(base, type, item.discount_value))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {saved > 0 && (
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rabat na usługach</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>−{money(saved)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Usługi dodatkowe razem</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text, fontWeight: 600 }}>{money(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}