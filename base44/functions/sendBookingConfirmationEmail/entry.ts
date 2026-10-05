import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

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

    // Account CTA section — different copy depending on whether client has an account
    const accountSection = hasAccount
      ? `
        <div class="section">
          <h3>Twoje Konto</h3>
          <p>Zaloguj się na swoje konto, aby przeglądać sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
          <a href="${panelLink}" class="cta-button">Zaloguj się do panelu</a>
        </div>`
      : `
        <div class="section">
          <h3>Załóż Konto</h3>
          <p>Nie masz jeszcze konta? Załóż je lub zaloguj się, aby móc przeglądać swoje sesje, prosić o zmianę terminu oraz kupować i realizować vouchery.</p>
          <a href="${loginLink}" class="cta-button">Załóż konto / Zaloguj się</a>
        </div>`;

    // Email HTML
    const htmlBody = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; background: #f9f9f9; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF007F; padding-bottom: 20px; }
          .header h1 { color: #FF007F; margin: 0; font-size: 24px; }
          .section { margin: 20px 0; }
          .section h3 { color: #333; font-size: 16px; margin: 12px 0 8px 0; text-transform: uppercase; font-weight: bold; }
          .section p { margin: 4px 0; color: #666; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #333; }
          .detail-value { color: #666; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #FF007F, #CC0066); color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 2px; margin: 16px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
          .cta-button:hover { opacity: 0.9; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
          .contact-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 3px solid #FF007F; }
          .contact-info p { margin: 4px 0; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Potwierdzenie Rezerwacji</h1>
          </div>

          <div class="section">
            <p>Cześć ${booking.client_name || 'Kliencie'},</p>
            <p>Otrzymaliśmy Twoje zgłoszenie rezerwacji. Oto szczegóły sesji:</p>
          </div>

          <div class="section">
            <h3>Szczegóły Sesji</h3>
            <div class="detail-row">
              <span class="detail-label">Data:</span>
              <span class="detail-value">${dateStr}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Godzina:</span>
              <span class="detail-value">${timeStr}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tatuażysta:</span>
              <span class="detail-value">${booking.artist_name || 'TBD'}</span>
            </div>
            ${booking.service_name ? `
            <div class="detail-row">
              <span class="detail-label">Usługa:</span>
              <span class="detail-value">${booking.service_name}</span>
            </div>` : ''}
            ${booking.tattoo_placement ? `
            <div class="detail-row">
              <span class="detail-label">Miejsce:</span>
              <span class="detail-value">${booking.tattoo_placement}</span>
            </div>` : ''}
            <div class="detail-row">
              <span class="detail-label">Cena:</span>
              <span class="detail-value">${booking.estimated_price ? `${Number(booking.estimated_price).toLocaleString('pl-PL')} PLN` : 'BEZPŁATNIE'}</span>
            </div>
          </div>

          <div class="section">
            <h3>Ankieta Zdrowotna</h3>
            <p>Aby zaoszczędzić czas w studiu, wypełnij naszą ankietę zdrowotną online. Zajmie Ci to zaledwie kilka minut.</p>
            <a href="${surveyLink}" class="cta-button">Wypełnij Ankietę</a>
          </div>

          ${accountSection}

          <div class="section">
            <h3>Gdzie Nas Znaleźć</h3>
            <div class="contact-info">
              ${contact.contact_address_street ? `<p><strong>Adres:</strong> ${contact.contact_address_street}, ${contact.contact_address_city || ''}</p>` : ''}
              ${contact.contact_phone ? `<p><strong>Telefon:</strong> <a href="tel:${contact.contact_phone}" style="color: #FF007F; text-decoration: none;">${contact.contact_phone}</a></p>` : ''}
              ${contact.contact_email ? `<p><strong>Email:</strong> <a href="mailto:${contact.contact_email}" style="color: #FF007F; text-decoration: none;">${contact.contact_email}</a></p>` : ''}
              ${contact.contact_instagram_url ? `<p><strong>Instagram:</strong> <a href="${contact.contact_instagram_url}" style="color: #FF007F; text-decoration: none;">${contact.contact_instagram || 'Znajdź nas'}</a></p>` : ''}
              ${contact.contact_facebook_url ? `<p><strong>Facebook:</strong> <a href="${contact.contact_facebook_url}" style="color: #FF007F; text-decoration: none;">${contact.contact_facebook || 'Znajdź nas'}</a></p>` : ''}
            </div>
          </div>

          <div class="section">
            <h3>Przygotuj Się</h3>
            <ul style="padding-left: 20px; color: #666;">
              ${prepareItems.join('\n              ')}
            </ul>
          </div>

          <div class="footer">
            <p style="margin: 8px 0;">Dziękujemy za zaufanie!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend (Google Calendar connection lacks gmail.send scope)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return Response.json({ success: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Romans Tattoo <noreply@mail.tattoostudio.pl>',
        to: booking.client_email,
        subject: `Potwierdzenie rezerwacji — ${dateStr}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.json();
      return Response.json({ success: false, error: `Resend API error: ${error.message}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent', hasAccount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}