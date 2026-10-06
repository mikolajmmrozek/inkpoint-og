import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  APP_URL, buildAppUrl, sectionStyle, h3Style, pStyle, mutedStyle, linkStyle, buttonStyle,
  detailRow, clientFirstName, fmtDate, buildContactRows, sendViaGmail,
} from '../../shared/bookingEmail.ts';

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

    const eventType = body.event_type || body.event?.type;

    // Two distinct messages:
    // 1) "oczekująca"  — sent when an online-form booking is first created (status pending)
    // 2) "potwierdzona" — sent when the booking becomes confirmed (manual booking, or
    //    studio confirming a pending online booking).
    // The caller can suggest a mode via body.mode ('pending' | 'confirmed'), but the
    // actual booking status decides: a 'pending' suggestion only applies when the booking
    // is still pending; a 'confirmed' suggestion only applies when it's confirmed.
    let mode: 'pending' | 'confirmed';
    if (booking.source === 'online_form' && booking.status === 'pending') {
      // Online-form booking still awaiting studio confirmation.
      mode = 'pending';
    } else if (booking.status === 'confirmed') {
      mode = 'confirmed';
    } else {
      // Neither pending-online nor confirmed — nothing to tell the client yet.
      return Response.json({ success: true, skipped: true, reason: `status=${booking.status}, source=${booking.source}` });
    }
    // Don't send the "oczekująca" notice on updates — only at creation.
    if (mode === 'pending' && eventType && eventType !== 'create') {
      return Response.json({ success: true, skipped: true, reason: 'pending-only-on-create' });
    }
    // Don't re-send the "potwierdzona" notice on every update — only when status changed.
    // The workflow gates this (status must be in changed_fields), so we trust it.

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

    // Before-treatment preparation document link — tattoo vs piercing separately.
    // Only link when a matching document exists and has content.
    let beforeInstructionsLink = '';
    const beforeType = isPiercing ? 'before_piercing' : 'before_tattoo';
    try {
      const instructions = await base44.asServiceRole.entities.Instruction.filter({ type: beforeType });
      if (instructions.length > 0 && instructions[0].content) {
        beforeInstructionsLink = buildAppUrl(`/instructions?type=${beforeType}`);
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
      ? buildAppUrl(`/health-form?token=${booking.health_form_token}`)
      : buildAppUrl(`/health-form?booking_id=${booking.id}`);
    const loginLink = buildAppUrl('/');
    const panelLink = buildAppUrl('/panel');

    // Email-safe styling: inline styles via shared helpers (see base44/shared/bookingEmail.ts).

    // Account CTA section — different copy depending on whether client has an account.
    // Rendered as a compact highlighted block with its own CTA, mirroring the approved PDF.
    const accountSection = hasAccount
      ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
            <tr><td style="padding:18px 20px;">
              <h3 style="${h3Style}">Twoje Konto</h3>
              <p style="${pStyle}">Zaloguj się, aby przeglądać sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
              <a href="${panelLink}" style="${buttonStyle}color:#ffffff;">Zaloguj się do panelu</a>
            </td></tr>
          </table>`
      : `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
            <tr><td style="padding:18px 20px;">
              <h3 style="${h3Style}">Załóż Konto</h3>
              <p style="${pStyle}">Nie masz jeszcze konta? Załóż je lub zaloguj się, aby móc przeglądać sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
              <a href="${loginLink}" style="${buttonStyle}color:#ffffff;">Załóż konto / Zaloguj się</a>
            </td></tr>
          </table>`;

    // Email HTML — compact layout matching the approved PDF reference.
    const priceText = booking.estimated_price ? `${Number(booking.estimated_price).toLocaleString('pl-PL')} PLN` : 'BEZPŁATNIE';
    const firstName = clientFirstName(booking);
    const contactRows = buildContactRows(contact);

    const isPendingMode = mode === 'pending';
    const statusLabel = isPendingMode ? 'OCZEKUJE POTWIERDZENIA' : 'POTWIERDZONA';
    const detailRows: string[] = [
      detailRow('Status', statusLabel),
      detailRow('Data', dateStr),
      detailRow('Godzina', timeStr),
    ];
    if (booking.artist_name && procedureCategory !== 'studio') {
      const artistLabel = isPiercing ? 'Piercer' : 'Tatuażysta';
      detailRows.push(detailRow(artistLabel, booking.artist_name));
    }
    if (booking.service_name) detailRows.push(detailRow('Usługa', booking.service_name));
    if (booking.tattoo_placement) detailRows.push(detailRow('Miejsce', booking.tattoo_placement));
    detailRows.push(detailRow('Cena', priceText));

    const prepareBlock = (!isConsultation && prepareItems.length > 0)
      ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}">
            <tr><td style="padding:0;">
              <h3 style="${h3Style}">Przygotuj Się</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${prepareItems.map((item) => `
                <tr><td style="padding:6px 0;font-size:13px;color:#3a3a3a;border-bottom:1px solid #f0f0f0;">•&nbsp;&nbsp;${item.replace(/<li>(.*?)<\/li>/, '$1')}</td></tr>`).join('')}
              </table>
            </td></tr>
          </table>`
      : '';

    const htmlBody = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Potwierdzenie rezerwacji</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Pink header band -->
          <tr>
            <td style="background:#FF007F;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">${isPendingMode ? 'Otrzymaliśmy Twoje Zgłoszenie' : 'Twoja Rezerwacja Jest Potwierdzona'}</h1>
              <p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo &middot; Inkflow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="${pStyle}">Cześć ${firstName},</p>
              ${isPendingMode
                ? `<p style="${pStyle}">Dziękujemy za zgłoszenie rezerwacji! Twoja sesja ma teraz status <strong style="color:#0a0a0a;">oczekująca</strong> — studio wkrótce ją potwierdzi. O szczegółach poinformujemy Cię w osobnej wiadomości. Oto dane, które podałeś:</p>`
                : `<p style="${pStyle}">Twoja rezerwacja została <strong style="color:#0a0a0a;">potwierdzona</strong> przez studio. Cieszymy się na Twoją wizytę! Oto szczegóły sesji:</p>`}
            </td>
          </tr>

          <!-- Session details -->
          <tr>
            <td style="padding:6px 32px 0 32px;">
              <h3 style="${h3Style}">Szczegóły Sesji</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRows.join('')}
              </table>
            </td>
          </tr>

          ${!isConsultation ? `<!-- Health survey CTA — single prominent button -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;border-radius:10px;">
                <tr><td style="padding:20px 22px;">
                  <h3 style="color:#FF007F;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;">Ankieta Zdrowotna</h3>
                  <p style="margin:0 0 14px 0;color:#f5f0eb;font-size:13px;line-height:1.55;">Wypełnij ankietę online przed wizytą, aby zaoszczędzić czas w studiu. Zajmie to zaledwie kilka minut.</p>
                  <a href="${surveyLink}" style="display:inline-block;background:#FF007F;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,Helvetica,sans-serif;">Wypełnij Ankietę</a>
                </td></tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Account CTA -->
          <tr>
            <td style="padding:0 32px;">
              ${accountSection}
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

          <!-- Preparation checklist -->
          <tr>
            <td style="padding:0 32px;">
              ${prepareBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px 32px;">
              <p style="${mutedStyle}">Dziękujemy za zaufanie!</p>
              <p style="margin:6px 0 0 0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ zarezerwowano sesję w Romans Tattoo.</p>
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

    const subject = isPendingMode
      ? `Otrzymaliśmy Twoje zgłoszenie rezerwacji — ${dateStr}`
      : `Twoja rezerwacja jest potwierdzona — ${dateStr}`;
    const fromName = 'Romans Tattoo';
    const fromEmail = 'tattoo.wolsztyn@gmail.com';
    const toEmail = booking.client_email;

    // Plain-text alternative (multipart/alternative) for clients that don't render HTML.
    const textBody = [
      isPendingMode ? `OTRZYMALIŚMY TWOJE ZGŁOSZENIE — ROMANS TATTOO` : `TWOJA REZERWACJA JEST POTWIERDZONA — ROMANS TATTOO`,
      ``,
      `Cześć ${firstName},`,
      isPendingMode
        ? `Dziękujemy za zgłoszenie rezerwacji! Twoja sesja ma teraz status oczekująca — studio wkrótce ją potwierdzi. Oto dane, które podałeś:`
        : `Twoja rezerwacja została potwierdzona przez studio. Oto szczegóły sesji:`,
      ``,
      `  Status:     ${isPendingMode ? 'OCZEKUJE POTWIERDZENIA' : 'POTWIERDZONA'}`,
      `  Data:       ${dateStr}`,
      `  Godzina:    ${timeStr}`,
      booking.artist_name ? `  Tatuażysta: ${booking.artist_name}` : '',
      booking.service_name ? `  Usługa:     ${booking.service_name}` : '',
      booking.tattoo_placement ? `  Miejsce:    ${booking.tattoo_placement}` : '',
      `  Cena:       ${priceText}`,
      ``,
      (!isConsultation ? `Ankieta Zdrowotna:\nWypełnij ankietę online przed wizytą: ${surveyLink}\n` : ``),
      hasAccount
        ? `Twoje Konto:\nZaloguj się do panelu: ${panelLink}`
        : `Załóż Konto:\nZałóż konto lub zaloguj się: ${loginLink}`,
      ``,
      contactRows.length > 0 ? `Gdzie Nas Znaleźć:` : '',
      contact.contact_address_street ? `  Adres:     ${contact.contact_address_street}, ${contact.contact_address_city || ''}` : '',
      contact.contact_phone ? `  Telefon:   ${contact.contact_phone}` : '',
      contact.contact_email ? `  Email:     ${contact.contact_email}` : '',
      contact.contact_instagram_url ? `  Instagram: ${contact.contact_instagram || 'Znajdź nas'} — ${contact.contact_instagram_url}` : '',
      contact.contact_facebook_url ? `  Facebook:  ${contact.contact_facebook || 'Znajdź nas'} — ${contact.contact_facebook_url}` : '',
      ``,
      `Dziękujemy za zaufanie!`,
    ].filter(Boolean).join('\n').trim();

    await sendViaGmail(accessToken, fromName, fromEmail, toEmail, subject, textBody, htmlBody);

    return Response.json({ success: true, message: 'Email sent via Gmail', hasAccount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}