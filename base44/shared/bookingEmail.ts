// Shared helpers for booking-related emails (confirmation + update).
// Plain module — no Deno.serve. Import and call from entry.ts files.

export const APP_URL = 'https://romanstattoo.base44.app';

/** Normalize a base URL (strip trailing slashes) and join a path safely.
 *  Prevents double-slash links (e.g. //panel/sessions) when the configured
 *  APP_URL secret ends with a trailing slash. */
export function buildAppUrl(path: string = ''): string {
  const envUrl = (typeof Deno !== 'undefined' && Deno.env.get('APP_URL')) || APP_URL;
  const base = String(envUrl).replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export const sectionStyle = 'margin:22px 0 0 0;';
export const h3Style = 'color:#0a0a0a;font-size:11px;margin:0 0 10px 0;text-transform:uppercase;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;';
export const pStyle = 'margin:0 0 8px 0;color:#3a3a3a;font-size:14px;line-height:1.55;';
export const mutedStyle = 'margin:0;color:#7a7a7a;font-size:12px;line-height:1.5;';
export const linkStyle = 'color:#FF007F;text-decoration:none;font-weight:600;';
export const buttonStyle = 'display:inline-block;background:#FF007F;color:#ffffff;padding:14px 30px;text-decoration:none;border-radius:6px;margin:14px 0 4px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,Helvetica,sans-serif;';

export const detailRow = (label: string, value: string) => `
                  <tr>
                    <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0a0a0a;border-bottom:1px solid #f0f0f0;">${label}</td>
                    <td align="right" style="padding:9px 0;font-size:13px;color:#3a3a3a;border-bottom:1px solid #f0f0f0;">${value}</td>
                  </tr>`;

export const contactLine = (label: string, inner: string) =>
  `<tr><td style="padding:5px 0;font-size:12px;font-weight:700;color:#0a0a0a;white-space:nowrap;">${label}</td><td style="padding:5px 0 0 14px;font-size:12px;color:#3a3a3a;">${inner}</td></tr>`;

export const clientFirstName = (booking: any) =>
  (booking?.client_name || 'Kliencie').split(' ')[0];

export const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

export const fmtPrice = (v: any) =>
  (v == null || v === '') ? '' : `${Number(v).toLocaleString('pl-PL')} PLN`;

// Build contact rows from studio settings.
export function buildContactRows(contact: any) {
  const rows: string[] = [];
  if (contact.contact_address_street) rows.push(contactLine('Adres', `${contact.contact_address_street}, ${contact.contact_address_city || ''}`));
  if (contact.contact_phone) rows.push(contactLine('Telefon', `<a href="tel:${contact.contact_phone}" style="${linkStyle}">${contact.contact_phone}</a>`));
  if (contact.contact_email) rows.push(contactLine('Email', `<a href="mailto:${contact.contact_email}" style="${linkStyle}">${contact.contact_email}</a>`));
  if (contact.contact_instagram_url) rows.push(contactLine('Instagram', `<a href="${contact.contact_instagram_url}" style="${linkStyle}">${contact.contact_instagram || 'Znajdź nas'}</a>`));
  if (contact.contact_facebook_url) rows.push(contactLine('Facebook', `<a href="${contact.contact_facebook_url}" style="${linkStyle}">${contact.contact_facebook || 'Znajdź nas'}</a>`));
  return rows;
}

// Wrap Gmail sending: build MIME via MailComposer, base64url-encode, POST to Gmail API.
export async function sendViaGmail(accessToken: string, fromName: string, fromEmail: string, toEmail: string, subject: string, textBody: string, htmlBody: string) {
  const mail = new (await import('npm:nodemailer@6.9.16/lib/mail-composer/index.js')).default({
    from: { name: fromName, address: fromEmail },
    to: toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });
  const messageBytes: Uint8Array = await new Promise((resolve, reject) => {
    mail.compile().build((err: Error | null, msg: Uint8Array) => (err ? reject(err) : resolve(msg)));
  });
  let binary = '';
  for (let i = 0; i < messageBytes.length; i += 0x8000) {
    binary += String.fromCharCode(...messageBytes.subarray(i, i + 0x8000));
  }
  const raw = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Gmail API error: ${error.error?.message || res.statusText}`);
  }
  return true;
}