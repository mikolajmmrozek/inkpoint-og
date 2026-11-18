import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { recordSale } from '../../shared/shopSale.ts';

// Sprzedaż sklepowa z panelu (okno sprzedaży / szybka akcja).
// Admin: może wskazać artystę. Artysta: sprzedaż zawsze na własny profil.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'artist') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    let artistId = String(body.artist_id || '');
    let artistName = String(body.artist_name || '');
    if (user.role === 'artist') {
      artistId = user.artist_id || '';
      if (!artistId) return Response.json({ error: 'Konto artysty nie jest powiązane z profilem.' }, { status: 403 });
    }
    if (artistId && !artistName) {
      const artist = await base44.asServiceRole.entities.Artist.get(artistId).catch(() => null);
      artistName = artist?.name || '';
    }

    const sale = await recordSale(base44, {
      items: body.items,
      payments: body.payment_breakdown || body.payments,
      clientName: body.client_name,
      artistId,
      artistName,
      seller: user.full_name || user.email || '',
    });

    return Response.json(sale);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}