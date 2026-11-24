// Wspólna konfiguracja zakładek strony publicznej.
// Kolejność zakładek ustawia się przeciąganiem kart w Ustawieniach → Zawartość strony.
// Home jest zawsze pierwszy, Kontakt zawsze ostatni.
export const NAV_TABS = [
  { key: 'artists', label: 'Artyści', href: '/artists' },
  { key: 'shop', label: 'Sklep', href: '/sklep', field: 'show_shop' },
  { key: 'blog', label: 'Blog', href: '/blog', field: 'show_blog' },
  { key: 'faq', label: 'FAQ', href: '/faq', field: 'show_faq' },
];

export const DEFAULT_NAV_ORDER = NAV_TABS.map(t => t.key);

// Uzupełnia brakujące klucze i odrzuca nieznane, żeby kolejność była zawsze pełna.
export function normalizeNavOrder(order) {
  const saved = (Array.isArray(order) ? order : []).filter(key => NAV_TABS.some(t => t.key === key));
  const missing = DEFAULT_NAV_ORDER.filter(key => !saved.includes(key));
  return [...saved, ...missing];
}

// Pełna lista linków nawigacji w zapisanej kolejności, z pominięciem ukrytych sekcji.
export function buildNavLinks(order, content = {}) {
  const tabs = normalizeNavOrder(order).map(key => NAV_TABS.find(t => t.key === key));
  return [
    { href: '/', label: 'Home' },
    ...tabs
      .filter(tab => (tab.field ? content[tab.field] !== false : true))
      .map(tab => ({ href: tab.href, label: tab.label })),
    { href: '/contact', label: 'Kontakt' },
  ];
}