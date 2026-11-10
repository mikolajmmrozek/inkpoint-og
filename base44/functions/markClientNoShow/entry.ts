import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Oznaczanie i cofanie nieobecności klienta.
// Jeden wpis w historii na sesję — powtórne oznaczenie nie nalicza drugi raz.
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
    const revert = body.revert === true;
    if (!bookingId) return Response.json({ error: 'booking_id is required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!booking) return Response.json({ error: 'Not found' }, { status: 404 });

    const nowIso = new Date().toISOString();
    const actorName = user.full_name || user.email || 'Pracownik';

    if (!revert && booking.no_show === true) {
      return Response.json({ status: 'already_marked', booking });
    }

    await base44.asServiceRole.entities.Booking.update(bookingId, {
      no_show: !revert,
      no_show_at: revert ? '' : nowIso,
      no_show_by_id: revert ? '' : user.id,
      no_show_by_name: revert ? '' : actorName,
    });

    // Klient: e-mail, a gdy go brak — imię i nazwisko.
    const email = (booking.client_email || '').toLowerCase().trim();
    const name = (booking.client_name || '').trim();
    const clients = email
      ? await base44.asServiceRole.entities.Client.filter({ email })
      : await base44.asServiceRole.entities.Client.filter({ name });
    const client = clients[0] || null;

    let noShowCount = 0;
    if (client) {
      const events = Array.isArray(client.no_show_events) ? [...client.no_show_events] : [];
      const idx = events.findIndex((e) => e.booking_id === bookingId);

      if (idx >= 0) {
        events[idx] = {
          ...events[idx],
          reverted: revert,
          reverted_at: revert ? nowIso : '',
          reverted_by_name: revert ? actorName : '',
        };
      } else if (!revert) {
        events.push({
          booking_id: bookingId,
          session_id: booking.session_id || '',
          date: booking.session_date || '',
          marked_at: nowIso,
          marked_by_id: user.id,
          marked_by_name: actorName,
          reverted: false,
        });
      }

      noShowCount = events.filter((e) => e.reverted !== true).length;
      await base44.asServiceRole.entities.Client.update(client.id, {
        no_show_events: events,
        no_show_count: noShowCount,
      });
    }

    return Response.json({ status: revert ? 'reverted' : 'marked', no_show_count: noShowCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}