import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Awaryjny adres admina, gdyby nie udało się pobrać listy administratorów.
const FALLBACK_ADMIN_EMAILS = ['tattoo.wolsztyn@gmail.com'];

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

    // --- Uczestnicy ---

    // Wszyscy administratorzy — powiadomienia trafiają do każdego z osobna,
    // dzięki czemu informacje przepływają między adminami.
    let adminEmails = [];
    try {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
      adminEmails = users.filter(u => u.role === 'admin' && u.email).map(u => u.email);
    } catch (e) {}
    if (adminEmails.length === 0) adminEmails = FALLBACK_ADMIN_EMAILS;

    // Autor zmiany — ze stempelka last_editor* (edycje z panelu) lub created_by_id (utworzenie).
    // Klient (last_editor='client') i prośba o zmianę terminu nie mają konta panelowego — autor pozostaje nieznany.
    let editorUser = null;
    if (booking.last_editor === 'dashboard' && booking.last_editor_id) {
      try {
        editorUser = await base44.asServiceRole.entities.User.get(booking.last_editor_id);
      } catch (e) {}
    } else if (eventType === 'create' && booking.source === 'dashboard' && booking.created_by_id) {
      try {
        editorUser = await base44.asServiceRole.entities.User.get(booking.created_by_id);
      } catch (e) {}
    }
    const editorEmail = editorUser?.email || null;
    const editorIsAdmin = editorUser?.role === 'admin';
    const editorIsClient = booking.last_editor === 'client';

    // Użytkownik konta artysty przypisanego do rezerwacji.
    let artistUser = null;
    if (booking.artist_id) {
      try {
        const artistUsers = await base44.asServiceRole.entities.User.filter({ 'data.artist_id': booking.artist_id }, null, 1);
        artistUser = artistUsers?.[0] || null;
      } catch (e) {}
    }
    const editorIsAssignedArtist = !!(editorUser && artistUser && editorUser.id === artistUser.id);

    // Admini bez autora akcji — autor-admin nie dostaje własnego powiadomienia.
    const adminRecipients = adminEmails.filter(e => e !== editorEmail);

    const notifications = [];

    if (eventType === 'create') {
      const creatorIsClient = booking.source === 'online_form';
      const creatorIsArtist = !!(editorUser && editorUser.role !== 'admin');
      const creatorIsAdmin = editorIsAdmin;
      const when = `${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`;

      // Admini — zawsze, ale autor-admin nie dostaje własnego powiadomienia.
      let adminTitle = 'Nowa rezerwacja';
      let adminMessage = `${booking.client_name || 'Klient'} — ${when}`;
      if (creatorIsClient) {
        adminTitle = 'Nowa rezerwacja online';
      } else if (creatorIsArtist) {
        adminTitle = 'Nowa rezerwacja od artysty';
        adminMessage += ` (artysta: ${booking.artist_name || editorUser.full_name || '—'})`;
      } else if (creatorIsAdmin) {
        adminMessage += ` (dodana przez: ${editorUser.full_name || editorUser.email})`;
      }
      for (const email of adminRecipients) {
        notifications.push({
          target_email: email,
          title: adminTitle,
          message: adminMessage,
          category: 'booking',
          link_path: '/dashboard/bookings?view=pending',
          is_read: false,
          booking_id: booking.id,
        });
      }

      // Artysta przypisany do sesji — chyba że sam utworzył rezerwację.
      if (artistUser?.email && !(creatorIsArtist && artistUser.id === editorUser.id)) {
        notifications.push({
          target_email: artistUser.email,
          title: 'Nowa rezerwacja',
          message: `Rezerwacja klienta ${booking.client_name || '—'} na ${when}`,
          category: 'booking',
          link_path: '/artist/schedule',
          is_read: false,
          booking_id: booking.id,
        });
      }

      // Klient — chyba że sam rezerwował przez formularz online.
      if (!creatorIsClient && booking.client_email) {
        notifications.push({
          target_email: booking.client_email,
          title: 'Nowa rezerwacja',
          message: `Twoja rezerwacja na ${when} została utworzona.`,
          category: 'booking',
          link_path: '/panel/sessions',
          is_read: false,
          booking_id: booking.id,
        });
      }
    } else if (eventType === 'update') {
      const statusChanged = !!(oldBooking && booking.status !== oldBooking.status);

      // Booking confirmed or completed — auto-mark admin notification as read
      if (statusChanged && (booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'cancelled') && booking.id) {
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

      // --- Szczegóły sesji (opis, miejsce, referencje) — bezosobowo ---
      const detailFields = ['tattoo_description', 'tattoo_placement', 'reference_images'];
      const detailChanged = !!(oldBooking && detailFields.some(f =>
        JSON.stringify(oldBooking[f] ?? null) !== JSON.stringify(booking[f] ?? null)
      ));

      if (detailChanged) {
        const changes = [];
        let nonImageChanged = false;
        if (JSON.stringify(oldBooking.tattoo_description ?? null) !== JSON.stringify(booking.tattoo_description ?? null)) {
          changes.push('zaktualizowano opis projektu');
          nonImageChanged = true;
        }
        if (JSON.stringify(oldBooking.tattoo_placement ?? null) !== JSON.stringify(booking.tattoo_placement ?? null)) {
          changes.push('zaktualizowano miejsce zabiegu');
          nonImageChanged = true;
        }
        const oldImgCount = (oldBooking.reference_images || []).length;
        const newImgCount = (booking.reference_images || []).length;
        if (oldImgCount !== newImgCount) {
          changes.push(newImgCount > oldImgCount
            ? `przesłano zdjęcia referencyjne (+${newImgCount - oldImgCount})`
            : `usunięto zdjęcia referencyjne (-${oldImgCount - newImgCount})`);
        }
        const changeSummary = changes.join(', ') || 'zaktualizowano szczegóły sesji';
        const title = nonImageChanged ? 'Zaktualizowano szczegóły sesji' : 'Przesłano referencje do sesji';
        const message = `${booking.client_name || 'Klient'} — ${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}: ${changeSummary}`;

        const adminLink = booking.session_date
          ? `/dashboard/bookings?booking_id=${booking.id}&date=${booking.session_date}`
          : `/dashboard/bookings?booking_id=${booking.id}`;
        const artistLink = booking.session_date
          ? `/artist/schedule?booking_id=${booking.id}&date=${booking.session_date}`
          : `/artist/schedule?booking_id=${booking.id}`;

        // Admini — bez autora zmiany (jeśli nim jest admin).
        for (const email of adminRecipients) {
          notifications.push({
            target_email: email,
            title,
            message,
            category: 'booking',
            link_path: adminLink,
            is_read: false,
            booking_id: booking.id,
          });
        }

        // Artysta przypisany do sesji — chyba że sam dokonał tej zmiany.
        if (artistUser?.email && !editorIsAssignedArtist) {
          notifications.push({
            target_email: artistUser.email,
            title,
            message,
            category: 'booking',
            link_path: artistLink,
            is_read: false,
            booking_id: booking.id,
          });
        }
      }

      // --- Status: klient ---
      if (statusChanged && booking.client_email && !editorIsClient) {
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

      // --- Potwierdzenie / anulowanie: admini i artysta ---
      if (statusChanged && (booking.status === 'confirmed' || booking.status === 'cancelled')) {
        const when = `${booking.session_date || '—'}${booking.session_time ? ' o ' + booking.session_time : ''}`;
        const title = booking.status === 'confirmed' ? 'Rezerwacja potwierdzona' : 'Rezerwacja anulowana';
        const message = `Rezerwacja klienta ${booking.client_name || '—'} na ${when} została ${booking.status === 'confirmed' ? 'potwierdzona' : 'anulowana'}`;
        const adminLink = booking.session_date
          ? `/dashboard/bookings?booking_id=${booking.id}&date=${booking.session_date}`
          : `/dashboard/bookings?booking_id=${booking.id}`;

        // Admini — bez autora akcji (przepływ informacji między adminami).
        for (const email of adminRecipients) {
          notifications.push({
            target_email: email,
            title,
            message,
            category: 'booking',
            link_path: adminLink,
            is_read: false,
            booking_id: booking.id,
          });
        }

        // Artysta przypisany do sesji — chyba że sam zmienił status.
        if (artistUser?.email && !editorIsAssignedArtist) {
          notifications.push({
            target_email: artistUser.email,
            title,
            message,
            category: 'booking',
            link_path: '/artist/schedule',
            is_read: false,
            booking_id: booking.id,
          });
        }
      }
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ success: true, created: notifications.length, recipients: notifications.map(n => n.title) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});