import { useState } from 'react';
import { useTheme } from './Dashboard';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, Layers, RotateCcw, Truck, SlidersHorizontal, Settings2, ExternalLink, BarChart2 } from 'lucide-react';
import ShopOrdersPanel from '@/components/dashboard/shop/ShopOrdersPanel';
import ShopProductsPanel from '@/components/dashboard/shop/ShopProductsPanel';
import ShopCatalogPanel from '@/components/dashboard/shop/ShopCatalogPanel';
import ShopFiltersPanel from '@/components/dashboard/shop/ShopFiltersPanel';
import ShopReturnsPanel from '@/components/dashboard/shop/ShopReturnsPanel';
import ShopShippingPanel from '@/components/dashboard/shop/ShopShippingPanel';
import ShopSettingsPanel from '@/components/dashboard/shop/ShopSettingsPanel';
import { shopTheme, mono } from '@/components/dashboard/shop/shopTheme';
import useShopSettings from '@/hooks/useShopSettings';

const TABS = [
  { id: 'orders', label: 'Zamówienia', icon: ShoppingBag },
  { id: 'products', label: 'Produkty', icon: Package },
  { id: 'catalog', label: 'Katalog', icon: Layers },
  { id: 'filters', label: 'Filtry', icon: SlidersHorizontal },
  { id: 'shipping', label: 'Wysyłka', icon: Truck },
  { id: 'returns', label: 'Zwroty', icon: RotateCcw },
  { id: 'settings', label: 'Ustawienia', icon: Settings2 },
];

export default function DashboardShop() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  useShopSettings();
  const [tab, setTab] = useState('orders');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <a
          href="/sklep"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            border: '0.5px solid var(--brand)',
            color: '#FFFFFF',
            background: 'var(--brand)',
            ...mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '9px 18px', borderRadius: 'var(--radius)',
            whiteSpace: 'nowrap',
          }}
          title="Otwórz sklep w nowej karcie"
        >
          <ExternalLink size={12} /> Zobacz sklep
        </a>

        <Link
          to="/dashboard/stats?view=shop"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            border: `0.5px solid ${t.border}`,
            color: t.muted,
            ...mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '9px 18px', borderRadius: 'var(--radius)',
            whiteSpace: 'nowrap', textDecoration: 'none',
          }}
          title="Statystyki sklepu — produkty, przychód i prowizje"
        >
          <BarChart2 size={12} /> Statystyki sklepu
        </Link>

        {TABS.map(tb => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)} className="flex items-center gap-2"
              style={{
                border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                color: active ? 'var(--brand)' : t.muted,
                background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                ...mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '9px 18px', cursor: 'pointer', borderRadius: 'var(--radius)',
              }}>
              <Icon size={12} /> {tb.label}
            </button>
          );
        })}
      </div>

      {tab === 'orders' && <ShopOrdersPanel />}
      {tab === 'products' && <ShopProductsPanel />}
      {tab === 'catalog' && <ShopCatalogPanel />}
      {tab === 'filters' && <ShopFiltersPanel />}
      {tab === 'shipping' && <ShopShippingPanel />}
      {tab === 'returns' && <ShopReturnsPanel />}
      {tab === 'settings' && <ShopSettingsPanel />}
    </div>
  );
}