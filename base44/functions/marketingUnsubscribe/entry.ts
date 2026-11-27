import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Wypis z wiadomości marketingowych jednym kliknięciem linku z maila.
// Publiczny endpoint: token z linku (crypto.randomUUID zapisany na profilu klienta)
// jest jedynym dowodem uprawnienia — nie wymagamy logowania ani adresu e-mail.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    if (!token) return Response.json({ ok: false, error: 'Brak tokenu' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const found = await db.Client.filter({ marketing_token: token }, '-created_date', 1);
    const client = found[0];
    if (!client) return Response.json({ ok: false, error: 'Nieprawidlowy link' }, { status: 404 });

    // Idempotentnie: ponowne otwarcie linku tylko potwierdza istniejący wypis.
    if (client.marketing_unsubscribed) return Response.json({ ok: true, already: true });

    const now = new Date().toISOString();
    await db.Client.update(client.id, {
      marketing_unsubscribed: true,
      marketing_unsubscribed_at: now,
      marketing_consent: 'denied',
      marketing_consent_date: now,
      marketing_consent_source: 'unsubscribe',
    });

    return Response.json({ ok: true, already: false });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}