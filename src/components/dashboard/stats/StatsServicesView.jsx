import { useMemo } from 'react';
import { money } from '@/lib/shop';
import { sessionAmount } from '@/lib/settlement';

// Cena samej usługi głównej w sesji: kwota sesji po rabacie bez produktów
// i usług dopisanych w rozliczeniu.
const mainServiceRevenue = (b) => Math.max(
  0,
  sessionAmount(b) - (Number(b.products_total) || 0) - (Number(b.services_total) || 0)
);

// Wszystkie wykonane usługi w sesji — usługa główna i każda usługa dopisana
// w rozliczeniu to równorzędne pozycje. Rezerwacja pozostaje tylko źródłem danych.
const executionsOf = (b) => {
  const list = [];
  const mainName = b.service_name || 'Sesja bez usługi';
  list.push({ name: mainName, revenue: mainServiceRevenue(b) });
  (b.additional_services || []).forEach(s => {
    if (!s?.name) return;
    list.push({ name: s.name, revenue: Number(s.price) || 0 });
  });
  return list;
};

const allServiceRevenue = (bookings) => bookings.reduce((s, b) => s + executionsOf(b).reduce((x, e) => x + e.revenue, 0), 0);

export default function StatsServicesView({ t, filtered, MONTHS_FULL, selectedYear }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  const totals = useMemo(() => {
    const revenue = allServiceRevenue(filtered);
    const executions = filtered.reduce((s, b) => s + executionsOf(b).length, 0);
    const sessions = filtered.length;
    return { revenue, executions, sessions, avg: sessions ? Math.round(revenue / sessions) : 0 };
  }, [filtered]);

  const services = useMemo(() => {
    const map = new Map();
    filtered.forEach(b => executionsOf(b).forEach(e => {
      const row = map.get(e.name) || { name: e.name, executions: 0, revenue: 0 };
      row.executions += 1;
      row.revenue += e.revenue;
      map.set(e.name, row);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const monthly = useMemo(() => MONTHS_FULL.map((name, mi) => {
    const mb = filtered.filter(b => b.session_date && new Date(b.session_date).getMonth() === mi);
    return { name, sessions: mb.length, revenue: allServiceRevenue(mb) };
  }).filter(m => m.sessions > 0), [filtered, MONTHS_FULL]);

  const KPICard = ({ label, value, sub }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...display, fontSize: '2.2rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  const head = (text, cols) => (
    <div className={`grid ${cols} px-4 py-2`} style={{ borderBottom: `0.5px solid ${t.border}` }}>
      {text.map((h, i) => (
        <p key={i} style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
      ))}
    </div>
  );

  const empty = (text) => <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>{text}</p></div>;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KPICard label="Przychód usług" value={money(totals.revenue)} sub={`${totals.sessions} sesji`} />
        <KPICard label="Wykonania usług" value={totals.executions} sub={`${services.length} rodzajów`} />
        <KPICard label="Średnia wartość sesji" value={money(totals.avg)} />
        <KPICard label="Średnia za wykonanie" value={money(totals.executions ? totals.revenue / totals.executions : 0)} />
      </div>

      <div className="mb-8">
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          USŁUGI — PRZYCHÓD {selectedYear}
        </p>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {head(['Usługa', 'Wykonania', 'Przychód', 'Średnia'], 'grid-cols-12')}
          {services.length === 0 ? empty('BRAK DANYCH') : services.map(row => (
            <div key={row.name} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p className="col-span-5" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{row.name}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.executions}</p>
              <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{money(row.revenue)}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text }}>{money(row.executions ? row.revenue / row.executions : 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          MIESIĄCE — USŁUGI {selectedYear}
        </p>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {head(['Miesiąc', 'Sesje', 'Przychód'], 'grid-cols-12')}
          {monthly.length === 0 ? empty('BRAK DANYCH') : monthly.map(row => (
            <div key={row.name} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p className="col-span-6" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{row.name}</p>
              <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.sessions}</p>
              <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{money(row.revenue)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}