import { money, multipacksOf, packPrice, packLabel } from '@/lib/shop';

// Wybór zestawu: pojedyncza sztuka albo wielosztuka (pakiet).
// Pakiety korzystają ze wspólnego stanu — niedostępne, gdy brakuje sztuk.
export default function MultipackPicker({ product, basePrice, pack, onSelect, availableUnits }) {
  const packs = multipacksOf(product);
  if (packs.length === 0) return null;

  const options = [
    { units: 1, label: '1 szt.', price: Number(basePrice) || 0, pack: null },
    ...packs.map(p => ({ units: Number(p.units), label: packLabel(p), price: packPrice(basePrice, p), pack: p })),
  ];
  const selectedUnits = pack ? Number(pack.units) : 1;

  return (
    <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
      <p className="text-micro" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>ZESTAW</p>
      <div className="space-y-2">
        {options.map(o => {
          const active = selectedUnits === o.units;
          const out = availableUnits !== null && availableUnits < o.units;
          const saving = o.units > 1 && o.price < (Number(basePrice) || 0) * o.units
            ? Math.round(((Number(basePrice) || 0) * o.units - o.price) * 100) / 100
            : 0;
          return (
            <button
              key={o.units}
              onClick={() => !out && onSelect(o.pack)}
              disabled={out}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 transition-all duration-300"
              style={{
                border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`,
                background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                color: out ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                opacity: out ? 0.5 : 1,
                cursor: out ? 'not-allowed' : 'pointer',
                borderRadius: 'var(--radius)',
                textAlign: 'left',
              }}
            >
              <span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? 'var(--brand)' : 'inherit' }}>
                  {o.label}
                </span>
                {saving > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em', color: '#16a34a', marginLeft: '10px' }}>
                    OSZCZĘDZASZ {money(saving)}
                  </span>
                )}
                {out && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em', marginLeft: '10px' }}>
                    BRAK SZTUK
                  </span>
                )}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: active ? 'var(--brand)' : 'inherit' }}>{money(o.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}