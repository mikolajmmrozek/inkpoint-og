import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  APP_URL, buildAppUrl, sectionStyle, h3Style, pStyle, mutedStyle, buttonStyle,
  detailRow, clientFirstName, fmtDate, buildContactRows, sendViaGmail,
} from '../../shared/bookingEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept { event, data } from workflow, or { bookingId } from frontend.
    let booking = body.data;
    if (!booking && body.bookingId) {
      booking = await base44.asServiceRole.entities.Booking.get(body.bookingId);
    }

    if (!booking) {
      return Response.json({ success: false, error: 'No booking data' }, { status: 400 });
    }

    // Only send when the booking is actually cancelled.
    if (booking.status !== 'cancelled') {
      return Response.json({ success: true, skipped: true, reason: `status=${booking.status}` });
    }

    // Studio settings
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'contact' });
    const contact = settings.length > 0 ? settings[0] : {};

    // Procedure category for the artist label
    let procedureCategory = '';
    if (booking.service_id) {
      try {
        const svc = await base44.asServiceRole.entities.Service.get(booking.service_id);
        if (svc?.category) procedureCategory = svc.category;
      } catch (e) { /* ignore */ }
    }
    if (!procedureCategory) {
      const name = (booking.service_name || '').toLowerCase();
      if (/piercing/.test(name)) procedureCategory = 'piercing';
      else if (/tatu|tatoo|tattoo/.test(name)) procedureCategory = 'tattoo';
    }
    const isPiercing = procedureCategory === 'piercing';

    const bookingLink = buildAppUrl('/booking');
    const panelLink = buildAppUrl('/panel');

    const dateStr = booking.session_date ? fmtDate(booking.session_date) : '—';
    const timeStr = booking.session_time || 'TBD';
    const firstName = clientFirstName(booking);

    const detailRows: string[] = [
      detailRow('Data', dateStr),
      detailRow('Godzina', timeStr),
    ];
    if (booking.artist_name && procedureCategory !== 'studio') {
      detailRows.push(detailRow(isPiercing ? 'Piercer' : 'Tatuażysta', booking.artist_name));
    }
    if (booking.service_name) detailRows.push(detailRow('Usługa', booking.service_name));
    if (booking.tattoo_placement) detailRows.push(detailRow('Miejsce', booking.tattoo_placement));

    const contactRows = buildContactRows(contact);

    const htmlBody = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anulowanie rezerwacji</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#FF007F;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">Twoja Rezerwacja Została Anulowana</h1>
              <p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo &middot; Inkflow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="${pStyle}">Cześć ${firstName},</p>
              <p style="${pStyle}">informujemy, że Twoja rezerwacja w Romans Tattoo została anulowana. Poniżej znajdują się szczegóły anulowanej sesji.</p>
              ${booking.admin_notes ? `<p style="${pStyle}"><strong> Powód:</strong> ${booking.admin_notes}</p>` : ''}
            </td>
          </tr>

          <!-- Cancelled session details -->
          <tr>
            <td style="padding:6px 32px 0 32px;">
              <h3 style="${h3Style}">Anulowana Sesja</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRows.join('')}
              </table>
            </td>
          </tr>

          <!-- Rebook CTA -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;border-radius:10px;">
                <tr><td style="padding:20px 22px;">
                  <h3 style="color:#FF007F;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;">Chcesz Umówić Się Ponownie?</h3>
                  <p style="margin:0 0 14px 0;color:#f5f0eb;font-size:13px;line-height:1.55;">Możesz w każdej chwili zarezerwować nowy termin. Skontaktuj się ze studiem lub umów się online.</p>
                  <a href="${bookingLink}" style="display:inline-block;background:#FF007F;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,Helvetica,sans-serif;">Umów Ponownie</a>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}">
                <tr><td style="padding:0;">
                  <h3 style="${h3Style}">Gdzie Nas Znaleźć</h3>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${contactRows.join('')}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px 32px;">
              <p style="${mutedStyle}">W razie pytań prosimy o kontakt ze studiem.</p>
              <p style="margin:6px 0 0 0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ anulowano Twoją rezerwację w Romans Tattoo.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via connected Gmail account
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const subject = `Twoja rezerwacja została anulowana — ${dateStr}`;
    const fromName = 'Romans Tattoo';
    const fromEmail = 'tattoo.wolsztyn@gmail.com';
    const toEmail = booking.client_email;

    const textBody = [
      `TWOJA REZERWACJA ZOSTAŁA ANULOWANA — ROMANS TATTOO`,
      ``,
      `Cześć ${firstName},`,
      `informujemy, że Twoja rezerwacja w Romans Tattoo została anulowana.`,
      booking.admin_notes ? `Powód: ${booking.admin_notes}` : '',
      ``,
      `Anulowana sesja:`,
      `  Data:       ${dateStr}`,
      `  Godzina:    ${timeStr}`,
      booking.artist_name ? `  ${isPiercing ? 'Piercer' : 'Tatuażysta'}: ${booking.artist_name}` : '',
      booking.service_name ? `  Usługa:     ${booking.service_name}` : '',
      booking.tattoo_placement ? `  Miejsce:    ${booking.tattoo_placement}` : '',
      ``,
      `Chcesz umówić się ponownie?`,
      `Umów online: ${bookingLink}`,
      `Lub zaloguj się do panelu: ${panelLink}`,
      ``,
      contactRows.length > 0 ? `Gdzie Nas Znaleźć:` : '',
      contact.contact_address_street ? `  Adres:     ${contact.contact_address_street}, ${contact.contact_address_city || ''}` : '',
      contact.contact_phone ? `  Telefon:   ${contact.contact_phone}` : '',
      contact.contact_email ? `  Email:     ${contact.contact_email}` : '',
      contact.contact_instagram_url ? `  Instagram: ${contact.contact_instagram || 'Znajdź nas'} — ${contact.contact_instagram_url}` : '',
      contact.contact_facebook_url ? `  Facebook:  ${contact.contact_facebook || 'Znajdź nas'} — ${contact.contact_facebook_url}` : '',
      ``,
      `W razie pytań prosimy o kontakt ze studiem.`,
    ].filter(Boolean).join('\n').trim();

    await sendViaGmail(accessToken, fromName, fromEmail, toEmail, subject, textBody, htmlBody);

    return Response.json({ success: true, message: 'Cancellation email sent via Gmail' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}