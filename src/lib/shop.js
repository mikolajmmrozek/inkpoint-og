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
    step: step > 0 ? step : 10,
  };
};

export const productStock = (product) => {
  if (product?.unlimited_stock) return null;
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

  const options = selected.length > 0
    ? selected.flatMap(form => {
      const base = [{ name: form.name, cost: Number(form.cost) || 0, delivery_time: form.delivery_time || '', international: false, pickup: false }];
      const foreign = form.international
        ? (form.international_variants || [])
          .filter(v => (v?.label || '').trim())
          .map(v => ({ name: `${form.name} · ${v.label.trim()}`, cost: Number(v.cost) || 0, delivery_time: v.delivery_time || form.delivery_time || '', international: true, pickup: false }))
        : [];
      return [...base, ...foreign];
    })
    : (Array.isArray(product?.shipping_options) ? product.shipping_options : [])
      .filter(o => (o?.name || '').trim())
      .map(o => ({ name: o.name.trim(), cost: Number(o.cost) || 0, delivery_time: '', international: false, pickup: false }));

  if (product?.pickup_in_studio) {
    options.push({ name: 'Odbiór w studio', cost: 0, delivery_time: '', international: false, pickup: true });
  }
  return options;
};

// Podsumowanie dostawy: jedna forma — jej cena i czas; kilka form — „od <najniższa>”.
export const shippingSummary = (product, forms = []) => {
  const options = shippingOptionsOf(product, forms);
  if (options.length === 0) {
    const legacy = Number(product?.shipping_cost) || 0;
    return { cost: legacy, text: legacy > 0 ? money(legacy) : 'gratis', delivery: '', freePickup: false };
  }
  const min = Math.min(...options.map(o => Number(o.cost) || 0));
  return {
    cost: min,
    text: options.length === 1
      ? (min > 0 ? money(min) : 'gratis')
      : min > 0 ? `od ${money(min)}` : 'darmowa dostawa',
    delivery: options.length === 1 ? (options[0].delivery_time || '') : '',
    freePickup: options.some(o => o.pickup),
  };
};

// Dostawa koszyka: najwyższy koszt dostawy wśród pozycji (jedna przesyłka),
// a gdy pozycje nie mają własnej dostawy — koszt z ustawień sklepu.
export const cartShipping = (items, settings = {}) => {
  const withOwn = (items || []).filter(i => typeof i.shipping_cost === 'number');
  if (withOwn.length === 0) return Number(settings.shipping_cost) || 0;
  return withOwn.reduce((max, i) => Math.max(max, Number(i.shipping_cost) || 0), 0);
};

// ── Zniżka sklepowa ────────────────────────────────────────────────────────
// Admin obniża cenę produktu kwotowo (np. 10 zł) albo procentowo (np. 10%).
// Zniżka działa na cenę sztuki (produktu lub wariantu), więc obniża też
// wielosztuki, koszyk i zamówienie.
export const discountOf = (product) => {
  const value = Math.max(0, Number(product?.discount_value) || 0);
  const type = product?.discount_type === 'percent' || product?.discount_type === 'amount'
    ? product.discount_type
    : 'none';
  return type === 'none' || value <= 0 ? { type: 'none', value: 0 } : { type, value };
};

export const hasDiscount = (product) => discountOf(product).type !== 'none';

export const applyDiscount = (price, product) => {
  const base = Number(price) || 0;
  const { type, value } = discountOf(product);
  if (type === 'percent') return Math.round(base * (1 - Math.min(100, value) / 100) * 100) / 100;
  if (type === 'amount') return Math.max(0, Math.round((base - value) * 100) / 100);
  return base;
};

// Cena katalogowa jednej sztuki (wariant albo cena główna) — przed zniżką.
export const listPrice = (product, variant = null) => {
  const raw = variant && Number(variant.price) > 0 ? Number(variant.price) : Number(product?.price) || 0;
  return raw;
};

// Cena jednej sztuki po zniżce sklepowej.
export const unitPrice = (product, variant = null) => applyDiscount(listPrice(product, variant), product);

export const priceRange = (product) => {
  const variants = variantsOf(product).filter(v => v.is_active !== false);
  if (variants.length === 0) {
    const own = unitPrice(product);
    return { min: own, max: own };
  }
  const prices = variants.map(v => unitPrice(product, v));
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

// ── Wielosztuki (pakiety) ───────────────────────────────────────────────────
// Opcjonalne pakiety na produkcie (np. 2 szt. w komplecie). Korzystają ze wspólnego
// stanu magazynowego — pakiet zjada tyle sztuk, ile ma w środku.
// Pakiety są przypisane do wariantu (każdy wariant ma własne wielosztuki);
// produkty bez wariantów korzystają z listy przy produkcie.
export const multipacksOf = (product, variant = null) => {
  const variantPacks = Array.isArray(variant?.multipacks) ? variant.multipacks : [];
  const productPacks = Array.isArray(product?.multipacks) ? product.multipacks : [];
  const source = variantPacks.length > 0 ? variantPacks : (variant ? [] : productPacks);
  return source.filter(p => Number(p?.units) > 1);
};

export const packLabel = (pack) => {
  const units = Number(pack?.units) || 1;
  return (pack?.label || '').trim() || `${units} szt. w komplecie`;
};

// Cena pakietu liczona od ceny wybranej sztuki (wariantu lub ceny produktu):
// percent = cena × sztuki minus zniżka, manual = kwota wpisana ręcznie.
export const packPrice = (basePrice, pack) => {
  if (!pack) return Number(basePrice) || 0;
  const units = Number(pack.units) || 1;
  if (pack.pricing === 'manual') return Math.max(0, Number(pack.price) || 0);
  const discount = Math.min(100, Math.max(0, Number(pack.discount_percent) || 0));
  const raw = (Number(basePrice) || 0) * units * (1 - discount / 100);
  return Math.round(raw * 100) / 100;
};

export const packUnits = (pack) => (pack ? Math.max(2, Number(pack.units) || 2) : 1);

// Cena produktu do wyświetlenia: gdy są warianty — zawsze „od najtańszego wariantu”,
// gdy wariantów brak — cena nadrzędna produktu.
export const displayPrice = (product) => {
  const range = priceRange(product);
  const variants = variantsOf(product).filter(v => v.is_active !== false);
  const hasVariants = variants.length > 0;
  const was = !hasDiscount(product)
    ? 0
    : hasVariants
      ? Math.min(...variants.map(v => listPrice(product, v)))
      : listPrice(product);
  return {
    from: hasVariants,
    min: range.min,
    max: range.max,
    was,
    text: hasVariants ? `od ${money(range.min)}` : money(range.min),
  };
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