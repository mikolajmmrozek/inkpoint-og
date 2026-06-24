import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload: { event, data, old_data }
    const eventType = body.event?.type;
    const booking = body.data;
    const oldBooking = body.old_data;

    if (!booking) {
      return Response.json({ error: 'No booking data in payload' }, { status: 400 });
    }

    const notifications = [];

    if (eventType === 'create') {
      // New booking — notify all admins
      if (booking.source === 'online_form') {
        notifications.push({
          target_email: 'tattoo.wolsztyn@gmail.com',
          title: 'Nowa rezerwacja online',
          message: `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`,
          category: 'booking',
          link_path: '/dashboard/bookings?view=pending',
          is_read: false,
          booking_id: booking.id,
        });
      }
      // Notify the assigned artist on any new booking
      if (booking.artist_id) {
        try {
          const artistUser = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
          if (artistUser.length > 0 && artistUser[0].email) {
            notifications.push({
              target_email: artistUser[0].email,
              title: 'Nowa rezerwacja',
              message: `Rezerwacja klienta ${booking.client_name || '—'} na ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`,
              category: 'booking',
              link_path: '/artist/schedule',
              is_read: false,
              booking_id: booking.id,
            });
          }
        } catch (e) {}
      }
    } else if (eventType === 'update') {
      // Booking confirmed or completed — auto-mark admin notification as read
      if (oldBooking && booking.status !== oldBooking.status && (booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'cancelled') && booking.id) {
        try {
          const adminNotifs = await base44.asServiceRole.entities.Notification.filter(
            { booking_id: booking.id, category: 'booking', is_read: false },
            '-created_date',
            50
          );
          if (adminNotifs.length > 0) {
            await base44.asServiceRole.entities.Notification.bulkUpdate(
              adminNotifs.map(n => ({ id: n.id, is_read: true }))
            );
          }
        } catch (e) {}
      }

      // Status changed — notify the client
      if (oldBooking && booking.status !== oldBooking.status && booking.client_email) {
        const statusLabels = {
          pending: 'Oczekuje',
          confirmed: 'Potwierdzona',
          completed: 'Zakończona',
          cancelled: 'Anulowana',
        };
        notifications.push({
          target_email: booking.client_email,
          title: 'Status rezerwacji zmieniony',
          message: `Twoja rezerwacja na ${booking.session_date || '—'} — nowy status: ${statusLabels[booking.status] || booking.status}`,
          category: 'booking',
          link_path: '/panel/sessions',
          is_read: false,
        });
      }

      // Booking confirmed or cancelled — notify the assigned artist
      if (oldBooking && booking.status !== oldBooking.status && (booking.status === 'confirmed' || booking.status === 'cancelled') && booking.artist_id) {
        try {
          const artistUser = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
          if (artistUser.length > 0 && artistUser[0].email) {
            if (booking.status === 'confirmed') {
              notifications.push({
                target_email: artistUser[0].email,
                title: 'Nowa potwierdzona rezerwacja',
                message: `Rezerwacja klienta ${booking.client_name || '—'} na ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''} została potwierdzona`,
                category: 'booking',
                link_path: '/artist/schedule',
                is_read: false,
                booking_id: booking.id,
              });
            } else if (booking.status === 'cancelled') {
              notifications.push({
                target_email: artistUser[0].email,
                title: 'Rezerwacja anulowana',
                message: `Rezerwacja klienta ${booking.client_name || '—'} na ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''} została anulowana`,
                category: 'booking',
                link_path: '/artist/schedule',
                is_read: false,
                booking_id: booking.id,
              });
            }
          }
        } catch (e) {}
      }
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ success: true, created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});