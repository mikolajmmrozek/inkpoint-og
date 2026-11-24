import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  ACTIVE_STATUSES, clean, normEmail, spotsTaken, todayIso,
  eventMailHtml, sendEventEmail, eventPublicUrl,
} from '../../shared/eventCore.ts';

// Publiczny zapis na termin wydarzenia. Działa też bez logowania.
// Serwer sam sprawdza dostępność miejsc i duplikaty — klient nie ustala ceny ani statusu.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const eventId = clean(body.event_id);
    const sessionId = clean(body.session_id);
    const firstName = clean(body.first_name);
    const lastName = clean(body.last_name);
    const email = normEmail(body.email);
    const phone = clean(body.phone);
    const notes = clean(body.notes);
    const participants = Math.max(1, Math.min(10, Number(body.participants) || 1));

    if (!eventId || !sessionId) return Response.json({ error: 'Nie wybrano terminu wydarzenia.' }, { status: 400 });
    if (!firstName || !lastName || !email || !phone) {
      return Response.json({ error: 'Imię, nazwisko, e-mail i telefon są wymagane.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Podaj poprawny adres e-mail.' }, { status: 400 });
    }

    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));

    const event = await base44.asServiceRole.entities.Event.get(eventId).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!event || event.status !== 'published') {
      return Response.json({ error: 'To wydarzenie nie jest dostępne.' }, { status: 404 });
    }

    const session = await base44.asServiceRole.entities.EventSession.get(sessionId).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!session || session.event_id !== eventId || session.status === 'cancelled') {
      return Response.json({ error: 'Wybrany termin nie jest już dostępny.' }, { status: 409 });
    }
    if (session.date && session.date < todayIso()) {
      return Response.json({ error: 'Ten termin już się odbył.' }, { status: 409 });
    }

    const existing = await base44.asServiceRole.entities.EventBooking.filter({ session_id: sessionId });
    const duplicate = existing.find((b: any) => normEmail(b.email) === email && ACTIVE_STATUSES.includes(b.status));
    if (duplicate) {
      return Response.json({
        error: 'duplicate',
        message: 'Ten adres e-mail jest już zapisany na wybrany termin.',
      }, { status: 409 });
    }

    const taken = spotsTaken(existing, sessionId);
    const capacity = Number(session.capacity) || 0;
    if (capacity > 0 && taken + participants > capacity) {
      return Response.json({
        error: 'full',
        message: 'Brak wolnych miejsc na wybrany termin.',
      }, { status: 409 });
    }

    const booking = await base44.asServiceRole.entities.EventBooking.create({
      event_id: eventId,
      event_title: event.title,
      session_id: sessionId,
      session_date: session.date,
      session_start_time: session.start_time || '',
      session_end_time: session.end_time || '',
      leader_ids: session.leader_ids?.length ? session.leader_ids : (event.leader_ids || []),
      leader_names: event.leader_names || [],
      first_name: firstName,
      last_name: lastName,
      client_name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      notes,
      user_email: user?.email ? normEmail(user.email) : '',
      participants,
      status: 'pending',
      source: 'online',
    });

    // Kontrola wyścigu: jeśli równoległy zapis przekroczył limit, wycofujemy ten zapis.
    const after = await base44.asServiceRole.entities.EventBooking.filter({ session_id: sessionId });
    if (capacity > 0 && spotsTaken(after, sessionId) > capacity) {
      await base44.asServiceRole.entities.EventBooking.update(booking.id, { status: 'cancelled' });
      return Response.json({ error: 'full', message: 'Brak wolnych miejsc na wybrany termin.' }, { status: 409 });
    }

    await sendEventEmail(base44, {
      to: email,
      subject: `Zapis przyjęty — ${event.title}`,
      text: `Dziękujemy za zapis na ${event.title}, ${session.date} ${session.start_time || ''}. Zgłoszenie oczekuje na potwierdzenie przez studio.`,
      html: eventMailHtml({
        heading: 'Zgłoszenie przyjęte',
        intro: `Dziękujemy, ${firstName}. Twoje miejsce na wydarzeniu zostało zarezerwowane i oczekuje na potwierdzenie przez studio. Odezwiemy się, gdy zapis zostanie potwierdzony.`,
        rows: [
          { label: 'Wydarzenie', value: event.title },
          { label: 'Termin', value: `${session.date}${session.start_time ? ` · ${session.start_time}${session.end_time ? `–${session.end_time}` : ''}` : ''}` },
          { label: 'Miejsce', value: session.location || event.location || '' },
          { label: 'Cena', value: event.price ? `${event.price} zł / osoba` : '' },
          { label: 'Liczba miejsc', value: participants },
        ],
        note: 'Rezerwacja jest wstępna. Miejsce potwierdza administrator studia.',
        url: eventPublicUrl(event.slug || event.id),
      }),
    });

    return Response.json({ status: 'created', booking_id: booking.id });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}