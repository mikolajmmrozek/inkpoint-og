import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a3d26300e0fa4b3b95a87ab';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';

    // ── STATUS: check if the user has connected their Google Calendar ──
    if (action === 'status') {
      try {
        const conn = await base44.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        return Response.json({ connected: !!conn?.accessToken });
      } catch {
        return Response.json({ connected: false });
      }
    }

    // ── SYNC: push upcoming bookings to Google Calendar ──
    if (action === 'sync') {
      let conn;
      try {
        conn = await base44.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});