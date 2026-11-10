import { Check } from 'lucide-react';
import { money, optionShippingCost } from '@/lib/shop';

const mono = { fontFamily: 'var(--font-mono)' };

// Wybór metody dostawy przy kasie. Koszt liczymy od kwoty po rabatach —
// forma z progiem „gratis od" jest bezpłatna, gdy kwota go osiągnie.
export default function CheckoutShippingPicker({ options = [], selected = null, onSelect, payable, shopFreeFrom = 0 }) {
  if (options.length === 0) return null;

  return (
    <div style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
      {options.map((o, i) => {
        const active = (selected?.name || '') === o.name;
        const cost = optionShippingCost(o, payable, shopFreeFrom);
        const freeFrom = Number(o.free_from) > 0 ? Number(o.free_from) : Number(shopFreeFrom) || 0;
        return (
          <button
            key={o.name}
            onClick={() => onSelect(o)}
            className="w-full flex items-center gap-3 px-3 py-3"
            style={{
              background: active ? 'rgb(var(--brand-rgb) / 0.06)' : 'transparent',
              border: 'none',
              borderBottom: i < options.length - 1 ? '0.5px solid hsl(var(--border))' : 'none',
              borderLeft: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ width: '13px', height: '13px', borderRadius: '9999px', border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`, background: active ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {active && <Check size={9} color="var(--btn-text)" />}
            </span>
            <span className="min-w-0 flex-1">
              <span style={{ display: 'block', fontSize: '12px', color: 'hsl(var(--foreground))' }}>{o.pickup ? 'Odbiór w studio' : o.name}</span>
              <span style={{ ...mono, display: 'block', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: '3px' }}>
                {[o.delivery_time, freeFrom > 0 ? `gratis od ${money(freeFrom)}` : ''].filter(Boolean).join(' · ') || ' '}
              </span>
            </span>
            <span style={{ ...mono, fontSize: '11px', whiteSpace: 'nowrap', color: cost === 0 ? '#16a34a' : 'hsl(var(--foreground))' }}>
              {cost === 0 ? 'Bezpłatnie' : money(cost)}
            </span>
          </button>
        );
      })}
    </div>
  );
}