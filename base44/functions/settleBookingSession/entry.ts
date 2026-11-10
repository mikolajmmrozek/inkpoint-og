import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n) => Math.round(num(n) * 100) / 100;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'artist') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id;
    if (!bookingId) return Response.json({ error: 'booking_id is required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!booking) return Response.json({ error: 'Not found' }, { status: 404 });

    const actorName = user.full_name || user.email || 'Pracownik';
    const nowIso = new Date().toISOString();

    // ---------- 1. Produkty: ceny i koszty bierzemy z katalogu ----------
    const incoming = Array.isArray(body.sold_products) ? body.sold_products : [];
    const productIds = [...new Set(incoming.map((p) => p.product_id).filter(Boolean))];
    const catalog = productIds.length
      ? await base44.asServiceRole.entities.ShopProduct.filter({ id: { $in: productIds } })
      : [];
    const catalogById = new Map(catalog.map((p) => [p.id, p]));

    const soldProducts = incoming
      .map((item) => {
        const product = catalogById.get(item.product_id);
        if (!product) return null;
        const qty = Math.max(0, Math.round(num(item.qty, 0)));
        if (qty === 0) return null;
        const variantKey = item.variant_key || '';
        const variant = variantKey ? (product.variants || []).find((v) => v.key === variantKey) : null;
        const catalogPrice = round2(variant ? variant.price : product.price);
        return {
          product_id: product.id,
          name: product.name,
          variant_key: variantKey,
          variant_label: item.variant_label || (variant ? (variant.options || []).map((o) => o.value).join(' / ') : ''),
          qty,
          unit_price: catalogPrice,
          price: round2(item.price != null ? item.price : catalogPrice),
          cost: num(product.cost, 0),
          cost_known: num(product.cost, 0) > 0,
        };
      })
      .filter(Boolean);

    // ---------- 2. Usługi dodatkowe (bez terminu, bez konfliktu) ----------
    const extra = Array.isArray(body.additional_services) ? body.additional_services : [];
    const extraIds = [...new Set(extra.map((s) => s.service_id).filter(Boolean))];
    const services = extraIds.length
      ? await base44.asServiceRole.entities.Service.filter({ id: { $in: extraIds } })
      : [];
    const serviceById = new Map(services.map((s) => [s.id, s]));

    const additionalServices = extra
      .map((item) => {
        const service = serviceById.get(item.service_id);
        if (!service) return null;
        return {
          service_id: service.id,
          name: service.name,
          category: service.category || '',
          price: round2(item.price),
          artist_id: item.artist_id || booking.artist_id || '',
          artist_name: item.artist_name || booking.artist_name || '',
        };
      })
      .filter(Boolean);

    // ---------- 3. Prowizja: jedna wspólna stawka dla wszystkich ----------
    const settingsList = await base44.asServiceRole.entities.ShopSettings.filter({ key: 'default' });
    const settings = settingsList[0] || {};
    const commissionType = settings.product_commission_type || 'none';
    const commissionValue = num(settings.product_commission_value, 0);
    const productsTotal = round2(soldProducts.reduce((s, p) => s + p.price * p.qty, 0));
    const productsCount = soldProducts.reduce((s, p) => s + p.qty, 0);
    let commission = 0;
    if (commissionType === 'percent') commission = round2(productsTotal * commissionValue / 100);
    else if (commissionType === 'amount') commission = round2(productsCount * commissionValue);

    // ---------- 4. Magazyn: korygujemy tylko RÓŻNICĘ względem poprzedniego zapisu ----------
    const cancelInventory = body.cancel_inventory === true;
    const previous = Array.isArray(booking.sold_products) ? booking.sold_products : [];

    const keyOf = (p) => `${p.product_id}||${p.variant_key || ''}`;
    const prevQty = new Map();
    previous.forEach((p) => prevQty.set(keyOf(p), (prevQty.get(keyOf(p)) || 0) + num(p.qty, 0)));
    const nextQty = new Map();
    if (!cancelInventory) {
      soldProducts.forEach((p) => nextQty.set(keyOf(p), (nextQty.get(keyOf(p)) || 0) + p.qty));
    }

    const allKeys = new Set([...prevQty.keys(), ...nextQty.keys()]);
    const movementIds = [];
    const touchedProducts = new Map();

    for (const key of allKeys) {
      const before = prevQty.get(key) || 0;
      const after = nextQty.get(key) || 0;
      const diff = before - after; // dodatnie = wraca na stan
      if (diff === 0) continue;

      const [productId, variantKey] = key.split('||');
      const product = touchedProducts.get(productId)
        || catalogById.get(productId)
        || await base44.asServiceRole.entities.ShopProduct.get(productId).catch(() => null);
      if (!product) continue;
      touchedProducts.set(productId, product);

      if (variantKey) {
        const variants = (product.variants || []).map((v) => (
          v.key === variantKey ? { ...v, stock: Math.max(0, num(v.stock, 0) + diff) } : v
        ));
        await base44.asServiceRole.entities.ShopProduct.update(product.id, { variants });
        product.variants = variants;
      } else {
        const nextStock = Math.max(0, num(product.stock, 0) + diff);
        await base44.asServiceRole.entities.ShopProduct.update(product.id, { stock: nextStock });
        product.stock = nextStock;
      }

      const movement = await base44.asServiceRole.entities.StockMovement.create({
        product_id: productId,
        product_name: product.name || '',
        variant_key: variantKey,
        delta: diff,
        reason: cancelInventory ? 'settlement_cancel' : (booking.stock_applied ? 'settlement_edit' : 'settlement'),
        booking_id: booking.id,
        booking_session_id: booking.session_id || '',
        actor_name: actorName,
        actor_id: user.id,
      });
      movementIds.push(movement?.id);
    }

    // ---------- 5. Zapis rozliczenia ----------
    const finalAmount = round2(body.final_amount);
    const depositAmount = round2(body.deposit_amount);
    const breakdown = (Array.isArray(body.payment_breakdown) ? body.payment_breakdown : [])
      .map((p) => ({ method: p.method, amount: round2(p.amount) }))
      .filter((p) => p.amount > 0);

    const updates = {
      final_amount: finalAmount,
      estimated_price: finalAmount,
      deposit_amount: depositAmount,
      deposit_paid: depositAmount > 0,
      payment_breakdown: breakdown,
      sold_products: cancelInventory ? [] : soldProducts,
      additional_services: cancelInventory ? [] : additionalServices,
      products_total: cancelInventory ? 0 : productsTotal,
      services_total: cancelInventory ? 0 : round2(additionalServices.reduce((s, x) => s + x.price, 0)),
      products_commission: cancelInventory ? 0 : commission,
      stock_applied: !cancelInventory && soldProducts.length > 0,
      is_settled: !cancelInventory,
      settled_by_id: user.id,
      settled_by_name: actorName,
      settled_date: nowIso,
      status: cancelInventory ? 'cancelled' : 'completed',
    };

    await base44.asServiceRole.entities.Booking.update(booking.id, updates);

    return Response.json({
      booking: { ...booking, ...updates },
      stock_movements: movementIds.length,
      commission,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}