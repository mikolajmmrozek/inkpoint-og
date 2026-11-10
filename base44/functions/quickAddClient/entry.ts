import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const normEmail = (v) => clean(v).toLowerCase();

// Publiczny formularz QR „NOWY KLIENT”.
// Nigdy nie zwraca danych istniejącego klienta — tylko neutralny status.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const firstName = clean(body.first_name);
    const lastName = clean(body.last_name);
    const email = normEmail(body.email);
    const phone = clean(body.phone);

    if (!firstName || !lastName || !email || !phone) {
      return Response.json({ error: 'Imię, nazwisko, e-mail i telefon są wymagane.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Podaj poprawny adres e-mail.' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Client.filter({ email }, '-created_date', 1);
    if (existing.length > 0) {
      // Neutralny komunikat — bez ujawniania jakichkolwiek danych profilu.
      return Response.json({ status: 'exists' });
    }

    await base44.asServiceRole.entities.Client.create({
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      notes: clean(body.notes),
      source: 'qr_form',
      is_read: false,
      total_sessions: 0,
    });

    return Response.json({ status: 'created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}