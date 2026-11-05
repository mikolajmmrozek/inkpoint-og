export const money = (n) =>
  `${Number(n || 0).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;

export const ORDER_STATUS = {
  pending: { label: 'Nowe', color: 'var(--brand)' },
  processing: { label: 'W realizacji', color: '#2563eb' },
  shipped: { label: 'Wysłane', color: '#f59e0b' },
  completed: { label: 'Zrealizowane', color: '#16a34a' },
  cancelled: { label: 'Anulowane', color: '#9ca3af' },
  returned: { label: 'Zwrot', color: '#ef4444' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'Nieopłacone', color: '#f59e0b' },
  paid: { label: 'Opłacone', color: '#16a34a' },
  refunded: { label: 'Zwrócone', color: '#9ca3af' },
};

export const RETURN_STATUS = {
  requested: { label: 'Zgłoszony', color: '#f59e0b' },
  approved: { label: 'Zaakceptowany', color: '#2563eb' },
  rejected: { label: 'Odrzucony', color: '#ef4444' },
  received: { label: 'Otrzymany', color: '#7c3aed' },
  refunded: { label: 'Zwrócony', color: '#16a34a' },
};

export const variantLabel = (variant) => {
  if (!variant) return 'Standard';
  const opts = Array.isArray(variant.options) ? variant.options : [];
  if (!opts.length) return 'Standard';
  return opts.map(o => `${o.name}: ${o.value}`).join(' · ');
};

export const variantsOf = (product) => (Array.isArray(product?.variants) ? product.variants : []);

export const isSoldOut = (product) => {
  const variants = variantsOf(product);
  if (variants.length === 0) return false;
  return variants.every(v => v.is_active === false || (Number(v.stock) || 0) <= 0);
};

export const totalStock = (product) =>
  variantsOf(product).reduce((sum, v) => sum + (v.is_active === false ? 0 : Number(v.stock) || 0), 0);

export const priceRange = (product) => {
  const variants = variantsOf(product).filter(v => v.is_active !== false);
  if (variants.length === 0) return { min: product.price, max: product.price };
  const prices = variants.map(v => Number(v.price) || Number(product.price) || 0);
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

export const slugify = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/[źż]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pl-PL') : '—');

export const SHOP_DOCS = [
  { key: 'shop_terms', label: 'Regulamin sklepu' },
  { key: 'shop_privacy', label: 'Polityka prywatności sklepu' },
  { key: 'shop_cookies', label: 'Polityka cookies sklepu' },
  { key: 'shop_order_form', label: 'Formularz zamówienia' },
  { key: 'shop_withdrawal_form', label: 'Formularz odstąpienia od umowy' },
  { key: 'shop_complaint_form', label: 'Formularz reklamacyjny' },
];