// Wspólna obsługa sprzedaży sklepowej (bez sesji) — używana przez Gatekeeperów
// (admin i artysta) oraz przez funkcję recordShopSale z panelu.
// Sprzedaż zapisuje się jako rozliczona pozycja w Booking (is_shop_sale = true),
// dzięki czemu automatycznie: zdejmuje stan magazynowy, zapisuje ruch magazynowy,
// nalicza prowizję pracownika i wchodzi do statystyk sklepu.
import { genSessionId } from './gatekeeperData.ts';

export const r2 = (v: any) => Math.round((Number(v) || 0) * 100) / 100;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function cleanSaleItems(items: any[]) {
  return (Array.isArray(items) ? items : [])
    .filter((i) => i && (i.product_id || i.sku) && Number(i.qty) > 0)
    .map((i) => ({
      product_id: i.product_id ? String(i.product_id) : '',
      sku: i.sku ? String(i.sku).trim() : '',
      variant_key: i.variant_key ? String(i.variant_key) : '',
      qty: Math.max(1, Math.round(Number(i.qty) || 1)),
      price: i.price != null && i.price !== '' ? r2(i.price) : null,
    }));
}

const asList = (res: any) => (Array.isArray(res) ? res : (res?.items || []));

// Pozycje sprzedaży z cenami z katalogu + kwota razem.
export async function previewSale(base44: any, items: any[]) {
  const clean = cleanSaleItems(items);
  if (clean.length === 0) throw new Error('Brak produktów w sprzedaży — podaj items: [{product_id, qty}] albo [{sku, qty}].');
  const ids = [...new Set(clean.map((i) => i.product_id).filter(Boolean))];
  const products = ids.length ? await base44.asServiceRole.entities.ShopProduct.filter({ id: { $in: ids } }) : [];
  const byId = new Map((products || []).map((p: any) => [p.id, p]));

  // SKU = kod kreskowy: produktu albo wariantu. Sprzedaż może wskazać sam kod zamiast id.
  let catalog: any[] = [];
  if (clean.some((i) => !i.product_id && i.sku)) {
    catalog = asList(await base44.asServiceRole.entities.ShopProduct.filter({}, { limit: 500 }));
  }
  const bySku = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code) return null;
    for (const p of catalog) {
      if (String(p.sku || '').trim() === code) return { product: p, variantKey: '' };
      const v = (p.variants || []).find((x: any) => String(x.sku || '').trim() === code);
      if (v) return { product: p, variantKey: v.key };
    }
    return null;
  };

  const lines = clean.map((i) => {
    let product: any = i.product_id ? byId.get(i.product_id) : null;
    let variantKey = i.variant_key;
    if (!product && i.sku) {
      const hit = bySku(i.sku);
      if (hit) {
        product = hit.product;
        if (!variantKey) variantKey = hit.variantKey;
      }
    }
    if (!product) throw new Error(`Produkt ${i.product_id || i.sku} nie istnieje w katalogu.`);
    const variant = variantKey ? (product.variants || []).find((v: any) => v.key === variantKey) : null;
    if (variantKey && !variant) throw new Error(`Produkt ${product.name} nie ma wariantu "${variantKey}".`);
    const unit = r2(variant ? variant.price : product.price);
    return {
      product_id: product.id,
      name: product.name,
      variant_key: variantKey,
      variant_label: variant ? (variant.options || []).map((o: any) => o.value).join(' / ') : '',
      qty: i.qty,
      unit_price: unit,
      price: i.price != null ? i.price : unit,
      stock: variantKey ? Number(variant?.stock ?? 0) : (product.unlimited_stock ? null : Number(product.stock ?? 0)),
    };
  });

  const total = r2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  return { lines, total };
}

// Płatności: domyślnie całość gotówką; suma musi równać się kwocie sprzedaży.
export function normalizePayments(payments: any[], total: number) {
  const list = (Array.isArray(payments) ? payments : [])
    .map((p) => ({ method: String(p?.method || ''), amount: r2(p?.amount) }))
    .filter((p) => ['cash', 'card', 'voucher'].includes(p.method) && p.amount > 0);
  const final = list.length > 0 ? list : (total > 0 ? [{ method: 'cash', amount: total }] : []);
  const sum = r2(final.reduce((s, p) => s + p.amount, 0));
  if (r2(sum - total) !== 0) {
    throw new Error(`Suma wpłat (${sum} PLN) musi być równa kwocie sprzedaży (${total} PLN).`);
  }
  return final;
}

export async function recordSale(base44: any, { items, payments, clientName, artistId, artistName, seller }: any) {
  const { lines, total } = await previewSale(base44, items);
  if (total <= 0) throw new Error('Kwota sprzedaży musi być większa od zera.');
  const breakdown = normalizePayments(payments, total);

  const booking = await base44.asServiceRole.entities.Booking.create({
    session_id: genSessionId(),
    client_name: clientName || 'Sprzedaż sklepowa',
    session_date: todayIso(),
    artist_id: artistId || '',
    artist_name: artistName || '',
    source: 'dashboard',
    status: 'completed',
    is_shop_sale: true,
    estimated_price: total,
    admin_notes: seller ? `Sprzedaż sklepowa · ${seller}` : 'Sprzedaż sklepowa',
  });

  const res = await base44.functions.invoke('settleBookingSession', {
    booking_id: booking.id,
    final_amount: total,
    deposit_amount: 0,
    payment_breakdown: breakdown,
    sold_products: lines.map((l) => ({
      product_id: l.product_id,
      variant_key: l.variant_key,
      variant_label: l.variant_label,
      qty: l.qty,
      price: l.price,
    })),
    additional_services: [],
  });

  const settled = res?.data?.booking;
  if (!settled) {
    throw new Error(res?.data?.error || 'Nie udało się zapisać sprzedaży.');
  }

  return {
    booking: settled,
    total,
    payments: breakdown,
    lines: lines.map(({ stock, ...rest }: any) => rest),
  };
}