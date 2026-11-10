// Shared helpers for the settlement flow: per-line discounts and commission rules.
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const discountOf = (base, type, value) => {
  const b = Math.max(0, Number(base) || 0);
  const v = Math.max(0, Number(value) || 0);
  if (type === 'percent') return r2(b * Math.min(100, v) / 100);
  if (type === 'amount') return r2(Math.min(b, v));
  return 0;
};

export const afterDiscount = (base, type, value) => r2(Math.max(0, (Number(base) || 0) - discountOf(base, type, value)));

// Category rule wins over the shop-wide default ('inherit' falls back).
export const resolveCommission = (settings, category) => {
  const cType = category?.commission_type;
  if (cType && cType !== 'inherit') {
    return { type: cType, value: Number(category?.commission_value) || 0 };
  }
  return {
    type: settings?.product_commission_type || 'none',
    value: Number(settings?.product_commission_value) || 0,
  };
};

export const commissionFor = (items, settings, categoryById) => {
  return r2(items.reduce((sum, item) => {
    const rule = resolveCommission(settings, categoryById.get(item.category_id));
    if (rule.type === 'none' || rule.value <= 0) return sum;
    const qty = Number(item.qty) || 1;
    if (rule.type === 'percent') return sum + (Number(item.price) || 0) * qty * rule.value / 100;
    return sum + qty * rule.value;
  }, 0));
};