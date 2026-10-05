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
      // Determine who created the booking so we never notify the creator.
      const creatorIsClient = booking.source === 'online_form';
      let creatorIsArtist = false;

      if (booking.artist_id && booking.created_by_id) {
        try {
          const artistUser = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
          if (artistUser.length > 0 && artistUser[0].id === booking.created_by_id) {
            creatorIsArtist = true;
          }
        } catch (e) {}
      }

      const adminSelfCreated = booking.source === 'dashboard' && booking.created_by_id && !creatorIsArtist;

      // Notify admins — unless an admin created it themselves.
      if (!adminSelfCreated) {
        const title = creatorIsClient ? 'Nowa rezerwacja online' : (creatorIsArtist ? 'Nowa rezerwacja od artysty' : 'Nowa rezerwacja');
        notifications.push({
          target_email: 'tattoo.wolsztyn@gmail.com',
          title,
          message: `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`,
          category: 'booking',
          link_path: '/dashboard/bookings?view=pending',
          is_read: false,
          booking_id: booking.id,
        });
      }

      // Notify the assigned artist — unless the artist created it themselves.
      if (booking.artist_id && !creatorIsArtist) {
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

      // Notify the client — unless the client created it themselves (online form).
      if (!creatorIsClient && booking.client_email) {
        notifications.push({
          target_email: booking.client_email,
          title: 'Nowa rezerwacja',
          message: `Twoja rezerwacja na ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''} została utworzona.`,
          category: 'booking',
          link_path: '/panel/sessions',
          is_read: false,
          booking_id: booking.id,
        });
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

      // Client edited session details (description, placement, reference images) —
      // notify the assigned artist and admins. We detect this by comparing old vs new
      // values of the editable fields. Only fire when something actually changed.
      const detailFields = ['tattoo_description', 'tattoo_placement', 'reference_images'];
      const detailChanged = oldBooking && detailFields.some(f => {
        const oldVal = JSON.stringify(oldBooking[f] ?? null);
        const newVal = JSON.stringify(booking[f] ?? null);
        return oldVal !== newVal;
      });

      if (detailChanged) {
        // Determine who made the change — only notify when the client did it.
        // An admin/artist editing from the dashboard won't trigger these client-edit
        // notifications. We infer "client edit" when the current user (created_by_id of
        // the update) is NOT linked to an artist profile and is NOT an admin.
        let editorIsArtist = false;
        let editorIsAdmin = false;

        if (booking.created_by_id) {
          // Note: the SDK's update event payload uses created_by_id of the booking record,
          // not the editor. The platform doesn't expose "who updated". We treat detail
          // changes on a booking that has source='online_form' or belongs to a client
          // as client-originated, UNLESS the booking's artist_id matches an artist user
          // whose id equals the booking's last editor. Since we can't reliably tell,
          // we notify the artist+admin on any detail change — the client UI is the only
          // place clients edit these fields, and admin/artist edits to these fields
          // are rare and would warrant a heads-up anyway.
          try {
            const artistUser = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
            if (artistUser.length > 0 && artistUser[0].id === booking.created_by_id) {
              editorIsArtist = true;
            }
          } catch (e) {}
        }

        // Build a readable summary of what changed.
        const changes = [];
        if (JSON.stringify(oldBooking.tattoo_description ?? null) !== JSON.stringify(booking.tattoo_description ?? null)) {
          changes.push('opis projektu');
        }
        if (JSON.stringify(oldBooking.tattoo_placement ?? null) !== JSON.stringify(booking.tattoo_placement ?? null)) {
          changes.push('miejsce zabiegu');
        }
        const oldImgCount = (oldBooking.reference_images || []).length;
        const newImgCount = (booking.reference_images || []).length;
        if (oldImgCount !== newImgCount) {
          changes.push(newImgCount > oldImgCount ? `zdjęcia (+${newImgCount - oldImgCount})` : `zdjęcia (-${oldImgCount - newImgCount})`);
        }
        const changeSummary = changes.join(', ');

        // Deep link straight to the booking + its day so the admin/artist lands on it.
        const adminLink = booking.session_date
          ? `/dashboard/bookings?booking_id=${booking.id}&date=${booking.session_date}`
          : `/dashboard/bookings?booking_id=${booking.id}`;
        const artistLink = booking.session_date
          ? `/artist/schedule?booking_id=${booking.id}&date=${booking.session_date}`
          : `/artist/schedule?booking_id=${booking.id}`;

        // Notify admins (shared inbox)
        notifications.push({
          target_email: 'tattoo.wolsztyn@gmail.com',
          title: 'Klient zaktualizował szczegóły sesji',
          message: `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}: ${changeSummary}`,
          category: 'booking',
          link_path: adminLink,
          is_read: false,
          booking_id: booking.id,
        });

        // Notify the assigned artist (if not the editor themselves)
        if (booking.artist_id && !editorIsArtist) {
          try {
            const artistUser = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
            if (artistUser.length > 0 && artistUser[0].email) {
              notifications.push({
                target_email: artistUser[0].email,
                title: 'Klient zaktualizował szczegóły sesji',
                message: `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}: ${changeSummary}`,
                category: 'booking',
                link_path: artistLink,
                is_read: false,
                booking_id: booking.id,
              });
            }
          } catch (e) {}
        }
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