import { useMemo, useState } from 'react';
import { MONTHS_PL, MONTHS_FULL, monthIndex, dayOfMonth, dayLabel } from '@/lib/statsDates';
import StatsDailyTable from './StatsDailyTable';
import StatsPeriodPicker from './StatsPeriodPicker';

const orderRevenue = (o) => (o.items || []).reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0) * (Number(i.units) || 1), 0);
const orderUnits = (o) => (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.units) || 1), 0);

// Dzienne i miesięczne statystyki sprzedaży produktów: zamówienia online + produkty w sesjach.
export default function StatsShopCalendar({ t, shopOrders, filtered, selectedYear }) {
  const [month, setMonth] = useState(new Date().getMonth());

  const sales = useMemo(() => {
    const rows = [];
    filtered.forEach(b => (b.sold_products || []).forEach(p => {
      const qty = Number(p.qty) || 0;
      rows.push({ date: b.session_date, count: qty, revenue: (Number(p.price) || 0) * qty });
    }));
    shopOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      const date = (o.created_date || '').slice(0, 10);
      if (!date || Number(date.slice(0, 4)) !== selectedYear) return;
      rows.push({ date, count: orderUnits(o), revenue: orderRevenue(o) });
    });
    return rows;
  }, [filtered, shopOrders, selectedYear]);

  const dailyRows = useMemo(() => {
    if (month === '') return [];
    const map = new Map();
    sales.filter(s => monthIndex(s.date) === month).forEach(s => {
      const day = dayOfMonth(s.date);
      if (!day) return;
      const row = map.get(day) || { label: dayLabel(day, month), count: 0, revenue: 0 };
      row.count += s.count;
      row.revenue += s.revenue;
      map.set(day, row);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);
  }, [sales, month]);

  const monthlyRows = useMemo(() => MONTHS_PL
    .map((name, mi) => {
      const rows = sales.filter(s => monthIndex(s.date) === mi);
      return {
        label: MONTHS_FULL[mi],
        count: rows.reduce((s, r) => s + r.count, 0),
        revenue: rows.reduce((s, r) => s + r.revenue, 0),
      };
    })
    .filter(r => r.count > 0 || r.revenue > 0), [sales]);

  return (
    <div>
      <StatsPeriodPicker t={t} value={month} onChange={setMonth} />

      {month !== '' && (
        <StatsDailyTable
          t={t}
          title={`DZIENNIE — PRODUKTY · ${MONTHS_FULL[month].toUpperCase()} ${selectedYear}`}
          rows={dailyRows}
          firstLabel="Dzień"
          countLabel="Sztuki"
        />
      )}

      <StatsDailyTable
        t={t}
        title={`MIESIĄCE — PRODUKTY ${selectedYear}`}
        rows={monthlyRows}
        firstLabel="Miesiąc"
        countLabel="Sztuki"
      />
    </div>
  );
}