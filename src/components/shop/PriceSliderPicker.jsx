import { money } from '@/lib/shop';

export default function PriceSliderPicker({ amount, onChange, min, max, step, label = 'WYBIERZ KWOTĘ' }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-5">
        <div>
          <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', lineHeight: 0.95, letterSpacing: '0.02em', color: 'hsl(var(--foreground))' }}>{money(amount)}</p>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em', textAlign: 'right', lineHeight: 1.8 }}>
          OD {money(min)} DO {money(max)}<br />CO {money(step)}
        </p>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={amount}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
      />

      <div className="flex justify-between mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>
        <span>{money(min)}</span>
        <span>{money(max)}</span>
      </div>
    </div>
  );
}