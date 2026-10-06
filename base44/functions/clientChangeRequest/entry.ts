import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Client-side actions for change requests.
 * Actions (body.action):
 *  - "list_mine"    — list change requests for the logged-in client (by email)
 *  - "client_accept"  — client accepts the studio's proposed date → booking updated, request status = accepted_by_client
 *  - "client_decline" — client declines the studio's proposal → request status = declined_by_client, original booking untouched
 *
 * The client is identified by base44.auth.me() — they must be logged in as an app user.
 * We match ChangeRequests by client_email == user.email AND the request id.
 */

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action;

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── LIST_MINE ────────────────────────────────────────────────────────
    if (action === 'list_mine') {
      const list = await base44.entities.ChangeRequest.filter({ client_email: user.email }, '-created_date', 100);
      return Response.json({ success: true, data: list });
    }

    // ── CLIENT_ACCEPT / CLIENT_DECLINE ───────────────────────────────────
    if (action === 'client_accept' || action === 'client_decline') {
      const requestId = body.request_id;
      if (!requestId) return Response.json({ error: 'Brak request_id' }, { status: 400 });

      const cr = await base44.asServiceRole.entities.ChangeRequest.filter({ id: requestId }).then(r => r[0]);
      if (!cr) return Response.json({ error: 'Prośba nie istnieje' }, { status: 404 });

      // Authorization: only the client who owns this request can act on it.
      if (cr.client_email !== user.email) {
        return Response.json({ error: 'Brak uprawnień do tej prośby' }, { status: 403 });
      }

      if (cr.status !== 'studio_proposed') {
        return Response.json({ error: 'Prośba nie oczekuje na odpowiedź klienta.' }, { status: 400 });
      }

      // ── CLIENT_ACCEPT — apply the studio's proposal to the booking ─────
      if (action === 'client_accept') {
        const booking = await base44.asServiceRole.entities.Booking.filter({ id: cr.booking_id }).then(r => r[0]);
        if (!booking) return Response.json({ error: 'Powiązana rezerwacja nie istnieje' }, { status: 404 });

        const updated = await base44.asServiceRole.entities.Booking.update(cr.booking_id, {
          session_date: cr.studio_proposed_date,
          session_time: cr.studio_proposed_time,
          session_end_time: cr.studio_proposed_end_time,
          // Suppress the generic "Aktualizacja rezerwacji" email — the dedicated
          // change-request email handles notification for this path.
          last_editor: 'change_request',
          // status stays confirmed
        });

        await base44.asServiceRole.entities.ChangeRequest.update(requestId, {
          status: 'accepted_by_client',
          resolved_date: new Date().toISOString(),
        });

        // Notify admins
        try {
          await base44.asServiceRole.entities.Notification.create({
            target_email: 'tattoo.wolsztyn@gmail.com',
            title: 'Klient zaakceptował nowy termin',
            message: `${cr.client_name || 'Klient'}: nowy termin ${cr.studio_proposed_date} ${cr.studio_proposed_time}`,
            category: 'booking',
            link_path: '/dashboard/change-requests',
            is_read: false,
            booking_id: cr.booking_id,
          });
        } catch (e) { /* non-fatal */ }

        // No update email here — the dedicated change-request email handles
        // notification, and last_editor='change_request' suppresses the generic
        // "Aktualizacja rezerwacji" workflow email (see that workflow's condition).
        return Response.json({ success: true, status: 'accepted_by_client', booking: updated });
      }

      // ── CLIENT_DECLINE — original booking stays confirmed ───────────────
      if (action === 'client_decline') {
        await base44.asServiceRole.entities.ChangeRequest.update(requestId, {
          status: 'declined_by_client',
          resolved_date: new Date().toISOString(),
        });

        try {
          await base44.asServiceRole.entities.Notification.create({
            target_email: 'tattoo.wolsztyn@gmail.com',
            title: 'Klient odrzucił propozycję terminu',
            message: `${cr.client_name || 'Klient'} odrzucił propozycję ${cr.studio_proposed_date} ${cr.studio_proposed_time}. Pierwotny termin pozostaje potwierdzony.`,
            category: 'booking',
            link_path: '/dashboard/change-requests',
            is_read: false,
            booking_id: cr.booking_id,
          });
        } catch (e) { /* non-fatal */ }

        return Response.json({ success: true, status: 'declined_by_client' });
      }
    }

    return Response.json({ error: 'Nieznana akcja' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}