import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    const booking = data;

    if (!booking) {
      return Response.json({ success: false, error: 'No booking data' }, { status: 400 });
    }

    // Get studio settings
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'contact' });
    const contact = settings.length > 0 ? settings[0] : {};

    // Format date & time
    const sessionDate = new Date(booking.session_date);
    const dateStr = sessionDate.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = booking.session_time || 'TBD';

    // Build survey link (with token)
    const surveyLink = booking.health_form_token
      ? `${Deno.env.get('APP_URL') || 'https://app.base44.app'}/health-form?token=${booking.health_form_token}`
      : '#';

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
            <p>Twoja rezerwacja została <strong>POTWIERDZONA</strong>. Oto szczegóły sesji:</p>
          </div>

          <div class="section">
            <h3>📅 Szczegóły Sesji</h3>
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
            <div class="detail-row">
              <span class="detail-label">Cena:</span>
              <span class="detail-value">${booking.estimated_price ? booking.estimated_price.toLocaleString('pl-PL') : '-'} PLN</span>
            </div>
          </div>

          <div class="section">
            <h3>📋 Ankieta Zdrowotna</h3>
            <p>Aby zaoszczędzić czas w studiu, wypełnij naszą ankietę zdrowotną online. Zajmie Ci to zaledwie kilka minut!</p>
            <a href="${surveyLink}" class="cta-button">Wypełnij Ankietę</a>
            <p style="font-size: 12px; color: #999;">Link jest ważny przez 30 dni od daty rezerwacji.</p>
          </div>

          <div class="section">
            <h3>📍 Gdzie Nas Znaleźć</h3>
            <div class="contact-info">
              ${contact.contact_address_street ? `<p><strong>Adres:</strong> ${contact.contact_address_street}, ${contact.contact_address_city || ''}</p>` : ''}
              ${contact.contact_phone ? `<p><strong>Telefon:</strong> <a href="tel:${contact.contact_phone}" style="color: #FF007F; text-decoration: none;">${contact.contact_phone}</a></p>` : ''}
              ${contact.contact_email ? `<p><strong>Email:</strong> <a href="mailto:${contact.contact_email}" style="color: #FF007F; text-decoration: none;">${contact.contact_email}</a></p>` : ''}
              ${contact.contact_instagram_url ? `<p><strong>Instagram:</strong> <a href="${contact.contact_instagram_url}" style="color: #FF007F; text-decoration: none;">${contact.contact_instagram || 'Znajdź nas'}</a></p>` : ''}
            </div>
          </div>

          <div class="section">
            <h3>⏰ Przygotuj Się</h3>
            <ul style="padding-left: 20px; color: #666;">
              <li>Przyjdź 10-15 minut przed zaplanowaną godziną</li>
              <li>Weź ze sobą dokument tożsamości (obowiązkowy)</li>
              <li>Jeśli to procedura na nieletnim – opiekun musi podpisać zgodę</li>
              <li>Zadbaj o prawidłowe odżywienie i sen przed sesją</li>
            </ul>
          </div>

          <div class="footer">
            <p style="margin: 8px 0;">Dziękujemy za zaufanie! 🎨</p>
            <p style="margin: 0; font-size: 11px;">${contact.contact_instagram_url ? `<a href="${contact.contact_instagram_url}" style="color: #FF007F; text-decoration: none;">Instagram</a>` : ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
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

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});