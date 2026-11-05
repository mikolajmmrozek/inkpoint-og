import { money } from '@/lib/shop';

export const VOUCHER_MIN = 100;
export const VOUCHER_MAX = 2000;
export const VOUCHER_STEP = 50;

export default function VoucherAmountPicker({ amount, onChange }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-5">
        <div>
          <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', marginBottom: '8px' }}>WYBIERZ KWOTĘ VOUCHERA</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', lineHeight: 0.95, letterSpacing: '0.02em', color: 'hsl(var(--foreground))' }}>{money(amount)}</p>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em', textAlign: 'right', lineHeight: 1.8 }}>
          OD {money(VOUCHER_MIN)} DO {money(VOUCHER_MAX)}<br />CO {money(VOUCHER_STEP)}
        </p>
      </div>

      <input
        type="range"
        min={VOUCHER_MIN}
        max={VOUCHER_MAX}
        step={VOUCHER_STEP}
        value={amount}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
      />

      <div className="flex justify-between mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>
        <span>{money(VOUCHER_MIN)}</span>
        <span>{money(VOUCHER_MAX)}</span>
      </div>
    </div>
  );
}