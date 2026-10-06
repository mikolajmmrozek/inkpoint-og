import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  APP_URL, buildAppUrl, sectionStyle, h3Style, pStyle, mutedStyle, buttonStyle,
  detailRow, clientFirstName, fmtDate, fmtPrice, buildContactRows, sendViaGmail,
} from '../../shared/bookingEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept { health_form_id } or { healthFormId } from the caller.
    const formId = body.health_form_id || body.healthFormId;
    if (!formId) {
      return Response.json({ success: false, error: 'No health_form_id' }, { status: 400 });
    }

    const form = await base44.asServiceRole.entities.HealthForm.get(formId);
    if (!form) {
      return Response.json({ success: false, error: 'Health form not found' }, { status: 404 });
    }
    // Skip drafts — confirmation makes sense only for a completed form.
    if (form.is_draft) {
      return Response.json({ success: true, skipped: true, reason: 'draft' });
    }

    const firstName = clientFirstName(form);
    const toEmail = body.to || form.client_email;
    if (!toEmail) {
      return Response.json({ success: false, error: 'No recipient email' }, { status: 400 });
    }

    // Linked booking (optional) — when present, include session details.
    let booking = null;
    if (form.booking_id) {
      try {
        booking = await base44.asServiceRole.entities.Booking.get(form.booking_id);
      } catch (e) { /* ignore — treat as no booking */ }
    }

    // Studio settings
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'contact' });
    const contact = settings.length > 0 ? settings[0] : {};

    // Procedure label
    const procLabel = form.procedure_type === 'PIERCING' ? 'Piercing'
      : form.procedure_type === 'TATUAŻ' ? 'Tatuaż' : 'Zabieg';

    // Check if client has an app account
    let hasAccount = false;
    if (toEmail) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: toEmail }, null, 1);
        hasAccount = users.length > 0;
      } catch (e) { /* default to no account */ }
    }

    // Links — the form preview deep-links into the client panel with the form_id,
    // which auto-opens the full printable PDF document for this specific form.
    const panelLink = buildAppUrl('/panel');
    const loginLink = buildAppUrl('/');
    const formPreviewLink = buildAppUrl(`/panel/health-forms?form_id=${form.id}`);

    // Booking detail rows
    const bookingRows: string[] = [];
    if (booking) {
      const dateStr = booking.session_date ? fmtDate(booking.session_date) : '—';
      bookingRows.push(detailRow('Data', dateStr));
      if (booking.session_time) bookingRows.push(detailRow('Godzina', booking.session_time));
      if (booking.artist_name) bookingRows.push(detailRow('Artysta', booking.artist_name));
      if (booking.service_name) bookingRows.push(detailRow('Usługa', booking.service_name));
      if (booking.tattoo_placement) bookingRows.push(detailRow('Miejsce', booking.tattoo_placement));
    }

    const accountSection = hasAccount
      ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
            <tr><td style="padding:18px 20px;">
              <h3 style="${h3Style}">Twoje Konto</h3>
              <p style="${pStyle}">Zaloguj się, aby przeglądać swoje ankiety, sesje oraz kupować i realizować vouchery.</p>
              <a href="${panelLink}" style="${buttonStyle}color:#ffffff;">Zaloguj się do panelu</a>
            </td></tr>
          </table>`
      : `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
            <tr><td style="padding:18px 20px;">
              <h3 style="${h3Style}">Załóż Konto</h3>
              <p style="${pStyle}">Nie masz jeszcze konta? Załóż je lub zaloguj się, aby móc przeglądać swoje ankiety, sesje oraz kupować i realizować vouchery.</p>
              <a href="${loginLink}" style="${buttonStyle}color:#ffffff;">Załóż konto / Zaloguj się</a>
            </td></tr>
          </table>`;

    const contactRows = buildContactRows(contact);
    const filledDate = form.form_filled_date ? fmtDate(form.form_filled_date) : '—';

    const htmlBody = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Potwierdzenie ankiety zdrowotnej</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Pink header band -->
          <tr>
            <td style="background:#FF007F;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">Dziękujemy za Wypełnienie Ankiety</h1>
              <p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo &middot; Inkflow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="${pStyle}">Cześć ${firstName},</p>
              <p style="${pStyle}">Twoja ankieta zdrowotna została <strong style="color:#0a0a0a;">przyjęta</strong>. Dziękujemy za wypełnienie! Poniżej znajdziesz podsumowanie oraz link do podglądu ankiety w Twoim panelu.</p>
            </td>
          </tr>

          <!-- Form summary -->
          <tr>
            <td style="padding:6px 32px 0 32px;">
              <h3 style="${h3Style}">Podsumowanie Ankiety</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRow('Zabieg', procLabel)}
                ${form.body_placement ? detailRow('Miejsce', form.body_placement) : ''}
                ${detailRow('Data wypełnienia', filledDate)}
                ${form.is_minor ? detailRow('Niepełnoletni', 'Tak (wymaga zgody opiekuna)') : ''}
              </table>
            </td>
          </tr>

          ${booking ? `<!-- Linked session details -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}">
                <tr><td style="padding:0;">
                  <h3 style="${h3Style}">Szczegóły Sesji</h3>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${bookingRows.join('')}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Preview CTA -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;border-radius:10px;">
                <tr><td style="padding:20px 22px;">
                  <h3 style="color:#FF007F;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;">Podgląd Ankiety</h3>
                  <p style="margin:0 0 14px 0;color:#f5f0eb;font-size:13px;line-height:1.55;">Kliknij poniżej, aby zobaczyć pełną treść wypełnionej ankiety w swoim panelu klienta.</p>
                  <a href="${formPreviewLink}" style="display:inline-block;background:#FF007F;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,Helvetica,sans-serif;">Zobacz Ankietę</a>
                </td></tr>
              </table>
            </td>
          </tr>

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

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px 32px;">
              <p style="${mutedStyle}">Do zobaczenia w studiu!</p>
              <p style="margin:6px 0 0 0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ wypełniono ankietę zdrowotną w Romans Tattoo.</p>
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

    const subject = `Potwierdzenie ankiety zdrowotnej — Romans Tattoo`;
    const fromName = 'Romans Tattoo';
    const fromEmail = 'tattoo.wolsztyn@gmail.com';

    // Plain-text alternative
    const textBody = [
      `POTWIERDZENIE ANKIETY ZDROWOTNEJ — ROMANS TATTOO`,
      ``,
      `Cześć ${firstName},`,
      `Twoja ankieta zdrowotna została przyjęta. Dziękujemy za wypełnienie!`,
      ``,
      `Podsumowanie ankiety:`,
      `  Zabieg:           ${procLabel}`,
      form.body_placement ? `  Miejsce:          ${form.body_placement}` : '',
      `  Data wypełnienia:  ${filledDate}`,
      form.is_minor ? `  Niepełnoletni:     Tak (wymaga zgody opiekuna)` : '',
      ...(booking ? [
        ``,
        `Szczegóły sesji:`,
        `  Data:       ${booking.session_date ? fmtDate(booking.session_date) : '—'}`,
        booking.session_time ? `  Godzina:    ${booking.session_time}` : '',
        booking.artist_name ? `  Artysta:    ${booking.artist_name}` : '',
        booking.service_name ? `  Usługa:     ${booking.service_name}` : '',
        booking.tattoo_placement ? `  Miejsce:    ${booking.tattoo_placement}` : '',
      ] : []),
      ``,
      `Podgląd ankiety: ${formPreviewLink}`,
      hasAccount
        ? `Zaloguj się do panelu: ${panelLink}`
        : `Załóż konto lub zaloguj się: ${loginLink}`,
      ``,
      contactRows.length > 0 ? `Gdzie Nas Znaleźć:` : '',
      contact.contact_address_street ? `  Adres:     ${contact.contact_address_street}, ${contact.contact_address_city || ''}` : '',
      contact.contact_phone ? `  Telefon:   ${contact.contact_phone}` : '',
      contact.contact_email ? `  Email:     ${contact.contact_email}` : '',
      ``,
      `Do zobaczenia w studiu!`,
    ].filter(Boolean).join('\n').trim();

    await sendViaGmail(accessToken, fromName, fromEmail, toEmail, subject, textBody, htmlBody);

    return Response.json({ success: true, message: 'Health form confirmation email sent via Gmail', to: toEmail, hasAccount, hasBooking: !!booking });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}