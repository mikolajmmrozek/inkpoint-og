import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a3d26300e0fa4b3b95a87ab';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const isAutomation = !!body.event;
    const action = body.action || (isAutomation ? 'sync_by_booking' : 'status');

    // Skip auth for automation calls (entity automations have no user context)
    if (!isAutomation) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── STATUS: check if the user has connected their Google Calendar ──
    if (action === 'status') {
      try {
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        return Response.json({ connected: !!conn?.accessToken });
      } catch {
        return Response.json({ connected: false });
      }
    }

    // ── SYNC: push upcoming bookings to Google Calendar ──
    if (action === 'sync') {
      let conn;
      try {
        conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      } catch {
        return Response.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
      }

      const accessToken = conn.accessToken;
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      // Find the artist profile linked to this user
      const artistId = user.artist_id;
      if (!artistId) {
        return Response.json({ error: 'No artist profile linked to your account' }, { status: 400 });
      }

      // Fetch upcoming bookings (today and future, not cancelled)
      const today = new Date().toISOString().split('T')[0];
      const bookings = await base44.entities.Booking.filter({
        artist_id: artistId,
        session_date: { $gte: today },
        status: { $in: ['pending', 'confirmed', 'completed'] },
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (const bk of bookings) {
        // Build start/end datetime
        if (!bk.session_date || !bk.session_time) { skipped++; continue; }

        const startDate = `${bk.session_date}T${bk.session_time}:00`;
        let endDate;
        if (bk.session_end_time) {
          endDate = `${bk.session_date}T${bk.session_end_time}:00`;
        } else {
          // Default 60 min if no end time
          const dur = bk.session_duration || 60;
          const [h, m] = bk.session_time.split(':').map(Number);
          const total = h * 60 + m + dur;
          const eh = String(Math.floor(total / 60)).padStart(2, '0');
          const em = String(total % 60).padStart(2, '0');
          endDate = `${bk.session_date}T${eh}:${em}:00`;
        }

        const summary = `${bk.client_name || 'Sesja'}${bk.service_name ? ` — ${bk.service_name}` : ''}`;
        const description = [
          bk.service_name ? `Usługa: ${bk.service_name}` : '',
          bk.tattoo_placement ? `Miejsce: ${bk.tattoo_placement}` : '',
          bk.tattoo_description ? `Opis: ${bk.tattoo_description}` : '',
          bk.client_phone ? `Telefon: ${bk.client_phone}` : '',
          bk.client_email ? `Email: ${bk.client_email}` : '',
          bk.estimated_price ? `Cena: ${bk.estimated_price} zł` : '',
          bk.notes ? `Notatki: ${bk.notes}` : '',
          bk.admin_notes ? `Notatki admina: ${bk.admin_notes}` : '',
        ].filter(Boolean).join('\n');

        const eventBody = {
          summary,
          description,
          start: { dateTime: startDate, timeZone: 'Europe/Warsaw' },
          end: { dateTime: endDate, timeZone: 'Europe/Warsaw' },
        };

        if (bk.gcal_event_id) {
          // Update existing event
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${bk.gcal_event_id}`,
            { method: 'PUT', headers, body: JSON.stringify(eventBody) }
          );
          if (res.ok) {
            updated++;
          } else {
            const errBody = await res.text().catch(() => '');
            errors.push(`Update ${bk.client_name}: ${res.status} ${errBody.slice(0, 200)}`);
          }
        } else {
          // Create new event
          const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            { method: 'POST', headers, body: JSON.stringify(eventBody) }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.id) {
              await base44.entities.Booking.update(bk.id, { gcal_event_id: data.id });
              created++;
            }
          } else {
            const errBody = await res.text().catch(() => '');
            errors.push(`Create ${bk.client_name}: ${res.status} ${errBody.slice(0, 200)}`);
          }
        }
      }

      return Response.json({
        success: true,
        created,
        updated,
        skipped,
        total: bookings.length,
        errors: errors.slice(0, 5),
      });
    }

    // ── SYNC_ONE: sync a single booking to Google Calendar ──
    if (action === 'sync_one') {
      const bookingId = body.booking_id;
      if (!bookingId) {
        return Response.json({ error: 'booking_id required' }, { status: 400 });
      }

      let conn;
      try {
        conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      } catch {
        return Response.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
      }

      const accessToken = conn.accessToken;
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      const bk = await base44.entities.Booking.get(bookingId);
      if (!bk) {
        return Response.json({ error: 'Booking not found' }, { status: 404 });
      }

      // If cancelled and has gcal_event_id, delete the event from Google Calendar
      if (bk.status === 'cancelled' && bk.gcal_event_id) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${bk.gcal_event_id}`,
          { method: 'DELETE', headers }
        );
        if (delRes.ok || delRes.status === 404) {
          await base44.entities.Booking.update(bk.id, { gcal_event_id: '' });
        }
        return Response.json({ success: true, action: 'deleted' });
      }

      // Skip if cancelled without event or missing date/time
      if (bk.status === 'cancelled' || !bk.session_date || !bk.session_time) {
        return Response.json({ success: true, action: 'skipped' });
      }

      // Build start/end datetime
      const startDate = `${bk.session_date}T${bk.session_time}:00`;
      let endDate;
      if (bk.session_end_time) {
        endDate = `${bk.session_date}T${bk.session_end_time}:00`;
      } else {
        const dur = bk.session_duration || 60;
        const [h, m] = bk.session_time.split(':').map(Number);
        const total = h * 60 + m + dur;
        const eh = String(Math.floor(total / 60)).padStart(2, '0');
        const em = String(total % 60).padStart(2, '0');
        endDate = `${bk.session_date}T${eh}:${em}:00`;
      }

      const summary = `${bk.client_name || 'Sesja'}${bk.service_name ? ` — ${bk.service_name}` : ''}`;
      const description = [
        bk.service_name ? `Usługa: ${bk.service_name}` : '',
        bk.tattoo_placement ? `Miejsce: ${bk.tattoo_placement}` : '',
        bk.tattoo_description ? `Opis: ${bk.tattoo_description}` : '',
        bk.client_phone ? `Telefon: ${bk.client_phone}` : '',
        bk.client_email ? `Email: ${bk.client_email}` : '',
        bk.estimated_price ? `Cena: ${bk.estimated_price} zł` : '',
        bk.notes ? `Notatki: ${bk.notes}` : '',
        bk.admin_notes ? `Notatki admina: ${bk.admin_notes}` : '',
        bk.status ? `Status: ${bk.status}` : '',
      ].filter(Boolean).join('\n');

      const eventBody = {
        summary,
        description,
        start: { dateTime: startDate, timeZone: 'Europe/Warsaw' },
        end: { dateTime: endDate, timeZone: 'Europe/Warsaw' },
      };

      if (bk.gcal_event_id) {
        // Update existing event
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${bk.gcal_event_id}`,
          { method: 'PUT', headers, body: JSON.stringify(eventBody) }
        );
        if (res.ok) {
          return Response.json({ success: true, action: 'updated' });
        } else {
          const errBody = await res.text().catch(() => '');
          return Response.json({ error: `Update failed: ${res.status} ${errBody.slice(0, 200)}` }, { status: 500 });
        }
      } else {
        // Create new event
        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          { method: 'POST', headers, body: JSON.stringify(eventBody) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            await base44.entities.Booking.update(bk.id, { gcal_event_id: data.id });
            return Response.json({ success: true, action: 'created', gcal_event_id: data.id });
          }
        } else {
          const errBody = await res.text().catch(() => '');
          return Response.json({ error: `Create failed: ${res.status} ${errBody.slice(0, 200)}` }, { status: 500 });
        }
      }
    }

    // ── SYNC_BY_BOOKING: sync via shared workspace connection (for entity automations) ──
    if (action === 'sync_by_booking') {
      const bookingId = body.booking_id || body.data?.id || body.event?.entity_id;
      if (!bookingId) {
        return Response.json({ error: 'booking_id required' }, { status: 400 });
      }

      // Get shared connection (SHARED mode — platform OAuth app)
      let conn;
      try {
        conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      } catch {
        return Response.json({ error: 'Studio Google Calendar not connected' }, { status: 400 });
      }

      const accessToken = conn.accessToken;
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      // Handle delete events
      if (body.event?.type === 'delete') {
        const deletedBooking = body.data;
        if (deletedBooking?.gcal_event_id && deletedBooking?.artist_id) {
          const delArtist = await base44.asServiceRole.entities.Artist.get(deletedBooking.artist_id).catch(() => null);
          if (delArtist?.gcal_calendar_id) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${delArtist.gcal_calendar_id}/events/${deletedBooking.gcal_event_id}`,
              { method: 'DELETE', headers }
            ).catch(() => {});
          }
        }
        return Response.json({ success: true, action: 'deleted' });
      }

      // Fetch booking using service role (no user context in automation)
      const bk = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!bk) {
        return Response.json({ error: 'Booking not found' }, { status: 404 });
      }

      if (!bk.artist_id) {
        return Response.json({ success: true, action: 'skipped', reason: 'no_artist' });
      }

      const artist = await base44.asServiceRole.entities.Artist.get(bk.artist_id);
      if (!artist) {
        return Response.json({ success: true, action: 'skipped', reason: 'artist_not_found' });
      }

      // Ensure the artist has a dedicated Google Calendar
      let calendarId = artist.gcal_calendar_id;
      if (!calendarId) {
        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
          method: 'POST',
          headers,
          body: JSON.stringify({ summary: `Romans Tattoo — ${artist.name}`, timeZone: 'Europe/Warsaw' }),
        });
        if (!calRes.ok) {
          const errBody = await calRes.text().catch(() => '');
          return Response.json({ error: `Failed to create calendar: ${calRes.status} ${errBody.slice(0, 200)}` }, { status: 500 });
        }
        const calData = await calRes.json();
        calendarId = calData.id;
        await base44.asServiceRole.entities.Artist.update(artist.id, { gcal_calendar_id: calendarId });

        // Share with the artist's user email
        try {
          const users = await base44.asServiceRole.entities.User.filter({ artist_id: artist.id });
          if (users.length > 0 && users[0].email) {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/acl`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ scope: { type: 'user', value: users[0].email }, role: 'writer' }),
            }).catch(() => {});
          }
        } catch (e) {
          // Sharing is best-effort
        }
      }

      // If cancelled and has gcal_event_id, delete the event
      if (bk.status === 'cancelled' && bk.gcal_event_id) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${bk.gcal_event_id}`,
          { method: 'DELETE', headers }
        );
        if (delRes.ok || delRes.status === 404) {
          await base44.asServiceRole.entities.Booking.update(bk.id, { gcal_event_id: '' });
        }
        return Response.json({ success: true, action: 'deleted' });
      }

      // Skip if cancelled or missing date/time
      if (bk.status === 'cancelled' || !bk.session_date || !bk.session_time) {
        return Response.json({ success: true, action: 'skipped' });
      }

      const startDate = `${bk.session_date}T${bk.session_time}:00`;
      let endDate;
      if (bk.session_end_time) {
        endDate = `${bk.session_date}T${bk.session_end_time}:00`;
      } else {
        const dur = bk.session_duration || 60;
        const [h, m] = bk.session_time.split(':').map(Number);
        const total = h * 60 + m + dur;
        endDate = `${bk.session_date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
      }

      const summary = `${bk.client_name || 'Sesja'}${bk.service_name ? ` — ${bk.service_name}` : ''}`;
      const description = [
        bk.service_name ? `Usługa: ${bk.service_name}` : '',
        bk.tattoo_placement ? `Miejsce: ${bk.tattoo_placement}` : '',
        bk.tattoo_description ? `Opis: ${bk.tattoo_description}` : '',
        bk.client_phone ? `Telefon: ${bk.client_phone}` : '',
        bk.client_email ? `Email: ${bk.client_email}` : '',
        bk.estimated_price ? `Cena: ${bk.estimated_price} zł` : '',
        bk.notes ? `Notatki: ${bk.notes}` : '',
        bk.admin_notes ? `Notatki admina: ${bk.admin_notes}` : '',
        bk.status ? `Status: ${bk.status}` : '',
      ].filter(Boolean).join('\n');

      const eventBody = {
        summary,
        description,
        start: { dateTime: startDate, timeZone: 'Europe/Warsaw' },
        end: { dateTime: endDate, timeZone: 'Europe/Warsaw' },
      };

      if (bk.gcal_event_id) {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${bk.gcal_event_id}`,
          { method: 'PUT', headers, body: JSON.stringify(eventBody) }
        );
        if (res.ok) {
          return Response.json({ success: true, action: 'updated' });
        }
        if (res.status !== 404) {
          const errBody = await res.text().catch(() => '');
          return Response.json({ error: `Update failed: ${res.status} ${errBody.slice(0, 200)}` }, { status: 500 });
        }
      }

      // Create new event
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        { method: 'POST', headers, body: JSON.stringify(eventBody) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          await base44.asServiceRole.entities.Booking.update(bk.id, { gcal_event_id: data.id });
          return Response.json({ success: true, action: 'created', gcal_event_id: data.id });
        }
      } else {
        const errBody = await res.text().catch(() => '');
        return Response.json({ error: `Create failed: ${res.status} ${errBody.slice(0, 200)}` }, { status: 500 });
      }
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});