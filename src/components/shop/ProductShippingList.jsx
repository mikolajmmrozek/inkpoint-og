import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { money } from '@/lib/shop';

const mono = { fontFamily: 'var(--font-mono)' };

// Rozwijana lista metod dostawy na karcie produktu — klient wybiera metodę
// dopiero przy składaniu zamówienia, więc tutaj widzi tylko dostępne opcje i ceny.
export default function ProductShippingList({ options = [], legacyCost = 0 }) {
  const [open, setOpen] = useState(false);

  const paid = options.filter(o => !o.pickup);
  const pickup = options.find(o => o.pickup);
  const min = paid.length ? Math.min(...paid.map(o => Number(o.cost) || 0)) : 0;

  const summary = options.length === 0
    ? (legacyCost > 0 ? money(legacyCost) : 'gratis')
    : paid.length === 0
      ? 'bezpłatnie w studio'
      : min > 0 ? `od ${money(min)}` : 'gratis';

  return (
    <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <span>
          <span className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', display: 'block', marginBottom: '6px' }}>WYSYŁKA I PAKOWANIE</span>
          <span style={{ ...mono, fontSize: '11px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', lineHeight: 1.7 }}>
            {summary}{pickup && paid.length > 0 ? ' · bezpłatnie w studio' : ''}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{ color: 'hsl(var(--muted-foreground))', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0, marginTop: '14px' }}
        />
      </button>

      {open && (
        <div className="mt-4" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
          {options.length === 0 ? (
            <div className="flex items-baseline justify-between gap-3 px-3 py-3">
              <p style={{ fontSize: '12px', color: 'hsl(var(--foreground))' }}>Dostawa</p>
              <p style={{ ...mono, fontSize: '11px', color: legacyCost > 0 ? 'hsl(var(--foreground))' : '#16a34a' }}>
                {legacyCost > 0 ? money(legacyCost) : 'gratis'}
              </p>
            </div>
          ) : options.map((o, i) => {
            const freeFrom = Number(o.free_from) || 0;
            return (
              <div
                key={o.name}
                className="flex items-baseline justify-between gap-3 px-3 py-3"
                style={{ borderBottom: i < options.length - 1 ? '0.5px solid hsl(var(--border))' : 'none' }}
              >
                <div className="min-w-0">
                  <p style={{ fontSize: '12px', color: 'hsl(var(--foreground))' }}>{o.pickup ? 'Odbiór w studio' : o.name}</p>
                  <p style={{ ...mono, fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', marginTop: '3px' }}>
                    {[o.delivery_time, freeFrom > 0 ? `gratis od ${money(freeFrom)}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p style={{ ...mono, fontSize: '11px', whiteSpace: 'nowrap', color: Number(o.cost) > 0 ? 'hsl(var(--foreground))' : '#16a34a' }}>
                  {o.pickup ? 'bezpłatnie' : Number(o.cost) > 0 ? money(o.cost) : 'gratis'}
                </p>
              </div>
            );
          })}
          <p style={{ ...mono, fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', padding: '10px 12px', borderTop: '0.5px solid hsl(var(--border))', lineHeight: 1.7 }}>
            Metodę dostawy wybierzesz przy składaniu zamówienia — koszt doliczymy wtedy do podsumowania.
          </p>
        </div>
      )}
    </div>
  );
}