import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { variantLabel } from '@/lib/shop';

export default function VariantPicker({ product, variant, onSelect, quantity, onQuantity, stock }) {
  const axes = Array.isArray(product.variant_axes) ? product.variant_axes : [];
  const selected = {};
  (variant?.options || []).forEach(o => { selected[o.name] = o.value; });

  const pick = (axisName, value) => {
    const next = { ...selected, [axisName]: value };
    const key = axes.map(a => `${a.name}:${next[a.name]}`).join('|');
    const match = (product.variants || []).find(v => v.key === key)
      || (product.variants || []).find(v => (v.options || []).length === axes.length
        && (v.options || []).every(o => next[o.name] === o.value));
    if (match) onSelect(match);
  };

  const valueStock = (axisName, value) => {
    const match = (product.variants || []).find(v => (v.options || []).some(o => o.name === axisName && o.value === value)
      && axes.every(a => a.name === axisName || selected[a.name] === undefined
        || (v.options || []).some(o => o.name === a.name && o.value === selected[a.name])));
    return match ? Number(match.stock) || 0 : null;
  };

  return (
    <div className="space-y-6">
      {axes.map(axis => (
        <div key={axis.name}>
          <p className="text-micro" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>
            {(axis.name || '').toUpperCase()}
            {selected[axis.name] && <span style={{ color: 'hsl(var(--foreground))', marginLeft: '8px' }}>· {selected[axis.name]}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {(axis.values || []).filter(Boolean).map(value => {
              const active = selected[axis.name] === value;
              const st = valueStock(axis.name, value);
              const out = st !== null && st <= 0;
              return (
                <button
                  key={value}
                  onClick={() => pick(axis.name, value)}
                  disabled={out}
                  className="text-micro transition-all duration-300"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    padding: '8px 14px',
                    border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`,
                    color: out ? 'hsl(var(--muted-foreground))' : active ? 'var(--brand)' : 'hsl(var(--foreground))',
                    background: active ? 'rgb(var(--brand-rgb) / 0.1)' : 'transparent',
                    textDecoration: out ? 'line-through' : 'none',
                    opacity: out ? 0.45 : 1,
                    cursor: out ? 'not-allowed' : 'pointer',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {variant && <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em' }}>{variantLabel(variant)}</p>}

      <div>
        <p className="text-micro" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>ILOŚĆ</p>
        <div className="inline-flex items-center" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
          <button onClick={() => onQuantity(Math.max(1, quantity - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--foreground))', padding: '10px 12px' }}>
            <Minus size={13} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', minWidth: '36px', textAlign: 'center', color: 'hsl(var(--foreground))' }}>{quantity}</span>
          <button
            onClick={() => onQuantity(Math.min(stock > 0 ? stock : 99, quantity + 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--foreground))', padding: '10px 12px' }}
          >
            <Plus size={13} />
          </button>
        </div>
        {stock > 0 && stock <= 5 && (
          <span className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', marginLeft: '12px', letterSpacing: '0.1em' }}>OSTATNIE {stock} SZT.</span>
        )}
      </div>
    </div>
  );
}