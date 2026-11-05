import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useShopVisibility() {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => setVisible(list[0] ? list[0].is_visible !== false : true))
      .catch(() => setVisible(true))
      .finally(() => setLoading(false));
  }, []);

  return { visible, loading };
}