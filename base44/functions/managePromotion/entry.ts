import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(len = 8) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < len; i++) s += CHARSET[arr[i] % CHARSET.length];
  return s;
}

function buildEmail(p: any, link: string): string {
  const valueStr = p.value_type === 'percent' ? `${p.value}%` : `${p.value} PLN`;
  const isVoucher = p.type === 'voucher';
  const expiry = p.expires_at ? new Date(p.expires_at).toLocaleDateString('pl-PL') : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;color:#F5F0EB;">
    <p style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#FF007F;text-transform:uppercase;margin:0 0 4px;">ROMANS TATTOO</p>
    <h1 style="font-size:28px;font-weight:400;letter-spacing:0.04em;margin:0 0 20px;">${isVoucher ? 'Twój voucher' : 'Twój kod zniżkowy'}</h1>
    <p style="font-size:15px;line-height:1.6;color:#F5F0EB;opacity:0.85;margin:0 0 24px;">
      ${isVoucher ? 'Prezentujemy Ci voucher o wartości' : 'Otrzymujesz kod zniżkowy o wartości'}
      <strong style="color:#FF007F;">${valueStr}</strong>.
    </p>
    <div style="border:0.5px solid #262626;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#888;text-transform:uppercase;margin:0 0 8px;">KOD</p>
      <p style="font-family:monospace;font-size:24px;letter-spacing:0.2em;color:#FF007F;margin:0;">${p.code}</p>
      ${p.qr_code_url ? `<img src="${p.qr_code_url}" alt="QR" style="width:180px;height:180px;margin:16px auto 0;display:block;" />` : ''}
    </div>
    <a href="${link}" style="display:inline-block;background:#FF007F;color:#F5F0EB;font-family:monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">${isVoucher ? 'Zobacz voucher' : 'Zobacz kod'}</a>
    ${expiry ? `<p style="font-family:monospace;font-size:9px;color:#666;margin:24px 0 0;letter-spacing:0.05em;">Ważny do: ${expiry}</p>` : ''}
  </div></body></html>`;
}

async function sendVoucherEmail(to: string, subject: string, html: string) {
  const key = secrets.get('RESEND_API_KEY');
  if (!key) return { error: 'RESEND_API_KEY not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Romans Tattoo <tattoo.wolsztyn@gmail.com>', to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: `Resend error: ${err.message || res.status}` };
    }
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const action = body.action;
    const appUrl = secrets.get('APP_URL') || '';

    if (action === 'create') {
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

      // QR (voucher only)
      let qr_code_url = '';
      if (type === 'voucher') {
        const voucherUrl = `${appUrl}/voucher/${code}`;
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
        const link = `${appUrl}/voucher/${code}`;
        const subject = type === 'voucher' ? 'Twój voucher od Roman Tattoo' : 'Twój kod zniżkowy od Roman Tattoo';
        emailResult = await sendVoucherEmail(body.email_to, subject, buildEmail(created, link));
      }

      return Response.json({ promotion: created, email: emailResult });
    }

    if (action === 'extend_grace') {
      const grace_value = Number(body.grace_value) || 0;
      const grace_expires_at = body.grace_expires_at;
      if (!grace_value || !grace_expires_at) return Response.json({ error: 'Podaj wartość i datę grace' }, { status: 400 });
      const updated = await base44.entities.Promotion.update(body.promotion_id, {
        grace_value, grace_expires_at, is_grace: true, status: 'grace', balance: grace_value,
      });
      return Response.json({ promotion: updated });
    }

    if (action === 'revoke') {
      const updated = await base44.entities.Promotion.update(body.promotion_id, { revoked: true, status: 'revoked' });
      return Response.json({ promotion: updated });
    }

    if (action === 'send_email') {
      const p: any = await base44.entities.Promotion.get(body.promotion_id);
      const to = body.to || p.assigned_client_email;
      if (!to) return Response.json({ error: 'Brak odbiorcy' }, { status: 400 });
      const link = `${appUrl}/voucher/${p.code}`;
      const subject = p.type === 'voucher' ? 'Twój voucher od Roman Tattoo' : 'Twój kod zniżkowy od Roman Tattoo';
      const emailResult = await sendVoucherEmail(to, subject, buildEmail(p, link));
      return Response.json({ email: emailResult });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}