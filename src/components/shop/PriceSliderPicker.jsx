import { useEffect, useState } from 'react';
import { money } from '@/lib/shop';

export default function PriceSliderPicker({ amount, onChange, min, max, step, label = 'WYBIERZ KWOTĘ' }) {
  const [text, setText] = useState(String(amount));

  useEffect(() => { setText(String(amount)); }, [amount]);

  const commit = (raw) => {
    const parsed = Number(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) { setText(String(amount)); return; }
    const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
    onChange(clamped);
    setText(String(clamped));
  };

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

      <div className="flex items-center gap-3 mt-5">
        <div className="flex items-baseline gap-2" style={{ borderBottom: '0.5px solid hsl(var(--border))', paddingBottom: '4px' }}>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={() => commit(text)}
            onKeyDown={e => { if (e.key === 'Enter') commit(text); }}
            aria-label="Wpisz kwotę ręcznie"
            style={{
              width: '96px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              letterSpacing: '0.04em',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>ZŁ</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          lub wpisz kwotę ręcznie
        </span>
      </div>
    </div>
  );
}