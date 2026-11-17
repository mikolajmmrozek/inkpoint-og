import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { money } from '@/lib/shop';
import { PAYMENT_COLORS, PAYMENT_LABELS, PAYMENT_METHODS } from '@/lib/statsPayments';

// Wykres form płatności (gotówka / karta / voucher) — słupki skumulowane w miesiącach.
export default function StatsPaymentChart({ t, title, data, note, height = 230 }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const totals = PAYMENT_METHODS.reduce((acc, m) => {
    acc[m] = data.reduce((s, d) => s + (Number(d[m]) || 0), 0);
    return acc;
  }, {});
  const grand = PAYMENT_METHODS.reduce((s, m) => s + totals[m], 0);

  return (
    <div className="mb-8 p-4 sm:p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{title}</p>
        <p style={{ ...mono, fontSize: '12px', color: t.text, fontWeight: 600 }}>{money(grand)}</p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 9, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: t.border }} tickLine={false} />
          <YAxis tick={{ fill: t.muted, fontSize: 9, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(v, name) => [`${Number(v || 0).toLocaleString('pl-PL')} PLN`, PAYMENT_LABELS[name] || name]}
            contentStyle={{ background: '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
            labelStyle={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
          />
          <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }} formatter={(v) => PAYMENT_LABELS[v] || v} />
          <Bar dataKey="cash" stackId="a" fill={PAYMENT_COLORS.cash} />
          <Bar dataKey="card" stackId="a" fill={PAYMENT_COLORS.card} />
          <Bar dataKey="voucher" stackId="a" fill={PAYMENT_COLORS.voucher} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {PAYMENT_METHODS.map(m => (
          <div key={m} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PAYMENT_COLORS[m], display: 'inline-block' }} />
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{PAYMENT_LABELS[m]}</p>
            </div>
            <p style={{ ...mono, fontSize: '12px', color: PAYMENT_COLORS[m], fontWeight: 600 }}>{money(totals[m])}</p>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
              {grand > 0 ? `${Math.round(totals[m] / grand * 100)}%` : '0%'}
            </p>
          </div>
        ))}
      </div>

      {note && (
        <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '10px', lineHeight: 1.7 }}>{note}</p>
      )}
    </div>
  );
}