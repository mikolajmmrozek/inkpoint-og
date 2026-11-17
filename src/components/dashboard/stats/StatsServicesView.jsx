import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/shop';
import { sessionAmount } from '@/lib/settlement';
import { PAYMENT_METHODS, methodShare } from '@/lib/statsPayments';
import { MONTHS_PL, MONTHS_FULL, monthIndex, dayOfMonth, dayLabel } from '@/lib/statsDates';
import StatsPaymentChart from './StatsPaymentChart';
import StatsDailyTable from './StatsDailyTable';
import StatsPeriodPicker from './StatsPeriodPicker';

const CATEGORY_LABELS = { tattoo: 'Tattoo', studio: 'Studio', piercing: 'Piercing' };
const CATEGORY_TABS = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'tattoo', label: 'Tattoo' },
  { id: 'studio', label: 'Studio' },
  { id: 'piercing', label: 'Piercing' },
];

// Cena samej usługi głównej: kwota sesji bez produktów i usług dopisanych w rozliczeniu.
const mainServiceRevenue = (b) => Math.max(
  0,
  sessionAmount(b) - (Number(b.products_total) || 0) - (Number(b.services_total) || 0)
);

export default function StatsServicesView({ t, filtered, selectedYear }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  const [serviceCategories, setServiceCategories] = useState(new Map());
  const [category, setCategory] = useState('all');
  const [month, setMonth] = useState(new Date().getMonth());

  useEffect(() => {
    base44.entities.Service.list('-created_date', 500)
      .then(list => setServiceCategories(new Map(list.map(s => [s.id, s.category]))))
      .catch(() => setServiceCategories(new Map()));
  }, []);

  // Wszystkie wykonania usług: usługa główna sesji + każda usługa dopisana w rozliczeniu.
  const executions = useMemo(() => {
    const rows = [];
    filtered.forEach(b => {
      const svcCategory = serviceCategories.get(b.service_id) || b.additional_services?.[0]?.category || 'studio';
      rows.push({
        booking: b,
        name: b.service_name || 'Sesja bez usługi',
        category: svcCategory,
        revenue: mainServiceRevenue(b),
        date: b.session_date,
        artistName: b.artist_name || '—',
      });
      (b.additional_services || []).forEach(s => {
        if (!s?.name) return;
        rows.push({
          booking: b,
          name: s.name,
          category: s.category || svcCategory,
          revenue: Number(s.price) || 0,
          date: b.session_date,
          artistName: s.artist_name || b.artist_name || '—',
        });
      });
    });
    return rows;
  }, [filtered, serviceCategories]);

  const categoryCounts = useMemo(() => {
    const counts = { all: executions.length };
    executions.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return counts;
  }, [executions]);

  const scoped = useMemo(
    () => (category === 'all' ? executions : executions.filter(e => e.category === category)),
    [executions, category]
  );

  const totals = useMemo(() => {
    const revenue = scoped.reduce((s, e) => s + e.revenue, 0);
    const sessions = new Set(scoped.map(e => e.booking.id)).size;
    return {
      revenue,
      executions: scoped.length,
      sessions,
      avg: scoped.length ? revenue / scoped.length : 0,
    };
  }, [scoped]);

  // Wykres form płatności — przychód z usług rozdzielony wg udziału metody w sesji.
  const paymentData = useMemo(() => MONTHS_PL.map((name, mi) => {
    const rows = scoped.filter(e => monthIndex(e.date) === mi);
    const byMethod = (m) => rows.reduce((s, e) => s + e.revenue * methodShare(e.booking, m), 0);
    const row = { name };
    PAYMENT_METHODS.forEach(m => { row[m] = byMethod(m); });
    return row;
  }), [scoped]);

  // Zestawienie usług (cały rok, wybrana kategoria).
  const services = useMemo(() => {
    const map = new Map();
    scoped.forEach(e => {
      const row = map.get(e.name) || { name: e.name, category: e.category, executions: 0, revenue: 0 };
      row.executions += 1;
      row.revenue += e.revenue;
      map.set(e.name, row);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [scoped]);

  const monthExecutions = useMemo(
    () => (month === '' ? [] : scoped.filter(e => monthIndex(e.date) === month)),
    [scoped, month]
  );

  const dailyRows = useMemo(() => {
    const map = new Map();
    monthExecutions.forEach(e => {
      const day = dayOfMonth(e.date);
      if (!day) return;
      const row = map.get(day) || { label: dayLabel(day, month), count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += e.revenue;
      map.set(day, row);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);
  }, [monthExecutions, month]);

  const artistRows = useMemo(() => {
    const map = new Map();
    monthExecutions.forEach(e => {
      const row = map.get(e.artistName) || { label: e.artistName, count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += e.revenue;
      map.set(e.artistName, row);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [monthExecutions]);

  const monthlyRows = useMemo(() => MONTHS_PL
    .map((name, mi) => {
      const rows = scoped.filter(e => monthIndex(e.date) === mi);
      return { label: MONTHS_FULL[mi], count: rows.length, revenue: rows.reduce((s, e) => s + e.revenue, 0) };
    })
    .filter(r => r.count > 0), [scoped]);

  const KPICard = ({ label, value, sub }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...display, fontSize: '2.2rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div>
      {/* Kategorie usług */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_TABS.map(tab => {
          const active = category === tab.id;
          const count = categoryCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className="flex items-center gap-2"
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}
            >
              {tab.label}
              <span style={{ fontSize: '10px', color: active ? 'var(--brand)' : t.muted, opacity: 0.9 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KPICard label={`Wykonania · ${CATEGORY_TABS.find(c => c.id === category)?.label}`} value={totals.executions} sub={`${services.length} rodzajów`} />
        <KPICard label="Przychód usług" value={money(totals.revenue)} sub={`${totals.sessions} sesji`} />
        <KPICard label="Sesje" value={totals.sessions} />
        <KPICard label="Średnia za wykonanie" value={money(totals.avg)} />
      </div>

      <StatsPaymentChart
        t={t}
        title={`FORMY PŁATNOŚCI — USŁUGI ${selectedYear}`}
        data={paymentData}
      />

      <div className="mb-8">
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          USŁUGI — PRZYCHÓD {selectedYear}
        </p>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Usługa', 'Kategoria', 'Wykonania', 'Przychód', 'Średnia'].map((h, i) => (
              <p key={h} className={i === 0 ? 'col-span-4' : i === 1 ? 'col-span-2' : i === 4 ? 'col-span-2 text-right' : 'col-span-2'} style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {services.length === 0 ? (
            <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>BRAK DANYCH</p></div>
          ) : services.map(row => (
            <div key={row.name} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p className="col-span-4" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{row.name}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{CATEGORY_LABELS[row.category] || '—'}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.executions}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{money(row.revenue)}</p>
              <p className="col-span-2 text-right" style={{ ...mono, fontSize: '11px', color: t.text }}>{money(row.executions ? row.revenue / row.executions : 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <StatsPeriodPicker t={t} value={month} onChange={setMonth} />

      {month !== '' && (
        <>
          <StatsDailyTable
            t={t}
            title={`DZIENNIE — ${MONTHS_FULL[month].toUpperCase()} ${selectedYear}`}
            rows={dailyRows}
            firstLabel="Dzień"
            countLabel="Wykonania"
          />
          <StatsDailyTable
            t={t}
            title={`PER ARTYSTA — ${MONTHS_FULL[month].toUpperCase()} ${selectedYear}`}
            rows={artistRows}
            firstLabel="Artysta"
            countLabel="Wykonania"
          />
        </>
      )}

      <StatsDailyTable
        t={t}
        title={`MIESIĄCE — USŁUGI ${selectedYear}`}
        rows={monthlyRows}
        firstLabel="Miesiąc"
        countLabel="Wykonania"
      />
    </div>
  );
}