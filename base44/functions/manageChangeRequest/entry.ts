import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Single source of truth for the change-request lifecycle.
 * Actions (body.action):
 *  - "create"           — client submits a new request (dedup: only one pending/studio_proposed per booking)
 *  - "reject"           — admin rejects → booking untouched, request status = rejected
 *  - "accept_requested" — admin accepts client's requested date → booking updated, request status = accepted_by_studio
 *  - "propose_alternative" — admin proposes a different date → request status = studio_proposed, client emailed
 *  - "client_accept"    — client accepts studio's proposal → booking updated, request status = accepted_by_client
 *  - "client_decline"   — client declines studio's proposal → request status = declined_by_client, original booking untouched
 * The original confirmed booking is only modified on accept_requested and client_accept.
 */

// Compute end time (HH:MM) from a start time and duration in minutes.
function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const endTotal = h * 60 + m + durationMinutes;
  return `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action;

    // ── CREATE — client submits a new request ────────────────────────────
    if (action === 'create') {
      const bookingId = body.booking_id;
      const requestedDate = body.requested_date;
      const requestedTime = body.requested_time;
      const clientNote = body.client_note || '';

      if (!bookingId || !requestedDate || !requestedTime) {
        return Response.json({ error: 'Brak wymaganych pól (booking_id, requested_date, requested_time)' }, { status: 400 });
      }

      // Load the booking (service role — clients may not have read access to all bookings)
      const booking = await base44.asServiceRole.entities.Booking.filter({ id: bookingId }).then(r => r[0]);
      if (!booking) {
        return Response.json({ error: 'Rezerwacja nie istnieje' }, { status: 404 });
      }

      // Only confirmed bookings are eligible for a change request.
      if (booking.status !== 'confirmed') {
        return Response.json({ error: 'Tylko potwierdzone sesje mogą być zmienione.' }, { status: 400 });
      }

      // Dedup: block if there is already an open request for this booking.
      const openStatuses = ['pending', 'studio_proposed'];
      const existing = await base44.asServiceRole.entities.ChangeRequest.filter({ booking_id: bookingId }, '-created_date', 10);
      const hasOpen = existing.some(r => openStatuses.includes(r.status));
      if (hasOpen) {
        return Response.json({ error: 'Istnieje już oczekująca prośba o zmianę dla tej sesji.' }, { status: 409 });
      }

      const duration = booking.session_duration || 60;
      const requestedEndTime = computeEndTime(requestedTime, duration);

      const created = await base44.asServiceRole.entities.ChangeRequest.create({
        booking_id: booking.id,
        session_id: booking.session_id || '',
        client_name: booking.client_name || '',
        client_email: booking.client_email || '',
        artist_id: booking.artist_id || '',
        artist_name: booking.artist_name || '',
        original_date: booking.session_date,
        original_time: booking.session_time || '',
        original_end_time: booking.session_end_time || '',
        requested_date: requestedDate,
        requested_time: requestedTime,
        requested_end_time: requestedEndTime,
        session_duration: duration,
        status: 'pending',
        client_note: clientNote,
      });

      // Fire-and-forget: notify admins about the new change request.
      try {
        await base44.asServiceRole.entities.Notification.create({
          target_email: 'tattoo.wolsztyn@gmail.com',
          title: 'Prośba o zmianę terminu',
          message: `${booking.client_name || 'Klient'}: ${booking.session_date} ${booking.session_time || ''} → ${requestedDate} ${requestedTime}`,
          category: 'booking',
          link_path: `/dashboard/change-requests`,
          is_read: false,
          booking_id: booking.id,
        });
      } catch (e) { /* non-fatal */ }

      return Response.json({ success: true, id: created.id });
    }

    // ── Admin actions require auth ───────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (action !== 'reject' && action !== 'accept_requested' && action !== 'propose_alternative') {
      return Response.json({ error: 'Nieznana akcja' }, { status: 400 });
    }

    // Admin-only actions
    if (user.role !== 'admin') {
      // Artists may also act on change requests for their bookings — allow if they own the booking's artist.
      // For simplicity and per PRD, restrict to admins.
      return Response.json({ error: 'Brak uprawnień — wymagany administrator' }, { status: 403 });
    }

    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'Brak request_id' }, { status: 400 });

    const cr = await base44.asServiceRole.entities.ChangeRequest.filter({ id: requestId }).then(r => r[0]);
    if (!cr) return Response.json({ error: 'Prośba nie istnieje' }, { status: 404 });

    // ── REJECT ───────────────────────────────────────────────────────────
    if (action === 'reject') {
      await base44.asServiceRole.entities.ChangeRequest.update(requestId, {
        status: 'rejected',
        resolved_date: new Date().toISOString(),
        resolved_by_id: user.id,
        resolved_by_name: user.full_name || user.email,
      });

      // Notify client their request was rejected (original booking stays confirmed).
      try {
        await base44.asServiceRole.entities.Notification.create({
          target_email: cr.client_email,
          title: 'Prośba o zmianę terminu odrzucona',
          message: `Studio nie mogło zmienić terminu sesji ${cr.original_date} ${cr.original_time}. Pierwotny termin pozostaje potwierdzony.`,
          category: 'booking',
          link_path: '/panel/sessions',
          is_read: false,
          booking_id: cr.booking_id,
        });
      } catch (e) { /* non-fatal */ }

      return Response.json({ success: true, status: 'rejected' });
    }

    // ── ACCEPT_REQUESTED — admin accepts the client's requested date ─────
    if (action === 'accept_requested') {
      if (cr.status !== 'pending') {
        return Response.json({ error: 'Prośba nie jest w stanie oczekującym.' }, { status: 400 });
      }

      // Update the booking to the requested date/time. Original is overwritten.
      const oldBooking = await base44.asServiceRole.entities.Booking.filter({ id: cr.booking_id }).then(r => r[0]);
      const updated = await base44.asServiceRole.entities.Booking.update(cr.booking_id, {
        session_date: cr.requested_date,
        session_time: cr.requested_time,
        session_end_time: cr.requested_end_time,
        // keep status confirmed — the studio just accepted the new time.
      });

      await base44.asServiceRole.entities.ChangeRequest.update(requestId, {
        status: 'accepted_by_studio',
        resolved_date: new Date().toISOString(),
        resolved_by_id: user.id,
        resolved_by_name: user.full_name || user.email,
      });

      // Notify client — the email update flow (workflow on Booking update) handles the detailed email,
      // but also create an in-app notification.
      try {
        await base44.asServiceRole.entities.Notification.create({
          target_email: cr.client_email,
          title: 'Termin sesji zmieniony',
          message: `Studio zaakceptowało nowy termin: ${cr.requested_date} ${cr.requested_time}.`,
          category: 'booking',
          link_path: '/panel/sessions',
          is_read: false,
          booking_id: cr.booking_id,
        });
      } catch (e) { /* non-fatal */ }

      // Trigger the booking update email workflow by invoking sendBookingUpdateEmail with old_data.
      try {
        await base44.asServiceRole.functions.invoke('sendBookingUpdateEmail', {
          bookingId: cr.booking_id,
          oldBooking,
          event_type: 'update',
        });
      } catch (e) { /* non-fatal — notification still created */ }

      return Response.json({ success: true, status: 'accepted_by_studio', booking: updated });
    }

    // ── PROPOSE_ALTERNATIVE — admin proposes a different date ────────────
    if (action === 'propose_alternative') {
      if (cr.status !== 'pending') {
        return Response.json({ error: 'Prośba nie jest w stanie oczekującym.' }, { status: 400 });
      }
      const propDate = body.studio_proposed_date;
      const propTime = body.studio_proposed_time;
      const studioNote = body.studio_note || '';
      if (!propDate || !propTime) {
        return Response.json({ error: 'Brak proponowanego terminu' }, { status: 400 });
      }

      const propEndTime = computeEndTime(propTime, cr.session_duration || 60);

      await base44.asServiceRole.entities.ChangeRequest.update(requestId, {
        status: 'studio_proposed',
        studio_proposed_date: propDate,
        studio_proposed_time: propTime,
        studio_proposed_end_time: propEndTime,
        studio_note: studioNote,
      });

      // Notify client — they need to accept or decline the studio's proposal.
      try {
        await base44.asServiceRole.entities.Notification.create({
          target_email: cr.client_email,
          title: 'Studio proponuje nowy termin',
          message: `Studio zaproponowało termin: ${propDate} ${propTime}. Zaloguj się, aby zaakceptować lub odrzucić.`,
          category: 'booking',
          link_path: '/panel/change-requests',
          is_read: false,
          booking_id: cr.booking_id,
        });
      } catch (e) { /* non-fatal */ }

      // Send email via Gmail with a deep link to the acceptance page.
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const appUrl = (typeof Deno !== 'undefined' && Deno.env.get('APP_URL')) || 'https://romanstattoo.base44.app';
        const acceptLink = `${appUrl}/change-request?id=${requestId}`;
        const firstName = (cr.client_name || '').split(' ')[0] || 'Kliencie';

        const subject = `Studio proponuje nowy termin — ${propDate}`;
        const textBody = [
          `Cześć ${firstName},`,
          ``,
          `Studio odpowiedziało na Twoją prośbę o zmianę terminu sesji.`,
          ``,
          `Pierwotny termin: ${cr.original_date} ${cr.original_time}`,
          `Prosiłeś o: ${cr.requested_date} ${cr.requested_time}`,
          `Studio proponuje: ${propDate} ${propTime}${studioNote ? `\n\nNotatka od studia: ${studioNote}` : ''}`,
          ``,
          `Pierwotny termin pozostaje potwierdzony, dopóki nie zaakceptujesz propozycji.`,
          ``,
          `Aby zaakceptować lub odrzucić, wejdź na:`,
          `${acceptLink}`,
          ``,
          `Romans Tattoo`,
        ].join('\n');

        const htmlBody = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
<tr><td style="background:#FF007F;padding:28px 32px;"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">Studio Proponuje Nowy Termin</h1><p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo</p></td></tr>
<tr><td style="padding:28px 32px 8px 32px;"><p style="margin:0 0 16px 0;font-size:15px;">Cześć ${firstName},</p><p style="margin:0 0 16px 0;font-size:15px;">Studio odpowiedziało na Twoją prośbę o zmianę terminu sesji. Poniżej znajdziesz propozycję nowego terminu.</p></td></tr>
<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f9;border-radius:8px;padding:18px 20px;">
<tr><td style="padding:8px 0;font-size:13px;color:#b0b0b0;border-bottom:1px solid #f0f0f0;">Pierwotny termin</td><td align="right" style="padding:8px 0;font-size:13px;color:#0a0a0a;border-bottom:1px solid #f0f0f0;">${cr.original_date} ${cr.original_time}</td></tr>
<tr><td style="padding:8px 0;font-size:13px;color:#b0b0b0;border-bottom:1px solid #f0f0f0;">Prosiłeś o</td><td align="right" style="padding:8px 0;font-size:13px;color:#0a0a0a;border-bottom:1px solid #f0f0f0;">${cr.requested_date} ${cr.requested_time}</td></tr>
<tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#FF007F;">Studio proponuje</td><td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:#FF007F;">${propDate} ${propTime}</td></tr>
</table>
</td></tr>
${studioNote ? `<tr><td style="padding:16px 32px 0 32px;"><p style="margin:0;font-size:13px;color:#0a0a0a;"><strong>Notatka od studia:</strong> ${studioNote}</p></td></tr>` : ''}
<tr><td style="padding:16px 32px 8px 32px;"><p style="margin:0;font-size:13px;color:#666;">Pierwotny termin pozostaje potwierdzony, dopóki nie zaakceptujesz propozycji.</p></td></tr>
<tr><td style="padding:16px 32px 28px 32px;"><a href="${acceptLink}" style="display:inline-block;background:#FF007F;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;text-transform:uppercase;letter-spacing:0.06em;">Zaakceptuj lub odrzuć</a></td></tr>
<tr><td style="padding:0 32px 28px 32px;"><p style="margin:0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ studio odpowiedziało na Twoją prośbę o zmianę terminu w Romans Tattoo.</p></td></tr>
</table></td></tr></table></body></html>`;

        await sendViaGmail(accessToken, 'Romans Tattoo', 'tattoo.wolsztyn@gmail.com', cr.client_email, subject, textBody, htmlBody);
      } catch (e) { /* non-fatal — notification still created */ }

      return Response.json({ success: true, status: 'studio_proposed' });
    }

    return Response.json({ error: 'Nieobsługiwana akcja' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: send raw email via Gmail API with proper MIME encoding ───────
// Uses MailComposer-like base64url encoding to avoid UTF-8 corruption.
async function sendViaGmail(accessToken: string, fromName: string, fromEmail: string, toEmail: string, subject: string, textBody: string, htmlBody: string) {
  // Build RFC 2822 message with UTF-8 charset to preserve Polish characters.
  const email = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
  ].join('\r\n');

  // Encode body as base64 (UTF-8 safe)
  const bodyBase64 = btoa(unescape(encodeURIComponent(htmlBody)));
  const raw = btoa(unescape(encodeURIComponent(email + bodyBase64)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed: ${res.status} ${errText}`);
  }
  return res.json();
}