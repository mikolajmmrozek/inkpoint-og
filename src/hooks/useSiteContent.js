import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_NAV_ORDER, normalizeNavOrder } from '@/lib/siteNav';

const DEFAULTS = { show_blog: true, show_faq: true, show_shop: true, show_booking: true, show_events: true };
const STORAGE_KEY = 'site-content-cache';

// Kolejność nawigacji trzymamy także lokalnie, żeby pasek menu i stopka
// nie przeskakiwały po wczytaniu ustawień z bazy (najpierw domyślna, potem zapisana).
let cached = null;
try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw) {
    const parsed = JSON.parse(raw);
    cached = {
      content: { ...DEFAULTS, ...(parsed.content || {}) },
      navOrder: normalizeNavOrder(parsed.nav_order),
    };
  }
} catch {
  cached = null;
}

function store(content, navOrder) {
  cached = { content, navOrder };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ content, nav_order: navOrder }));
  } catch {
    // brak dostępu do localStorage — zostaje cache w pamięci
  }
}

export default function useSiteContent() {
  const [content, setContent] = useState(cached?.content || DEFAULTS);
  const [navOrder, setNavOrder] = useState(cached?.navOrder || DEFAULT_NAV_ORDER);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'content' })
      .then(list => {
        const r = list[0];
        if (!r) return;
        const nextContent = {
          show_blog: r.show_blog !== false,
          show_faq: r.show_faq !== false,
          show_shop: r.show_shop !== false,
          show_booking: r.show_booking !== false,
          show_events: r.show_events !== false,
        };
        const nextOrder = Array.isArray(r.nav_order) && r.nav_order.length > 0 ? r.nav_order : DEFAULT_NAV_ORDER;
        store(nextContent, nextOrder);
        setContent(nextContent);
        setNavOrder(nextOrder);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { content, navOrder, loading };
}