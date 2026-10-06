import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  APP_URL, buildAppUrl, sectionStyle, h3Style, pStyle, mutedStyle, linkStyle, buttonStyle,
  detailRow, clientFirstName, fmtDate, fmtPrice, buildContactRows, sendViaGmail,
} from '../../shared/bookingEmail.ts';

// Fields whose change is meaningful enough to mention in the "co się zmieniło" summary.
const TRACKED_FIELDS = [
  { key: 'session_date', label: 'Data' },
  { key: 'session_time', label: 'Godzina' },
  { key: 'artist_name', label: 'Artysta' },
  { key: 'service_name', label: 'Usługa' },
  { key: 'tattoo_placement', label: 'Miejsce' },
];

function fmtValue(key: string, v: any) {
  if (v == null || v === '') return '—';
  if (key === 'session_date') return fmtDate(v);
  if (key === 'estimated_price') return fmtPrice(v);
  return String(v);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept { event, data, old_data, changed_fields } from workflow, or { bookingId, oldBooking } from frontend.
    let booking = body.data;
    let oldBooking = body.old_data || body.oldBooking;
    let changedFields: string[] = body.changed_fields || [];

    if (!booking && body.bookingId) {
      booking = await base44.asServiceRole.entities.Booking.get(body.bookingId);
    }

    if (!booking) {
      return Response.json({ success: false, error: 'No booking data' }, { status: 400 });
    }

    // Only send on actual update events (not create — that's the confirmation email's job).
    const eventType = body.event_type || body.event?.type;
    if (eventType === 'create') {
      return Response.json({ success: true, skipped: true, reason: 'create-not-update' });
    }

    // If the ONLY changed field is status, the confirmation email handles it — skip here.
    if (changedFields.length === 0 && oldBooking) {
      changedFields = TRACKED_FIELDS
        .map(f => f.key)
        .filter(k => JSON.stringify(booking[k]) !== JSON.stringify(oldBooking[k]));
    }
    if (changedFields.includes('status') && changedFields.length === 1) {
      return Response.json({ success: true, skipped: true, reason: 'status-only' });
    }
    // Cancellation has its own dedicated email — skip the generic update email when the
    // booking was cancelled (even if other fields changed alongside status).
    if (booking.status === 'cancelled') {
      return Response.json({ success: true, skipped: true, reason: 'cancelled-has-own-email' });
    }

    // If the client edited the session themselves (description, placement, reference
    // images) from their panel, don't send them an "update" email — they made the
    // change, so notifying them about their own edit is noise.
    if (booking.last_editor === 'client') {
      return Response.json({ success: true, skipped: true, reason: 'client-self-edit' });
    }

    // Determine which tracked fields actually changed.
    const changed = TRACKED_FIELDS.filter(f => {
      if (!changedFields.includes(f.key)) return false;
      if (!oldBooking) return true;
      return JSON.stringify(booking[f.key]) !== JSON.stringify(oldBooking[f.key]);
    });

    if (changed.length === 0) {
      return Response.json({ success: true, skipped: true, reason: 'no-tracked-changes' });
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

    const panelLink = buildAppUrl('/panel');

    // Build "what changed" list — old value shown struck through, new value bold.
    const changeRows = changed.map(f => {
      const oldVal = oldBooking ? fmtValue(f.key, oldBooking[f.key]) : '—';
      const newVal = fmtValue(f.key, booking[f.key]);
      return `<tr>
        <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0a0a0a;border-bottom:1px solid #f0f0f0;">${f.label}</td>
        <td align="right" style="padding:9px 0;font-size:13px;color:#b0b0b0;border-bottom:1px solid #f0f0f0;text-decoration:line-through;">${oldVal}</td>
        <td align="right" style="padding:9px 0 9px 14px;font-size:13px;color:#0a0a0a;border-bottom:1px solid #f0f0f0;font-weight:700;">${newVal}</td>
      </tr>`;
    }).join('');

    // Current full session details
    const dateStr = booking.session_date ? fmtDate(booking.session_date) : '—';
    const timeStr = booking.session_time || 'TBD';
    const priceText = booking.estimated_price ? `${Number(booking.estimated_price).toLocaleString('pl-PL')} PLN` : 'BEZPŁATNIE';
    const firstName = clientFirstName(booking);

    const currentRows: string[] = [
      detailRow('Data', dateStr),
      detailRow('Godzina', timeStr),
    ];
    if (booking.artist_name && procedureCategory !== 'studio') {
      currentRows.push(detailRow(isPiercing ? 'Piercer' : 'Tatuażysta', booking.artist_name));
    }
    if (booking.service_name) currentRows.push(detailRow('Usługa', booking.service_name));
    if (booking.tattoo_placement) currentRows.push(detailRow('Miejsce', booking.tattoo_placement));
    currentRows.push(detailRow('Cena', priceText));

    const contactRows = buildContactRows(contact);

    const htmlBody = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aktualizacja rezerwacji</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#FF007F;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">Twoja Rezerwacja Została Zaktualizowana</h1>
              <p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo &middot; Inkflow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="${pStyle}">Cześć ${firstName},</p>
              <p style="${pStyle}">Studio zaktualizowało szczegóły Twojej rezerwacji. Poniżej znajdziesz, co uległo zmianie, oraz aktualne dane sesji.</p>
            </td>
          </tr>

          <!-- What changed -->
          <tr>
            <td style="padding:6px 32px 0 32px;">
              <h3 style="${h3Style}">Co Się Zmieniło</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${changeRows}
              </table>
            </td>
          </tr>

          <!-- Current details -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}">
                <tr><td style="padding:0;">
                  <h3 style="${h3Style}">Aktualne Szczegóły Sesji</h3>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${currentRows.join('')}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Account CTA -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
                <tr><td style="padding:18px 20px;">
                  <h3 style="${h3Style}">Twoje Konto</h3>
                  <p style="${pStyle}">Zaloguj się do panelu, aby sprawdzić szczegóły sesji, poprosić o inną zmianę terminu lub skontaktować się ze studiem.</p>
                  <a href="${panelLink}" style="${buttonStyle}">Zaloguj się do panelu</a>
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
              <p style="margin:6px 0 0 0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ zaktualizowano Twoją rezerwację w Romans Tattoo.</p>
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

    const subject = `Aktualizacja rezerwacji — ${dateStr}`;
    const fromName = 'Romans Tattoo';
    const fromEmail = 'tattoo.wolsztyn@gmail.com';
    const toEmail = booking.client_email;

    const changeSummary = changed.map(f => {
      const oldVal = oldBooking ? fmtValue(f.key, oldBooking[f.key]) : '—';
      const newVal = fmtValue(f.key, booking[f.key]);
      return `  ${f.label}: ${oldVal} → ${newVal}`;
    }).join('\n');

    const textBody = [
      `TWOJA REZERWACJA ZOSTAŁA ZAKTUALIZOWANA — ROMANS TATTOO`,
      ``,
      `Cześć ${firstName},`,
      `Studio zaktualizowało szczegóły Twojej rezerwacji.`,
      ``,
      `Co się zmieniło:`,
      changeSummary,
      ``,
      `Aktualne szczegóły sesji:`,
      `  Data:       ${dateStr}`,
      `  Godzina:    ${timeStr}`,
      booking.artist_name ? `  ${isPiercing ? 'Piercer' : 'Tatuażysta'}: ${booking.artist_name}` : '',
      booking.service_name ? `  Usługa:     ${booking.service_name}` : '',
      booking.tattoo_placement ? `  Miejsce:    ${booking.tattoo_placement}` : '',
      `  Cena:       ${priceText}`,
      ``,
      `Zaloguj się do panelu: ${panelLink}`,
      ``,
      contactRows.length > 0 ? `Gdzie Nas Znaleźć:` : '',
      contact.contact_address_street ? `  Adres:     ${contact.contact_address_street}, ${contact.contact_address_city || ''}` : '',
      contact.contact_phone ? `  Telefon:   ${contact.contact_phone}` : '',
      contact.contact_email ? `  Email:     ${contact.contact_email}` : '',
      ``,
      `W razie pytań prosimy o kontakt ze studiem.`,
    ].filter(Boolean).join('\n').trim();

    await sendViaGmail(accessToken, fromName, fromEmail, toEmail, subject, textBody, htmlBody);

    return Response.json({ success: true, message: 'Update email sent via Gmail', changedFields: changed.map(f => f.key) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}