import { money } from '@/lib/shop';
import TrendBadge from '@/components/stats/TrendBadge';

// Tabela okresowa: pierwsza kolumna (dzień / miesiąc / artysta) + liczby + przychód,
// z sumą na dole.
export default function StatsDailyTable({ t, title, rows, firstLabel, countLabel, emptyText = 'BRAK DANYCH' }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const total = rows.reduce((acc, r) => ({
    count: acc.count + (Number(r.count) || 0),
    revenue: acc.revenue + (Number(r.revenue) || 0),
  }), { count: 0, revenue: 0 });

  return (
    <div className="mb-8">
      {title && (
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>{title}</p>
      )}
      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
        <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <p className="col-span-6" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{firstLabel}</p>
          <p className="col-span-2" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{countLabel}</p>
          <p className="col-span-4 text-right" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Przychód</p>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>{emptyText}</p></div>
        ) : rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <p className="col-span-6" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{row.label}</p>
            <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.count}</p>
            <div className="col-span-4">
              <p className="text-right" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{money(row.revenue)}</p>
              {row.trend && <TrendBadge change={row.trend} t={t} align="right" />}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-12 px-4 py-3 items-center" style={{ background: 'rgb(var(--brand-rgb) /0.05)' }}>
          <p className="col-span-6" style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suma</p>
          <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text, fontWeight: 600 }}>{total.count}</p>
          <p className="col-span-4 text-right" style={{ ...mono, fontSize: '12px', color: 'var(--brand)', fontWeight: 600 }}>{money(total.revenue)}</p>
        </div>
      </div>
    </div>
  );
}