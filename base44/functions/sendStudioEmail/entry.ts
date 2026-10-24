import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';
import { sendViaGmail } from '../../shared/bookingEmail.ts';

// Wysyłka maili ze studia przez zsynchronizowane konto Gmail (tattoo.wolsztyn@gmail.com).
// Zastąpiło Resend. Przyjmuje: { to, subject, body } — body to zwykły tekst lub HTML.

function looksLikeHtml(s: string) {
  return /<\s*(div|p|br|html|body|table|img|a\s)/i.test(s);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function textToHtml(text: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;color:#F5F0EB;font-size:14px;line-height:1.6;">
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#FF007F;text-transform:uppercase;margin:0 0 12px;">ROMANS TATTOO</p>
    ${escapeHtml(text).replace(/\n/g, '<br>')}
  </div></body></html>`;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: 'Brak to, subject lub body' }, { status: 400 });
    }

    const isHtml = looksLikeHtml(body);
    const htmlBody = isHtml ? body : textToHtml(body);
    const textBody = isHtml ? body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ') : body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    await sendViaGmail(accessToken, 'Romans Tattoo', 'tattoo.wolsztyn@gmail.com', to, subject, textBody, htmlBody);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}