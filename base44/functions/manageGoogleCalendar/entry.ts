import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // ── Helper: get SHARED Google Calendar connection ──
    async function getSharedConnection() {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        return conn;
      } catch {
        return null;
      }
    }

    // ── Helper: ensure artist has a dedicated Google Calendar ──
    async function ensureArtistCalendar(artist, headers) {
      let calendarId = artist.gcal_calendar_id;
      if (calendarId) return calendarId;

      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers,
        body: JSON.stringify({ summary: `Romans Tattoo — ${artist.name}`, timeZone: 'Europe/Warsaw' }),
      });
      if (!calRes.ok) {
        const errBody = await calRes.text().catch(() => '');
        throw new Error(`Failed to create calendar: ${calRes.status} ${errBody.slice(0, 200)}`);
      }
      const calData = await calRes.json();
      calendarId = calData.id;
      await base44.asServiceRole.entities.Artist.update(artist.id, { gcal_calendar_id: calendarId });

      // Share with the artist's user email (best-effort)
      try {
        const users = await base44.asServiceRole.entities.User.filter({ artist_id: artist.id });
        if (users.length > 0 && users[0].email) {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/acl`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ scope: { type: 'user', value: users[0].email }, role: 'writer' }),
          }).catch(() => {});
        }
      } catch (_) { /* best-effort */ }

      return calendarId;
    }

    // ── Helper: build event body from booking ──
    function buildEventBody(bk) {
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

      return {
        summary,
        description,
        start: { dateTime: startDate, timeZone: 'Europe/Warsaw' },
        end: { dateTime: endDate, timeZone: 'Europe/Warsaw' },
      };
    }

    // ── Helper: sync a single booking to the artist's calendar ──
    async function syncBooking(bk, headers) {
      if (!bk.artist_id) return { action: 'skipped', reason: 'no_artist' };

      const artist = await base44.asServiceRole.entities.Artist.get(bk.artist_id);
      if (!artist) return { action: 'skipped', reason: 'artist_not_found' };

      const calendarId = await ensureArtistCalendar(artist, headers);

      // If cancelled and has gcal_event_id, delete the event
      if (bk.status === 'cancelled' && bk.gcal_event_id) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${bk.gcal_event_id}`,
          { method: 'DELETE', headers }
        );
        if (delRes.ok || delRes.status === 404) {
          await base44.asServiceRole.entities.Booking.update(bk.id, { gcal_event_id: '' });
        }
        return { action: 'deleted' };
      }

      // Skip if cancelled or missing date/time
      if (bk.status === 'cancelled' || !bk.session_date || !bk.session_time) {
        return { action: 'skipped' };
      }

      const eventBody = buildEventBody(bk);

      if (bk.gcal_event_id) {
        // Update existing event
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${bk.gcal_event_id}`,
          { method: 'PUT', headers, body: JSON.stringify(eventBody) }
        );
        if (res.ok) return { action: 'updated' };
        if (res.status !== 404) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Update failed: ${res.status} ${errBody.slice(0, 200)}`);
        }
        // 404 = event was deleted from Google Calendar, fall through to create
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
          return { action: 'created', gcal_event_id: data.id };
        }
      } else {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Create failed: ${res.status} ${errBody.slice(0, 200)}`);
      }
    }

    // ── STATUS: check if SHARED connection is active ──
    if (action === 'status') {
      const conn = await getSharedConnection();
      return Response.json({ connected: !!conn?.accessToken });
    }

    // ── SYNC: bulk sync all upcoming bookings for all artists ──
    if (action === 'sync') {
      const conn = await getSharedConnection();
      if (!conn) return Response.json({ error: 'Not connected to Google Calendar (SHARED)' }, { status: 400 });

      const headers = {
        'Authorization': `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      };

      const today = new Date().toISOString().split('T')[0];
      const bookings = await base44.asServiceRole.entities.Booking.filter({
        session_date: { $gte: today },
        status: { $in: ['pending', 'confirmed', 'completed'] },
      });

      let created = 0, updated = 0, skipped = 0;
      const errors = [];

      for (const bk of bookings) {
        try {
          const result = await syncBooking(bk, headers);
          if (result.action === 'created') created++;
          else if (result.action === 'updated') updated++;
          else skipped++;
        } catch (e) {
          errors.push(`${bk.client_name || bk.id}: ${e.message}`);
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

    // ── SYNC_ONE / SYNC_BY_BOOKING: sync a single booking ──
    if (action === 'sync_one' || action === 'sync_by_booking') {
      const bookingId = body.booking_id || body.data?.id || body.event?.entity_id;
      if (!bookingId) {
        return Response.json({ error: 'booking_id required' }, { status: 400 });
      }

      const conn = await getSharedConnection();
      if (!conn) return Response.json({ success: true, action: 'skipped', reason: 'no_shared_connection' });

      const headers = {
        'Authorization': `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      };

      // Handle delete events from automation
      if (body.event?.type === 'delete') {
        const deletedBooking = body.data;
        if (deletedBooking?.gcal_event_id && deletedBooking?.artist_id) {
          const artist = await base44.asServiceRole.entities.Artist.get(deletedBooking.artist_id).catch(() => null);
          if (artist?.gcal_calendar_id) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${artist.gcal_calendar_id}/events/${deletedBooking.gcal_event_id}`,
              { method: 'DELETE', headers }
            ).catch(() => {});
          }
        }
        return Response.json({ success: true, action: 'deleted' });
      }

      const bk = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!bk) return Response.json({ error: 'Booking not found' }, { status: 404 });

      const result = await syncBooking(bk, headers);
      return Response.json({ success: true, ...result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});