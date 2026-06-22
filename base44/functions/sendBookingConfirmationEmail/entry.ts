import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
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
      : `${Deno.env.get('APP_URL') || 'https://app.base44.app'}/health-form?booking_id=${booking.id}`;

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

    // Send notification to admin (if admin email exists)
    if (contact.contact_email) {
      const refImages = booking.reference_images && booking.reference_images.length > 0
        ? booking.reference_images.map((url, i) => `<img src="${url}" alt="ref-${i}" style="max-width: 150px; margin: 10px 5px; border: 1px solid #ddd;">`).join('')
        : '<p style="color: #999;">Brak zdjęć referencyjnych</p>';

      const adminHtml = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; background: #f9f9f9; }
            .container { max-width: 700px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF007F; padding-bottom: 20px; }
            .header h1 { color: #FF007F; margin: 0; font-size: 24px; }
            .section { margin: 20px 0; }
            .section h3 { color: #333; font-size: 16px; margin: 12px 0 8px 0; text-transform: uppercase; font-weight: bold; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #333; width: 150px; }
            .detail-value { color: #666; flex: 1; }
            .images-container { border: 1px dashed #ddd; padding: 15px; margin: 10px 0; background: #fafafa; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #FF007F, #CC0066); color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 2px; margin: 16px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nowa Rezerwacja</h1>
            </div>
            <div class="section">
              <h3>📋 Szczegóły Klienta</h3>
              <div class="detail-row"><span class="detail-label">Imię i Nazwisko:</span><span class="detail-value">${booking.client_name || '—'}</span></div>
              <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value"><a href="mailto:${booking.client_email}" style="color: #FF007F; text-decoration: none;">${booking.client_email}</a></span></div>
              <div class="detail-row"><span class="detail-label">Telefon:</span><span class="detail-value">${booking.client_phone || '—'}</span></div>
            </div>
            <div class="section">
              <h3>📅 Szczegóły Sesji</h3>
              <div class="detail-row"><span class="detail-label">Data:</span><span class="detail-value">${dateStr}</span></div>
              <div class="detail-row"><span class="detail-label">Godzina:</span><span class="detail-value">${timeStr}</span></div>
              <div class="detail-row"><span class="detail-label">Tatuażysta:</span><span class="detail-value">${booking.artist_name || 'TBD'}</span></div>
              <div class="detail-row"><span class="detail-label">Miejsce:</span><span class="detail-value">${booking.tattoo_placement || '—'}</span></div>
              <div class="detail-row"><span class="detail-label">Opis:</span><span class="detail-value">${booking.tattoo_description || '—'}</span></div>
              <div class="detail-row"><span class="detail-label">Cena:</span><span class="detail-value">${booking.estimated_price ? booking.estimated_price.toLocaleString('pl-PL') : '-'} PLN</span></div>
            </div>
            <div class="section">
              <h3>🖼️ Referencje Klienta</h3>
              <div class="images-container">${refImages}</div>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${Deno.env.get('APP_URL') || 'https://app.base44.app'}/dashboard/messages" class="cta-button">Przejdź do Wiadomości</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Romans Tattoo <noreply@mail.tattoostudio.pl>',
          to: contact.contact_email,
          subject: `📌 Nowa rezerwacja — ${booking.client_name} (${dateStr})`,
          html: adminHtml,
        }),
      }).catch(e => console.warn('Admin email failed:', e));
    }

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});