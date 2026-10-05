import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import MailComposer from 'npm:nodemailer@6.9.16/lib/mail-composer/index.js';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept either automation payload { event, data } or frontend payload { bookingId }
    let booking = body.data;
    if (!booking && body.bookingId) {
      booking = await base44.asServiceRole.entities.Booking.get(body.bookingId);
    }

    if (!booking) {
      return Response.json({ success: false, error: 'No booking data' }, { status: 400 });
    }

    // Only send to clients — never when the creator is the client themselves (online form
    // already shows a success screen). We still send for dashboard/artist-created bookings.
    const isClientCreated = booking.source === 'online_form' && body.event?.type !== 'create';
    if (isClientCreated) {
      return Response.json({ success: true, skipped: true });
    }

    // Get studio settings
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'contact' });
    const contact = settings.length > 0 ? settings[0] : {};

    // Check if client has an active app account
    let hasAccount = false;
    if (booking.client_email) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: booking.client_email }, null, 1);
        hasAccount = users.length > 0;
      } catch (e) { /* default to no account */ }
    }

    // Format date & time
    const sessionDate = booking.session_date ? new Date(booking.session_date) : null;
    const dateStr = sessionDate
      ? sessionDate.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const timeStr = booking.session_time || 'TBD';

    // Determine if this is a consultation (no need for guardian/nutrition reminders)
    const isConsultation = /konsultacj/i.test(booking.service_name || '');

    // Determine procedure category — look up the linked Service for its category
    // (tattoo/piercing/studio) so we can link the right preparation document.
    let procedureCategory = '';
    if (booking.service_id) {
      try {
        const svc = await base44.asServiceRole.entities.Service.get(booking.service_id);
        if (svc?.category) procedureCategory = svc.category;
      } catch (e) { /* ignore */ }
    }
    // Fall back to service name hints when no linked service
    if (!procedureCategory) {
      const name = (booking.service_name || '').toLowerCase();
      if (/piercing/.test(name)) procedureCategory = 'piercing';
      else if (/tatu|tatoo|tattoo/.test(name)) procedureCategory = 'tattoo';
    }
    const isPiercing = procedureCategory === 'piercing';
    const isTattoo = procedureCategory === 'tattoo';

    // Check if we already know the client isn't a minor (from a filled health form)
    let knownNotMinor = false;
    try {
      const forms = await base44.asServiceRole.entities.HealthForm.filter({ booking_id: booking.id });
      if (forms.length > 0 && forms[0].is_minor === false) knownNotMinor = true;
    } catch (e) { /* default: unknown */ }

    // Links
    const appUrl = 'https://romanstattoo.base44.app';

    // Before-treatment preparation document link — tattoo vs piercing separately.
    // Only link when a matching document exists and has content.
    let beforeInstructionsLink = '';
    const beforeType = isPiercing ? 'before_piercing' : 'before_tattoo';
    try {
      const instructions = await base44.asServiceRole.entities.Instruction.filter({ type: beforeType });
      if (instructions.length > 0 && instructions[0].content) {
        beforeInstructionsLink = `${appUrl}/instructions?type=${beforeType}`;
      }
    } catch (e) { /* no instruction doc configured */ }

    // Build "Przygotuj się" checklist conditionally
    const prepareItems = [
      '<li>Przyjdź 10-15 minut przed zaplanowaną godziną</li>',
      '<li>Weź ze sobą dokument tożsamości (obowiązkowy)</li>',
    ];
    if (!isConsultation && !knownNotMinor) {
      prepareItems.push('<li>Jeśli jesteś niepełnoletni, przyjdź z opiekunem prawnym w celu podpisania zgody na wykonanie zabiegu</li>');
    }
    if (!isConsultation) {
      prepareItems.push('<li>Zadbaj o prawidłowe odżywienie i sen przed sesją</li>');
    }
    if (beforeInstructionsLink) {
      prepareItems.push(`<li><a href="${beforeInstructionsLink}" style="color: #FF007F; text-decoration: none;">Zobacz jak przygotować się do zabiegu</a></li>`);
    }
    const surveyLink = booking.health_form_token
      ? `${appUrl}/health-form?token=${booking.health_form_token}`
      : `${appUrl}/health-form?booking_id=${booking.id}`;
    const loginLink = `${appUrl}/`;
    const panelLink = `${appUrl}/panel`;

    // Email-safe styling: every style is inline (many mail clients drop <style> blocks)
    const h3Style = 'color:#333333;font-size:16px;margin:12px 0 8px 0;text-transform:uppercase;font-weight:bold;';
    const pStyle = 'margin:4px 0;color:#666666;';
    const linkStyle = 'color:#FF007F;text-decoration:none;';
    const buttonStyle = 'display:inline-block;background:#FF007F;background-image:linear-gradient(135deg,#FF007F,#CC0066);color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:2px;margin:16px 0;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;';
    const detailRow = (label: string, value: string) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-weight:bold;color:#333333;">${label}</td>
                <td align="right" style="padding:8px 0;border-bottom:1px solid #eeeeee;color:#666666;">${value}</td>
              </tr>`;
    const contactLine = (label: string, inner: string) =>
      `<p style="margin:4px 0;font-size:13px;color:#666666;"><strong style="color:#333333;">${label}:</strong> ${inner}</p>`;

    // Account CTA section — different copy depending on whether client has an account
    const accountSection = hasAccount
      ? `
        <div style="margin:20px 0;">
          <h3 style="${h3Style}">Twoje Konto</h3>
          <p style="${pStyle}">Zaloguj się na swoje konto, aby przeglądać sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
          <a href="${panelLink}" style="${buttonStyle}">Zaloguj się do panelu</a>
        </div>`
      : `
        <div style="margin:20px 0;">
          <h3 style="${h3Style}">Załóż Konto</h3>
          <p style="${pStyle}">Nie masz jeszcze konta? Załóż je lub zaloguj się, aby móc przeglądać swoje sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
          <a href="${loginLink}" style="${buttonStyle}">Załóż konto / Zaloguj się</a>
        </div>`;

    // Email HTML
    const priceText = booking.estimated_price ? `${Number(booking.estimated_price).toLocaleString('pl-PL')} PLN` : 'BEZPŁATNIE';
    const htmlBody = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Potwierdzenie rezerwacji</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,Helvetica,sans-serif;color:#333333;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dddddd;">
          <tr>
            <td style="padding:40px;">

              <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #FF007F;padding-bottom:20px;">
                <h1 style="color:#FF007F;margin:0;font-size:24px;">Potwierdzenie Rezerwacji</h1>
              </div>

              <div style="margin:20px 0;">
                <p style="${pStyle}">Cześć ${booking.client_name || 'Kliencie'},</p>
                <p style="${pStyle}">Otrzymaliśmy Twoje zgłoszenie rezerwacji. Oto szczegóły sesji:</p>
              </div>

              <div style="margin:20px 0;">
                <h3 style="${h3Style}">Szczegóły Sesji</h3>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${detailRow('Data:', dateStr)}
                  ${detailRow('Godzina:', timeStr)}
                  ${booking.artist_name ? detailRow('Tatuażysta:', booking.artist_name) : ''}
                  ${booking.service_name ? detailRow('Usługa:', booking.service_name) : ''}
                  ${booking.tattoo_placement ? detailRow('Miejsce:', booking.tattoo_placement) : ''}
                  ${detailRow('Cena:', priceText)}
                </table>
              </div>

              <div style="margin:20px 0;">
                <h3 style="${h3Style}">Ankieta Zdrowotna</h3>
                <p style="${pStyle}">Aby zaoszczędzić czas w studiu, wypełnij naszą ankietę zdrowotną online. Zajmie Ci to zaledwie kilka minut.</p>
                <a href="${surveyLink}" style="${buttonStyle}">Wypełnij Ankietę</a>
              </div>

              ${accountSection}

              <div style="margin:20px 0;">
                <h3 style="${h3Style}">Gdzie Nas Znaleźć</h3>
                <div style="background:#f5f5f5;padding:15px;margin:10px 0;border-left:3px solid #FF007F;">
                  ${contact.contact_address_street ? contactLine('Adres', `${contact.contact_address_street}, ${contact.contact_address_city || ''}`) : ''}
                  ${contact.contact_phone ? contactLine('Telefon', `<a href="tel:${contact.contact_phone}" style="${linkStyle}">${contact.contact_phone}</a>`) : ''}
                  ${contact.contact_email ? contactLine('Email', `<a href="mailto:${contact.contact_email}" style="${linkStyle}">${contact.contact_email}</a>`) : ''}
                  ${contact.contact_instagram_url ? contactLine('Instagram', `<a href="${contact.contact_instagram_url}" style="${linkStyle}">${contact.contact_instagram || 'Znajdź nas'}</a>`) : ''}
                  ${contact.contact_facebook_url ? contactLine('Facebook', `<a href="${contact.contact_facebook_url}" style="${linkStyle}">${contact.contact_facebook || 'Znajdź nas'}</a>`) : ''}
                </div>
              </div>

              ${!isConsultation && prepareItems.length > 0 ? `
              <div style="margin:20px 0;">
                <h3 style="${h3Style}">Przygotuj Się</h3>
                <ul style="padding-left:20px;color:#666666;">
                  ${prepareItems.join('\n                  ')}
                </ul>
              </div>` : ''}

              <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;font-size:12px;color:#999999;text-align:center;">
                <p style="margin:8px 0;">Dziękujemy za zaufanie!</p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email via the connected Gmail account (tattoo.wolsztyn@gmail.com)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build RFC 2822 MIME message — Gmail's API requires base64url-encoded raw.
    const subject = `Potwierdzenie rezerwacji — ${dateStr}`;
    const fromName = 'Romans Tattoo';
    const fromEmail = 'tattoo.wolsztyn@gmail.com';
    const toEmail = booking.client_email;

    // Plain-text alternative (multipart/alternative) for clients that don't render HTML
    const textBody = htmlBody
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(p|h1|h3|tr|li|div)>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();

    // Let a MIME library build the message: it handles UTF-8, encoded-word subject,
    // line wrapping and the multipart structure correctly.
    const mail = new MailComposer({
      from: { name: fromName, address: fromEmail },
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    const messageBytes: Uint8Array = await new Promise((resolve, reject) => {
      mail.compile().build((err: Error | null, msg: Uint8Array) => (err ? reject(err) : resolve(msg)));
    });

    // Gmail API expects the whole RFC 2822 message as base64url
    let binary = '';
    for (let i = 0; i < messageBytes.length; i += 0x8000) {
      binary += String.fromCharCode(...messageBytes.subarray(i, i + 0x8000));
    }
    const raw = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!gmailResponse.ok) {
      const error = await gmailResponse.json().catch(() => ({}));
      return Response.json({ success: false, error: `Gmail API error: ${error.error?.message || gmailResponse.statusText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent via Gmail', hasAccount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}