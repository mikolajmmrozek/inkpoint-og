import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Ustawienia ofert pobierane raz na sesję i współdzielone przez wszystkie widoki.
let cache = null;
let pending = null;

const load = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = base44.entities.EventSettings.filter({ key: 'default' })
      .then(list => {
        cache = list[0] || { key: 'default' };
        return cache;
      })
      .catch(() => {
        cache = { key: 'default' };
        return cache;
      });
  }
  return pending;
};

export const invalidateEventSettings = () => {
  cache = null;
  pending = null;
};

export default function useEventSettings() {
  const [settings, setSettings] = useState(cache || {});

  useEffect(() => {
    let active = true;
    load().then(s => { if (active) setSettings(s); });
    return () => { active = false; };
  }, []);

  return settings;
}