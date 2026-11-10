import { useState } from 'react';
import { useTheme } from './Dashboard';
import { ShoppingBag, Package, Layers, RotateCcw, Truck, SlidersHorizontal } from 'lucide-react';
import ShopOrdersPanel from '@/components/dashboard/shop/ShopOrdersPanel';
import ShopProductsPanel from '@/components/dashboard/shop/ShopProductsPanel';
import ShopCatalogPanel from '@/components/dashboard/shop/ShopCatalogPanel';
import ShopFiltersPanel from '@/components/dashboard/shop/ShopFiltersPanel';
import ShopReturnsPanel from '@/components/dashboard/shop/ShopReturnsPanel';
import ShopShippingPanel from '@/components/dashboard/shop/ShopShippingPanel';
import { shopTheme, mono } from '@/components/dashboard/shop/shopTheme';

const TABS = [
  { id: 'orders', label: 'Zamówienia', icon: ShoppingBag },
  { id: 'products', label: 'Produkty', icon: Package },
  { id: 'catalog', label: 'Katalog', icon: Layers },
  { id: 'filters', label: 'Filtry', icon: SlidersHorizontal },
  { id: 'shipping', label: 'Wysyłka', icon: Truck },
  { id: 'returns', label: 'Zwroty', icon: RotateCcw },
];

export default function DashboardShop() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [tab, setTab] = useState('orders');

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
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
    </div>
  );
}