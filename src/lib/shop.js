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

// Dostępna liczba sztuk: suma wariantów albo stan produktu.
// null = produkt nie ma prowadzonego stanu (sprzedawany bez limitu).
// Sposób ceny: 'fixed' = stała cena i warianty, 'slider' = klient wybiera kwotę
export const pricingModeOf = (product) => (product?.pricing_mode === 'slider' || product?.is_voucher ? 'slider' : 'fixed');

export const priceSliderOf = (product) => {
  const min = Number(product?.slider_min);
  const max = Number(product?.slider_max);
  const step = Number(product?.slider_step);
  return {
    min: min > 0 ? min : 100,
    max: max > min ? max : (min > 0 ? min + 100 : 2000),
    step: step > 0 ? step : 50,
  };
};

export const productStock = (product) => {
  if (pricingModeOf(product) === 'slider') return null;
  const variants = variantsOf(product).filter(v => v.is_active !== false);
  if (variants.length > 0) return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  return typeof product?.stock === 'number' ? product.stock : null;
};

export const AVAILABILITY = {
  in_stock: { label: 'DOSTĘPNE', color: '#16a34a' },
  soon: { label: 'WKRÓTCE DOSTĘPNE', color: '#f59e0b' },
  sold_out: { label: 'WYPRZEDANE', color: '#9ca3af' },
};

// state: in_stock | soon (restock) | sold_out
export const availability = (product) => {
  const stock = productStock(product);
  if (stock === null) return { state: 'in_stock', stock: null };
  if (stock > 0) return { state: 'in_stock', stock };
  return product?.restock ? { state: 'soon', stock: 0 } : { state: 'sold_out', stock: 0 };
};

export const isSoldOut = (product) => availability(product).state === 'sold_out';
export const canBuy = (product) => availability(product).state === 'in_stock';
export const totalStock = (product) => productStock(product) ?? 0;

export const productShipping = (product) => ({
  cost: Number(product?.shipping_cost) || 0,
  info: (product?.shipping_info || '').trim(),
});

// Opcje dostawy produktu: formy wysyłki przypisane do produktu (z listy ShippingForm),
// a gdy ich brak — starsze opcje wpisane w produkcie. Forma z opcją zagraniczną
// dokłada swoje warianty ceny (np. „Paczkomat · Europa").
export const shippingOptionsOf = (product, forms = []) => {
  const picked = Array.isArray(product?.shipping_form_ids) ? product.shipping_form_ids : [];
  const byId = new Map((forms || []).map(f => [f.id, f]));
  const selected = picked.map(id => byId.get(id)).filter(Boolean);

  if (selected.length > 0) {
    return selected.flatMap(form => {
      const base = [{ name: form.name, cost: Number(form.cost) || 0, international: false }];
      const foreign = form.international
        ? (form.international_variants || [])
          .filter(v => (v?.label || '').trim())
          .map(v => ({ name: `${form.name} · ${v.label.trim()}`, cost: Number(v.cost) || 0, international: true }))
        : [];
      return [...base, ...foreign];
    });
  }

  return (Array.isArray(product?.shipping_options) ? product.shipping_options : [])
    .filter(o => (o?.name || '').trim())
    .map(o => ({ name: o.name.trim(), cost: Number(o.cost) || 0 }));
};

// Dostawa koszyka: najwyższy koszt dostawy wśród pozycji (jedna przesyłka),
// a gdy pozycje nie mają własnej dostawy — koszt z ustawień sklepu.
export const cartShipping = (items, settings = {}) => {
  const withOwn = (items || []).filter(i => typeof i.shipping_cost === 'number');
  if (withOwn.length === 0) return Number(settings.shipping_cost) || 0;
  return withOwn.reduce((max, i) => Math.max(max, Number(i.shipping_cost) || 0), 0);
};

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