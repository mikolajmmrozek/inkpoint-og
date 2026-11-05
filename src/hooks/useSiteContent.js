import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULTS = { show_blog: true, show_faq: true, show_shop: true, show_booking: true };

export default function useSiteContent() {
  const [content, setContent] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'content' })
      .then(list => {
        const r = list[0];
        if (r) {
          setContent({
            show_blog: r.show_blog !== false,
            show_faq: r.show_faq !== false,
            show_shop: r.show_shop !== false,
            show_booking: r.show_booking !== false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { content, loading };
}