import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const nowIso = () => new Date().toISOString();

function variantLabelOf(v) {
  if (!v) return 'Standard';
  const opts = Array.isArray(v.options) ? v.options : [];
  if (!opts.length) return 'Standard';
  return opts.map((o) => `${o.name}: ${o.value}`).join(' · ');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Musisz być zalogowany.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create';

    // ── Składanie zamówienia ────────────────────────────────────────────────
    if (action === 'create') {
      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) return Response.json({ error: 'Koszyk jest pusty.' }, { status: 400 });

      const ids = [...new Set(rawItems.map((i) => i.product_id).filter(Boolean))];
      const products = await base44.asServiceRole.entities.ShopProduct.filter({ id: { $in: ids } }).catch(() => []);
      const byId = {};
      products.forEach((p) => { byId[p.id] = p; });

      // Formy wysyłki przypisane do produktów (wspólna lista z dashboardu)
      const formIds = [...new Set(products.flatMap((p) => (Array.isArray(p.shipping_form_ids) ? p.shipping_form_ids : [])))];
      const forms = formIds.length > 0
        ? await base44.asServiceRole.entities.ShippingForm.filter({ id: { $in: formIds } }).catch(() => [])
        : [];
      const formsById = new Map(forms.map((f) => [f.id, f]));

      function shipOptionsFor(product) {
        const picked = Array.isArray(product.shipping_form_ids) ? product.shipping_form_ids : [];
        const selected = picked.map((id) => formsById.get(id)).filter(Boolean);
        if (selected.length > 0) {
          return selected.flatMap((form) => {
            const base = [{ name: form.name, cost: Number(form.cost) || 0 }];
            const foreign = form.international
              ? (form.international_variants || [])
                .filter((v) => (v?.label || '').trim())
                .map((v) => ({ name: `${form.name} · ${v.label.trim()}`, cost: Number(v.cost) || 0 }))
              : [];
            return [...base, ...foreign];
          });
        }
        return (Array.isArray(product.shipping_options) ? product.shipping_options : [])
          .filter((o) => (o.name || '').trim())
          .map((o) => ({ name: o.name, cost: Number(o.cost) || 0 }));
      }

      let subtotal = 0;
      const items = [];
      const stockUpdates = {};

      for (const raw of rawItems) {
        const product = byId[raw.product_id];
        if (!product || product.is_active === false) {
          return Response.json({ error: 'Produkt niedostępny. Odśwież koszyk.' }, { status: 400 });
        }
        const qty = Math.min(99, Math.max(1, parseInt(raw.quantity, 10) || 1));

        // Suwak ceny — klient wybiera kwotę; cena pochodzi z klucza „kwota:150"
        if (product.pricing_mode === 'slider' || product.is_voucher) {
          const min = Number(product.slider_min) > 0 ? Number(product.slider_min) : 100;
          const max = Number(product.slider_max) > min ? Number(product.slider_max) : 2000;
          const step = Number(product.slider_step) > 0 ? Number(product.slider_step) : 50;
          const match = /^kwota:(\d+)$/.exec(String(raw.variant_key || ''));
          const chosen = match ? parseInt(match[1], 10) : 0;
          if (!match || chosen < min || chosen > max || (chosen - min) % step !== 0) {
            return Response.json({ error: `Wybierz kwotę: od ${min} zł do ${max} zł, co ${step} zł.` }, { status: 400 });
          }
          subtotal = round2(subtotal + chosen * qty);

          const voucherShipOptions = shipOptionsFor(product);
          const chosenVoucherShip = voucherShipOptions.find((o) => o.name === raw.shipping_option) || voucherShipOptions[0] || null;
          const voucherShip = chosenVoucherShip
            ? Number(chosenVoucherShip.cost) || 0
            : (typeof product.shipping_cost === 'number' ? Number(product.shipping_cost) || 0 : null);

          items.push({
            product_id: product.id,
            product_name: product.name,
            slug: product.slug || '',
            image_url: product.image_url || '',
            variant_key: `kwota:${chosen}`,
            variant_label: `Kwota: ${chosen} zł`,
            unit_price: chosen,
            quantity: qty,
            shipping_option: chosenVoucherShip ? chosenVoucherShip.name : '',
            ...(typeof voucherShip === 'number' ? { shipping_cost: voucherShip } : {}),
          });
          continue;
        }

        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variant = variants.find((v) => v.key === raw.variant_key) || null;

        if (variants.length > 0 && !variant) {
          return Response.json({ error: `Wybierz wariant produktu „${product.name}".` }, { status: 400 });
        }
        if (variant && variant.is_active === false) {
          return Response.json({ error: `Wariant „${variantLabelOf(variant)}" jest niedostępny.` }, { status: 400 });
        }
        if (variant && (Number(variant.stock) || 0) < qty) {
          return Response.json({
            error: `Brak wystarczającej ilości: ${product.name} (${variantLabelOf(variant)}). Dostępne: ${Number(variant.stock) || 0} szt.`,
          }, { status: 400 });
        }
        if (!variant && typeof product.stock === 'number' && product.stock < qty) {
          return Response.json({
            error: `Brak wystarczającej ilości: ${product.name}. Dostępne: ${Math.max(0, product.stock)} szt.`,
          }, { status: 400 });
        }

        const unitPrice = round2(variant && variant.price ? variant.price : product.price);
        subtotal = round2(subtotal + unitPrice * qty);

        // Opcja dostawy wybrana dla tej pozycji (produkt może mieć kilka)
        const shipOptions = shipOptionsFor(product);
        const chosenShip = shipOptions.find((o) => o.name === raw.shipping_option) || shipOptions[0] || null;
        const itemShip = chosenShip
          ? Number(chosenShip.cost) || 0
          : (typeof product.shipping_cost === 'number' ? Number(product.shipping_cost) || 0 : null);

        items.push({
          product_id: product.id,
          product_name: product.name,
          slug: product.slug || '',
          image_url: product.image_url || '',
          variant_key: variant ? variant.key : '',
          variant_label: variant ? variantLabelOf(variant) : 'Standard',
          unit_price: unitPrice,
          quantity: qty,
          shipping_option: chosenShip ? chosenShip.name : '',
          ...(typeof itemShip === 'number' ? { shipping_cost: itemShip } : {}),
        });

        // Stany magazynowe — wariant albo produkt bez wariantów
        if (variant) {
          const entry = stockUpdates[product.id] || { id: product.id, variants: variants.map((v) => ({ ...v })) };
          entry.variants = entry.variants.map((v) =>
            v.key === variant.key ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) - qty) } : v
          );
          stockUpdates[product.id] = entry;
        } else if (typeof product.stock === 'number') {
          const entry = stockUpdates[product.id] || { id: product.id, stock: product.stock };
          entry.stock = Math.max(0, (Number(entry.stock) || 0) - qty);
          stockUpdates[product.id] = entry;
        }
      }

      // ── Kod zniżkowy ─────────────────────────────────────────────────────
      let discountCode = '';
      let discountAmount = 0;
      const codeInput = (body.discount_code || '').trim().toUpperCase();
      if (codeInput) {
        const found = await base44.asServiceRole.entities.Promotion.filter({ code: codeInput });
        const promo = found[0];
        const now = Date.now();
        const expired = promo?.expires_at ? new Date(promo.expires_at).getTime() < now : false;
        const assignedExpired = promo?.assigned_client_email && promo.assigned_until && !promo.assignment_permanent
          ? new Date(promo.assigned_until).getTime() < now : false;
        const assignedToOther = promo?.assigned_client_email
          && promo.assigned_client_email.toLowerCase() !== (user.email || '').toLowerCase();

        if (!promo || promo.type !== 'discount') {
          return Response.json({ error: 'Nieprawidłowy kod zniżkowy.' }, { status: 400 });
        }
        if (promo.revoked || promo.is_active === false || expired || assignedExpired) {
          return Response.json({ error: 'Ten kod zniżkowy nie jest już aktywny.' }, { status: 400 });
        }
        if (promo.usage_mode === 'single' && promo.used_at) {
          return Response.json({ error: 'Ten kod zniżkowy został już wykorzystany.' }, { status: 400 });
        }
        if (assignedToOther) {
          return Response.json({ error: 'Ten kod zniżkowy nie jest przypisany do Twojego konta.' }, { status: 400 });
        }

        discountAmount = promo.value_type === 'percent'
          ? round2((subtotal * (Number(promo.value) || 0)) / 100)
          : round2(Math.min(Number(promo.value) || 0, subtotal));
        discountCode = promo.code;

        await base44.asServiceRole.entities.Promotion.update(promo.id, {
          used_at: nowIso(),
          status: 'used',
          used_booking_id: '',
        });
      }

      // ── Voucher (saldo) ──────────────────────────────────────────────────
      let voucherCode = '';
      let voucherAmount = 0;
      const voucherInput = (body.voucher_code || '').trim().toUpperCase();
      let voucherRecord = null;
      if (voucherInput) {
        const found = await base44.asServiceRole.entities.Promotion.filter({ code: voucherInput });
        const v = found[0];
        const now = Date.now();
        const exp = v?.expires_at ? new Date(v.expires_at).getTime() : 0;
        const graceOk = v?.is_grace && v?.grace_expires_at ? new Date(v.grace_expires_at).getTime() > now : false;
        const balance = Number(v?.balance ?? v?.value ?? 0);

        if (!v || v.type !== 'voucher') {
          return Response.json({ error: 'Nieprawidłowy kod vouchera.' }, { status: 400 });
        }
        if (v.revoked || v.is_active === false || balance <= 0) {
          return Response.json({ error: 'Ten voucher nie jest aktywny.' }, { status: 400 });
        }
        if ((exp && exp < now) && !graceOk) {
          return Response.json({ error: 'Ten voucher wygasł.' }, { status: 400 });
        }
        if (v.assigned_client_email && v.assigned_client_email.toLowerCase() !== (user.email || '').toLowerCase()) {
          return Response.json({ error: 'Ten voucher jest przypisany do innego konta.' }, { status: 400 });
        }

        const afterDiscount = Math.max(0, round2(subtotal - discountAmount));
        voucherAmount = round2(Math.min(balance, afterDiscount));
        voucherCode = v.code;
        voucherRecord = { id: v.id, balance, amount: voucherAmount };
      }

      // ── Dostawa ──────────────────────────────────────────────────────────
      const settingsList = await base44.asServiceRole.entities.ShopSettings.filter({ key: 'default' });
      const settings = settingsList[0] || {};
      const payable = Math.max(0, round2(subtotal - discountAmount - voucherAmount));
      const freeFrom = Number(settings.free_shipping_from) || 0;

      // Dostawa liczona per pozycja — wybrana opcja dostawy albo koszt produktu;
      // w koszyku obowiązuje najwyższy koszt (jedna przesyłka). Gdy pozycje nie
      // mają własnej dostawy — koszt z ustawień sklepu.
      const itemShips = items
        .map((it) => (typeof it.shipping_cost === 'number' ? Number(it.shipping_cost) || 0 : null))
        .filter((v) => v !== null);
      let shippingCost = itemShips.length > 0
        ? Math.max(...itemShips)
        : (Number(settings.shipping_cost) || 0);
      if (shippingCost > 0 && freeFrom > 0 && payable >= freeFrom) shippingCost = 0;

      const total = round2(payable + shippingCost);
      const orderNumber = `ZAM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const order = await base44.asServiceRole.entities.ShopOrder.create({
        order_number: orderNumber,
        user_email: user.email,
        client_name: body.client_name || user.full_name || '',
        client_phone: (body.shipping_address && body.shipping_address.phone) || '',
        items,
        subtotal,
        discount_code: discountCode,
        discount_amount: discountAmount,
        voucher_code: voucherCode,
        voucher_amount: voucherAmount,
        shipping_cost: shippingCost,
        total,
        status: 'pending',
        payment_status: 'unpaid',
        shipping_address: body.shipping_address || {},
        billing_address: body.billing_address || {},
        invoice_details: body.invoice_details || {},
        customer_note: body.customer_note || '',
        admin_note: '',
        status_history: [{ date: nowIso(), status: 'pending', note: 'Zamówienie złożone', by: user.full_name || user.email }],
        has_open_return: false,
      });

      // Stany magazynowe
      for (const upd of Object.values(stockUpdates)) {
        const patch = {};
        if (Array.isArray(upd.variants)) patch.variants = upd.variants;
        if (typeof upd.stock === 'number') patch.stock = upd.stock;
        if (Object.keys(patch).length > 0) {
          await base44.asServiceRole.entities.ShopProduct.update(upd.id, patch);
        }
      }

      // Saldo vouchera
      if (voucherRecord) {
        const nextBalance = round2(voucherRecord.balance - voucherRecord.amount);
        await base44.asServiceRole.entities.Promotion.update(voucherRecord.id, {
          balance: nextBalance,
          status: nextBalance <= 0 ? 'used' : 'active',
          ...(nextBalance <= 0 ? { used_at: nowIso() } : {}),
        });
      }

      // Wyczyszczenie koszyka
      const carts = await base44.asServiceRole.entities.ShopCart.filter({ user_email: user.email });
      if (carts.length > 0) {
        await base44.asServiceRole.entities.ShopCart.update(carts[0].id, { items: [] });
      }

      return Response.json({ order, summary: { subtotal, discountAmount, voucherAmount, shippingCost, total } });
    }

    // ── Anulowanie zamówienia (admin) ───────────────────────────────────────
    if (action === 'cancel') {
      if (user.role !== 'admin') return Response.json({ error: 'Brak uprawnień.' }, { status: 403 });
      const orderId = body.order_id;
      if (!orderId) return Response.json({ error: 'Brak zamówienia.' }, { status: 400 });

      const order = await base44.asServiceRole.entities.ShopOrder.get(orderId)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!order) return Response.json({ error: 'Zamówienie nie istnieje.' }, { status: 404 });
      if (order.status === 'cancelled') return Response.json({ order });

      // Przywrócenie stanów magazynowych
      for (const it of order.items || []) {
        const product = await base44.asServiceRole.entities.ShopProduct.get(it.product_id).catch(() => null);
        if (!product) continue;
        const qty = Number(it.quantity) || 0;
        const variants = Array.isArray(product.variants) ? product.variants : [];

        if (variants.length === 0) {
          if (typeof product.stock === 'number') {
            await base44.asServiceRole.entities.ShopProduct.update(product.id, {
              stock: (Number(product.stock) || 0) + qty,
            });
          }
          continue;
        }

        const nextVariants = variants.map((v) =>
          v.key === it.variant_key ? { ...v, stock: (Number(v.stock) || 0) + qty } : v
        );
        await base44.asServiceRole.entities.ShopProduct.update(product.id, { variants: nextVariants });
      }

      // Zwrot salda vouchera
      if (order.voucher_code && Number(order.voucher_amount) > 0) {
        const found = await base44.asServiceRole.entities.Promotion.filter({ code: order.voucher_code });
        const v = found[0];
        if (v) {
          const restored = round2((Number(v.balance) || 0) + Number(order.voucher_amount));
          await base44.asServiceRole.entities.Promotion.update(v.id, { balance: restored, status: 'active' });
        }
      }

      const updated = await base44.asServiceRole.entities.ShopOrder.update(orderId, {
        status: 'cancelled',
        payment_status: order.payment_status === 'paid' ? 'refunded' : order.payment_status,
        status_history: [...(order.status_history || []), { date: nowIso(), status: 'cancelled', note: body.note || 'Zamówienie anulowane', by: user.full_name || user.email }],
      });
      return Response.json({ order: updated });
    }

    return Response.json({ error: 'Nieznana akcja.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Błąd serwera.' }, { status: 500 });
  }
}