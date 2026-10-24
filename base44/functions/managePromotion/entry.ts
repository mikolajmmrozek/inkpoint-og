import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendViaGmail, sectionStyle, h3Style, pStyle, mutedStyle, buttonStyle, detailRow, buildContactRows } from '../../shared/bookingEmail.ts';
import { buildVoucherPdfBase64 } from '../../shared/voucherPdf.ts';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(len = 8) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < len; i++) s += CHARSET[arr[i] % CHARSET.length];
  return s;
}

const FROM_NAME = 'Romans Tattoo';
const FROM_EMAIL = 'tattoo.wolsztyn@gmail.com';

// Dane kontaktowe studia + informacja, czy odbiorca ma już konto w aplikacji.
async function loadEmailContext(base44: any, to: string) {
  let contact: any = {};
  try {
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'contact' });
    if (settings.length > 0) contact = settings[0];
  } catch (_) {}
  let hasAccount = false;
  if (to) {
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: to }, null, 1);
      hasAccount = users.length > 0;
    } catch (_) {}
  }
  return { contact, hasAccount };
}

// Email z voucherem w stylu maili rezerwacyjnych (shared/bookingEmail.ts):
// biała karta, różowa belka nagłówka, sekcja konta (załóż / zaloguj się), dane studia, stopka.
function buildVoucherEmailHtml(p: any, link: string, loginLink: string, panelLink: string, contact: any, hasAccount: boolean, contactRows: string[]): string {
  const isVoucher = p.type === 'voucher';
  const valueStr = p.value_type === 'percent' ? `${p.value}%` : `${Number(p.value).toLocaleString('pl-PL')} PLN`;
  const expiryStr = p.expires_at ? new Date(p.expires_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const accountSection = hasAccount
    ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${sectionStyle}background:#fff5fb;border:1px solid #ffe0ef;border-radius:8px;">
            <tr><td style="padding:18px 20px;">
              <h3 style="${h3Style}">Twoje Konto</h3>
              <p style="${pStyle}">Zaloguj się do swojego panelu, aby przeglądać sesje, vouchery i ankiety.</p>
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

  const qrBlock = isVoucher
    ? `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;border-radius:10px;">
                <tr><td align="center" style="padding:20px 22px;">
                  <h3 style="color:#FF007F;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;">Zrealizuj Voucher</h3>
                  ${p.qr_code_url ? `<img src="${p.qr_code_url}" alt="Kod QR vouchera" width="130" height="130" style="display:block;margin:0 auto 10px auto;background:#ffffff;padding:6px;border-radius:6px;" />` : ''}
                  <p style="margin:0 0 14px 0;color:#f5f0eb;font-size:13px;line-height:1.55;">Pokaż kod przy wizycie albo zeskanuj QR, aby zrealizować voucher.</p>
                  <a href="${link}" style="display:inline-block;background:#FF007F;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,Helvetica,sans-serif;">Zobacz Voucher Online</a>
                </td></tr>
              </table>
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${isVoucher ? 'Twój voucher podarunkowy' : 'Twój kod zniżkowy'}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Pink header band -->
          <tr>
            <td style="background:#FF007F;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">${isVoucher ? 'Twój Voucher Podarunkowy' : 'Twój Kod Zniżkowy'}</h1>
              <p style="margin:6px 0 0 0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;opacity:0.95;">Romans Tattoo &middot; Inkflow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="${pStyle}">Cześć,</p>
              <p style="${pStyle}">${isVoucher
                ? `Prezentujemy Ci <strong style="color:#0a0a0a;">voucher podarunkowy</strong> o wartości <strong style="color:#FF007F;">${valueStr}</strong> do wykorzystania na usługi w naszym studiu.`
                : `Otrzymujesz <strong style="color:#0a0a0a;">kod zniżkowy</strong> o wartości <strong style="color:#FF007F;">${valueStr}</strong> na usługi w naszym studiu.`}</p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:6px 32px 0 32px;">
              <h3 style="${h3Style}">Szczegóły</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRow('Kod', p.code)}
                ${detailRow('Wartość', valueStr)}
                ${expiryStr ? detailRow('Ważny do', expiryStr) : ''}
              </table>
            </td>
          </tr>

          ${qrBlock}

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
              <p style="${mutedStyle}">Dziękujemy za zaufanie!</p>
              <p style="margin:6px 0 0 0;color:#b0b0b0;font-size:11px;">Otrzymujesz tę wiadomość, ponieważ ${isVoucher ? 'otrzymałeś voucher do' : 'otrzymałeś kod zniżkowy do'} Romans Tattoo.${isVoucher ? ' Voucher znajdziesz też w załączniku (PDF).' : ''}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Wersja tekstowa (multipart/alternative) z danymi studia i sekcją konta.
function buildVoucherEmailText(p: any, link: string, loginLink: string, panelLink: string, contact: any, hasAccount: boolean): string {
  const isVoucher = p.type === 'voucher';
  const valueStr = p.value_type === 'percent' ? `${p.value}%` : `${Number(p.value).toLocaleString('pl-PL')} PLN`;
  const expiry = p.expires_at ? new Date(p.expires_at).toLocaleDateString('pl-PL') : '';
  return [
    `ROMANS TATTOO`,
    ``,
    isVoucher ? `Prezentujemy Ci voucher o wartości ${valueStr}.` : `Otrzymujesz kod zniżkowy o wartości ${valueStr}.`,
    ``,
    `  Kod:       ${p.code}`,
    expiry ? `  Ważny do:  ${expiry}` : '',
    ``,
    isVoucher ? `Zobacz voucher: ${link}` : `Zobacz kod: ${link}`,
    ``,
    hasAccount
      ? `Twoje Konto:\nZaloguj się do panelu: ${panelLink}`
      : `Załóż Konto:\nZałóż konto lub zaloguj się: ${loginLink}`,
    ``,
    contact.contact_address_street ? `  Adres:     ${contact.contact_address_street}, ${contact.contact_address_city || ''}` : '',
    contact.contact_phone ? `  Telefon:   ${contact.contact_phone}` : '',
    contact.contact_email ? `  Email:     ${contact.contact_email}` : '',
    contact.contact_instagram_url ? `  Instagram: ${contact.contact_instagram || 'Znajdź nas'} — ${contact.contact_instagram_url}` : '',
    contact.contact_facebook_url ? `  Facebook:  ${contact.contact_facebook || 'Znajdź nas'} — ${contact.contact_facebook_url}` : '',
    ``,
    `Dziękujemy za zaufanie!`,
  ].filter(Boolean).join('\n').trim();
}

// Kompletna wysyłka: kontekst (dane studia + konto odbiorcy), HTML + tekst,
// voucher jako załącznik PDF, wysyłka przez Gmail studia.
async function deliverVoucherEmail(base44: any, p: any, to: string) {
  try {
    const siteUrl = 'https://romanstattoo.base44.app';
    const { contact, hasAccount } = await loadEmailContext(base44, to);
    const link = `${siteUrl}/voucher/${p.code}`;
    const loginLink = siteUrl;
    const panelLink = `${siteUrl}/panel`;
    const contactRows = buildContactRows(contact);
    const subject = p.type === 'voucher' ? 'Twój voucher od Roman Tattoo' : 'Twój kod zniżkowy od Roman Tattoo';
    const htmlBody = buildVoucherEmailHtml(p, link, loginLink, panelLink, contact, hasAccount, contactRows);
    const textBody = buildVoucherEmailText(p, link, loginLink, panelLink, contact, hasAccount);

    // Załącznik: voucher w PDF (tylko vouchery)
    let attachments: any[] = [];
    if (p.type === 'voucher') {
      try {
        const pdf = await buildVoucherPdfBase64(p, contact);
        if (pdf) attachments = [{ filename: `Voucher-${p.code}.pdf`, content: pdf, contentType: 'application/pdf' }];
      } catch (_) { /* brak załącznika zamiast błędu wysyłki */ }
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    await sendViaGmail(accessToken, FROM_NAME, FROM_EMAIL, to, subject, textBody, htmlBody, attachments);
    return { success: true, attachment: attachments.length > 0 };
  } catch (e: any) {
    return { error: e.message };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin';
    const isStaff = isAdmin || user.role === 'artist';
    // lookup + redeem are available to studio staff (admin + artist); all other actions stay admin-only.
    const body = await req.json();
    const action = body.action;
    // Published public domain — used for voucher QR codes and links so scans land on the
    // live site, not the internal build domain (APP_URL may point to the builder domain).
    const appUrl = 'https://romanstattoo.base44.app';

    if (action === 'lookup') {
      if (!isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'Podaj kod' }, { status: 400 });
      // Service role bypasses RLS so studio staff can find bearer vouchers, not just assigned ones.
      const list = await base44.asServiceRole.entities.Promotion.filter({ code });
      const p: any = list.find((x: any) => x.type === 'voucher');
      if (!p) return Response.json({ error: 'Voucher nie istnieje' }, { status: 404 });
      if (p.revoked) return Response.json({ error: 'Voucher odwołany' }, { status: 400 });
      if (p.is_active === false) return Response.json({ error: 'Voucher wyłączony' }, { status: 400 });
      const now = Date.now();
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : 0;
      const graceExp = p.grace_expires_at ? new Date(p.grace_expires_at).getTime() : 0;
      const isGrace = p.is_grace && graceExp > now;
      if (!isGrace && exp && exp < now) return Response.json({ error: 'Voucher wygasł' }, { status: 400 });
      const amount = isGrace ? (p.balance || p.grace_value || p.value || 0) : (p.balance ?? p.value ?? 0);
      if (amount <= 0 && !isGrace) return Response.json({ error: 'Voucher wykorzystany' }, { status: 400 });
      return Response.json({
        voucher: {
          id: p.id, code: p.code, type: p.type,
          value: p.value, balance: p.balance, original_value: p.original_value,
          expires_at: p.expires_at, is_grace: !!isGrace,
          grace_value: p.grace_value, grace_expires_at: p.grace_expires_at,
          usage_mode: p.usage_mode,
        },
        appliedAmount: amount,
        isGrace,
      });
    }

    if (action === 'create') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const type = body.type === 'discount' ? 'discount' : 'voucher';
      const value_type = body.value_type === 'percent' ? 'percent' : 'amount';
      const value = Number(body.value) || 0;
      if (!value || value <= 0) return Response.json({ error: 'Podaj wartość' }, { status: 400 });
      const usage_mode = body.usage_mode === 'multi' ? 'multi' : 'single';
      const expires_at = body.expires_at;
      if (!expires_at) return Response.json({ error: 'Podaj datę ważności' }, { status: 400 });

      // unique code
      let code = (body.code || genCode(8)).toUpperCase();
      let tries = 0;
      while (tries < 5) {
        const existing = await base44.entities.Promotion.filter({ code });
        if (existing.length === 0) break;
        code = genCode(8);
        tries++;
      }

      const assigned_client_email = body.assigned_client_email || '';
      const assignment_permanent = !!body.assignment_permanent;
      const assigned_until = body.assigned_until || '';

      // QR (voucher only) — points to the public home page so any phone scan lands on the
      // studio site, while the code is embedded as ?voucher=CODE for the in-app scanner.
      let qr_code_url = '';
      if (type === 'voucher') {
        const voucherUrl = `${appUrl}/?voucher=${code}`;
        try {
          const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(voucherUrl)}`;
          const imgRes = await fetch(qrApi);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            const file = new File([blob], `${code}.png`, { type: 'image/png' });
            const up: any = await base44.integrations.Core.UploadPublicFile({ file });
            qr_code_url = up.file_url;
          }
        } catch (_e) {}
      }

      const created = await base44.entities.Promotion.create({
        type, code, value_type, value, original_value: value, balance: value,
        usage_mode, assigned_client_email, assigned_until, assignment_permanent,
        expires_at, qr_code_url, status: 'active',
      });

      // optional email
      let emailResult = null;
      if (body.send_email && body.email_to) {
        emailResult = await deliverVoucherEmail(base44, created, body.email_to);
      }

      return Response.json({ promotion: created, email: emailResult });
    }

    if (action === 'update') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const p: any = await base44.entities.Promotion.get(body.promotion_id);
      const updates: any = {};
      if (body.value !== undefined) {
        const v = Number(body.value) || 0;
        updates.value = v;
        // If voucher unused (balance untouched), keep balance/original_value in sync
        if (p.type === 'voucher' && (p.balance === undefined || p.balance === p.original_value || p.balance === p.value)) {
          updates.balance = v;
          updates.original_value = v;
        }
      }
      if (body.value_type !== undefined) updates.value_type = body.value_type === 'percent' ? 'percent' : 'amount';
      if (body.usage_mode !== undefined) updates.usage_mode = body.usage_mode === 'multi' ? 'multi' : 'single';
      if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
      if (body.assigned_client_email !== undefined) updates.assigned_client_email = body.assigned_client_email || '';
      if (body.assignment_permanent !== undefined) updates.assignment_permanent = !!body.assignment_permanent;
      if (body.assigned_until !== undefined) updates.assigned_until = body.assigned_until || '';
      if (body.is_active !== undefined) updates.is_active = !!body.is_active;
      const updated = await base44.entities.Promotion.update(body.promotion_id, updates);
      return Response.json({ promotion: updated });
    }

    if (action === 'extend_grace') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const grace_value = Number(body.grace_value) || 0;
      const grace_expires_at = body.grace_expires_at;
      if (!grace_value || !grace_expires_at) return Response.json({ error: 'Podaj wartość i datę grace' }, { status: 400 });
      const updated = await base44.entities.Promotion.update(body.promotion_id, {
        grace_value, grace_expires_at, is_grace: true, status: 'grace', balance: grace_value,
      });
      return Response.json({ promotion: updated });
    }

    if (action === 'revoke') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await base44.entities.Promotion.update(body.promotion_id, { revoked: true, status: 'revoked' });
      return Response.json({ promotion: updated });
    }

    if (action === 'redeem') {
      if (!isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const promotion_id = body.promotion_id;
      const amount = Math.round((Number(body.amount) || 0) * 100) / 100;
      const booking_id = body.booking_id || '';
      const client_email = (body.client_email || '').toLowerCase();
      if (!promotion_id) return Response.json({ error: 'Brak promotion_id' }, { status: 400 });
      if (!amount || amount <= 0) return Response.json({ error: 'Podaj kwotę' }, { status: 400 });

      // Service role: artists must read/update vouchers they don't own (RLS would hide bearer vouchers).
      const p: any = await base44.asServiceRole.entities.Promotion.get(promotion_id);
      if (!p) return Response.json({ error: 'Voucher nie istnieje' }, { status: 404 });
      if (p.type !== 'voucher') return Response.json({ error: 'Tylko voucher można rozliczyć' }, { status: 400 });
      if (p.revoked) return Response.json({ error: 'Voucher odwołany' }, { status: 400 });
      if (p.is_active === false) return Response.json({ error: 'Voucher wyłączony' }, { status: 400 });
      const now = Date.now();
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : 0;
      const graceExp = p.grace_expires_at ? new Date(p.grace_expires_at).getTime() : 0;
      const isGrace = p.is_grace && graceExp > now;
      if (!isGrace && exp && exp < now) return Response.json({ error: 'Voucher wygasł' }, { status: 400 });

      const currentBalance = isGrace ? (p.balance || p.grace_value || p.value || 0) : (p.balance ?? p.value ?? 0);
      if (amount > currentBalance + 0.01) return Response.json({ error: 'Kwota przekracza saldo vouchera' }, { status: 400 });

      const newBalance = Math.max(0, Math.round((currentBalance - amount) * 100) / 100);
      const fullyUsed = newBalance <= 0;

      const updates: any = { balance: newBalance, used_booking_id: booking_id };
      // assign to client account if exists
      if (client_email && !p.assigned_client_email) {
        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ email: client_email });
          const c = clients[0];
          if (c && c.user_id) {
            updates.assigned_client_email = client_email;
            updates.assignment_permanent = true;
          }
        } catch (_) { /* ignore */ }
      }
      if (fullyUsed) {
        updates.status = 'used';
        updates.used_at = new Date().toISOString();
        if (p.usage_mode !== 'multi') updates.is_active = false;
      } else {
        updates.used_at = new Date().toISOString();
      }
      const updated = await base44.asServiceRole.entities.Promotion.update(promotion_id, updates);
      return Response.json({ promotion: updated, redeemed: amount, balance: newBalance, fullyUsed });
    }

    // Klient dodaje voucher do swojego konta wyłącznie po kodzie.
    if (action === 'claim') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'Podaj kod vouchera' }, { status: 400 });
      const list = await base44.asServiceRole.entities.Promotion.filter({ code });
      const p: any = list.find((x: any) => x.type === 'voucher');
      if (!p) return Response.json({ error: 'Voucher o takim kodzie nie istnieje' }, { status: 404 });
      if (p.revoked) return Response.json({ error: 'Voucher odwołany' }, { status: 400 });
      if (p.is_active === false) return Response.json({ error: 'Voucher wyłączony' }, { status: 400 });
      const now = Date.now();
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : 0;
      const graceExp = p.grace_expires_at ? new Date(p.grace_expires_at).getTime() : 0;
      const isGrace = p.is_grace && graceExp > now;
      if (!isGrace && exp && exp < now) return Response.json({ error: 'Voucher wygasł' }, { status: 400 });
      const amount = isGrace ? (p.balance || p.grace_value || p.value || 0) : (p.balance ?? p.value ?? 0);
      if (amount <= 0 && !isGrace) return Response.json({ error: 'Voucher wykorzystany' }, { status: 400 });
      if (p.assigned_client_email && p.assigned_client_email.toLowerCase() !== String(user.email).toLowerCase()) {
        return Response.json({ error: 'Voucher jest przypisany do innego konta' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Promotion.update(p.id, {
        assigned_client_email: user.email,
        assignment_permanent: true,
      });
      return Response.json({ success: true, code: p.code });
    }

    if (action === 'send_email') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const p: any = await base44.entities.Promotion.get(body.promotion_id);
      const to = body.to || p.assigned_client_email;
      if (!to) return Response.json({ error: 'Brak odbiorcy' }, { status: 400 });
      const emailResult = await deliverVoucherEmail(base44, p, to);
      return Response.json({ email: emailResult });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}