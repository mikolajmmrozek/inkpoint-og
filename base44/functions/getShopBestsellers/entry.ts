import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Ranking bestsellerów: suma zamówionych sztuk per produkt (bez anulowanych i zwróconych zamówień).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const sold = new Map();
    let cursor;

    for (let page = 0; page < 10; page += 1) {
      const options = { sort: '-created_date', limit: 200 };
      if (cursor) options.cursor = cursor;
      const res = await base44.asServiceRole.entities.ShopOrder.filter(
        { status: { $nin: ['cancelled', 'returned'] } },
        options
      );
      const orders = Array.isArray(res) ? res : (res?.items || []);
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          if (!item?.product_id) return;
          sold.set(item.product_id, (sold.get(item.product_id) || 0) + (Number(item.quantity) || 0));
        });
      });
      if (Array.isArray(res) || !res?.has_more || !res?.next_cursor) break;
      cursor = res.next_cursor;
    }

    const ranking = [...sold.entries()]
      .map(([product_id, quantity]) => ({ product_id, quantity }))
      .filter(row => row.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    return Response.json({ ranking });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}