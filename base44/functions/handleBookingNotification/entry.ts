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
      // New booking from online form — notify all admins
      if (booking.source === 'online_form') {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          if (!admin.email) continue;
          notifications.push({
            target_email: admin.email,
            title: 'Nowa rezerwacja online',
            message: `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`,
            category: 'booking',
            link_path: '/dashboard/bookings?view=pending',
            is_read: false,
          });
        }
      }
    } else if (eventType === 'update') {
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
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ success: true, created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});