import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { setShopCurrency } from '@/lib/shop';

// Ustawienia sklepu pobierane raz na sesję i współdzielone przez wszystkie widoki.
let cache = null;
let pending = null;

const load = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => {
        cache = list[0] || { key: 'default' };
        setShopCurrency(cache.currency);
        return cache;
      })
      .catch(() => {
        cache = { key: 'default' };
        return cache;
      });
  }
  return pending;
};

export const invalidateShopSettings = () => {
  cache = null;
  pending = null;
};

export default function useShopSettings() {
  const [settings, setSettings] = useState(cache || {});

  useEffect(() => {
    let active = true;
    load().then(s => { if (active) setSettings(s); });
    return () => { active = false; };
  }, []);

  return settings;
}