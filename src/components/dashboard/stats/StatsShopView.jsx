import { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/shop';

export default function StatsShopView({ t, shopOrders, filtered, shopTotals }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    base44.entities.ShopCategory.list('order', 100).then(setCategories).catch(() => setCategories([]));
  }, []);

  const products = useMemo(() => {
    const map = new Map();
    const push = (name, qty, revenue, profit, costKnown) => {
      if (!name) return;
      const row = map.get(name) || { name, qty: 0, revenue: 0, profit: 0, known: 0 };
      row.qty += Math.max(0, Number(qty) || 0);
      row.revenue += Number(revenue) || 0;
      if (costKnown) row.profit += Number(profit) || 0;
      row.known += costKnown ? Math.max(0, Number(qty) || 0) : 0;
      map.set(name, row);
    };

    // Zamówienia online
    shopOrders
      .filter(o => o.status !== 'cancelled')
      .forEach(o => (o.items || []).forEach(i => {
        const units = (Number(i.quantity) || 0) * (Number(i.units) || 1);
        push(i.product_name, units, (Number(i.unit_price) || 0) * units, 0, false);
      }));

    // Produkty sprzedane w sesjach
    filtered.forEach(b => (b.sold_products || []).forEach(p => {
      const qty = Number(p.qty) || 0;
      push(p.name, qty, (Number(p.price) || 0) * qty, (Number(p.price) || 0) - (Number(p.cost) || 0), !!p.cost_known);
    }));

    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [shopOrders, filtered]);

  const revenueAll = products.reduce((s, p) => s + p.revenue, 0);

  const KPICard = ({ label, value, sub }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...display, fontSize: '2.2rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KPICard
          label="Przychód sklepu online"
          value={money(shopTotals.shopRevenue)}
          sub={`${shopTotals.ordersCount} zamówień · ${shopTotals.onlineUnits} szt.`}
        />
        <KPICard
          label="Sprzedaż w sesjach"
          value={money(shopTotals.productsRevenue)}
          sub={`${shopTotals.productsCount} szt.`}
        />
        <KPICard
          label="Prowizje pracowników"
          value={money(shopTotals.commission)}
          sub="wg stawek kategorii"
        />
        <KPICard
          label="Zysk (znany koszt)"
          value={money(shopTotals.profit)}
          sub={shopTotals.unknownCount > 0 ? `bez ${shopTotals.unknownCount} poz. o nieznanym koszcie` : 'wszystkie koszty znane'}
        />
      </div>

      <div className="mb-8">
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          PRODUKTY — PRZYCHÓD I ZYSK
        </p>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Produkt', 'Sztuki', 'Przychód', 'Udział', 'Zysk'].map((h, i) => (
              <p key={h} className={i === 0 ? 'col-span-4' : i === 4 ? 'col-span-3' : 'col-span-1'} style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {products.length === 0 ? (
            <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>BRAK SPRZEDAŻY PRODUKTÓW</p></div>
          ) : products.map(row => (
            <div key={row.name} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p className="col-span-4" style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
              <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.qty}</p>
              <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{money(row.revenue)}</p>
              <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.muted }}>{revenueAll ? `${Math.round(row.revenue / revenueAll * 100)}%` : '—'}</p>
              <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: row.known > 0 ? '#16a34a' : t.muted, fontWeight: 600 }}>
                {row.known > 0 ? money(row.profit) : 'brak kosztu'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          PROWIZJE WEDŁUG KATEGORII
        </p>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {categories.length === 0 ? (
            <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>BRAK KATEGORII</p></div>
          ) : categories.map(c => {
            const type = c.commission_type || 'inherit';
            const label = type === 'inherit' ? 'wspólna stawka sklepu'
              : type === 'none' ? 'brak prowizji'
                : type === 'percent' ? `${Number(c.commission_value) || 0}% od sprzedaży`
                  : `${money(c.commission_value)} / szt.`;
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{c.name}</p>
                <p style={{ ...mono, fontSize: '10px', color: type === 'inherit' ? t.muted : t.fuchsia, letterSpacing: '0.06em' }}>{label}</p>
              </div>
            );
          })}
        </div>
        <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '8px', lineHeight: 1.7 }}>
          Stawki kategorii ustawiasz w Sklep → Katalog → Kategorie. Obowiązują wszystkich pracowników.
        </p>
      </div>
    </div>
  );
}