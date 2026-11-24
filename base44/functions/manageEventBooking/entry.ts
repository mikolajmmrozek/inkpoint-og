import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  ACTIVE_STATUSES, clean, normEmail, spotsTaken, todayIso,
  eventMailHtml, sendEventEmail, eventPublicUrl,
} from '../../shared/eventCore.ts';

// Zarządzanie zapisami: administrator (wszystko) albo właściciel zapisu (anulowanie własnego).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action);
    const isAdmin = user.role === 'admin';

    const getBooking = async (id: string) => {
      const b = await base44.asServiceRole.entities.EventBooking.get(id).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
      return b;
    };

    if (action === 'cancel_own') {
      const booking = await getBooking(clean(body.booking_id));
      if (!booking) return Response.json({ error: 'Nie znaleziono zapisu.' }, { status: 404 });
      if (normEmail(booking.user_email) !== normEmail(user.email)) {
        return Response.json({ error: 'Brak uprawnień do tego zapisu.' }, { status: 403 });
      }
      const updated = await base44.asServiceRole.entities.EventBooking.update(booking.id, {
        status: 'cancelled',
        confirmed_at: '',
        confirmed_by_name: '',
      });
      const event = await base44.asServiceRole.entities.Event.get(booking.event_id).catch(() => null);
      await sendEventEmail(base44, {
        to: booking.email,
        subject: `Anulowanie zapisu — ${booking.event_title}`,
        text: `Twoje miejsce na ${booking.event_title} (${booking.session_date}) zostało zwolnione.`,
        html: eventMailHtml({
          heading: 'Zapis anulowany',
          intro: 'Twoje miejsce zostało zwolnione, a termin jest ponownie dostępny dla innych osób.',
          rows: [
            { label: 'Wydarzenie', value: booking.event_title },
            { label: 'Termin', value: `${booking.session_date}${booking.session_start_time ? ` · ${booking.session_start_time}` : ''}` },
          ],
          url: event ? eventPublicUrl(event.slug || event.id) : '',
        }),
      });
      return Response.json({ booking: updated });
    }

    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'delete') {
      const booking = await getBooking(clean(body.booking_id));
      if (!booking) return Response.json({ error: 'Nie znaleziono zapisu.' }, { status: 404 });
      await base44.asServiceRole.entities.EventBooking.delete(booking.id);
      return Response.json({ deleted: true });
    }

    if (action === 'add') {
      const eventId = clean(body.event_id);
      const sessionId = clean(body.session_id);
      const firstName = clean(body.first_name);
      const lastName = clean(body.last_name);
      const email = normEmail(body.email);
      if (!eventId || !sessionId || !firstName || !email) {
        return Response.json({ error: 'Wymagane: termin, imię i e-mail.' }, { status: 400 });
      }
      const event = await base44.asServiceRole.entities.Event.get(eventId);
      const session = await base44.asServiceRole.entities.EventSession.get(sessionId);
      const participants = Math.max(1, Number(body.participants) || 1);

      const existing = await base44.asServiceRole.entities.EventBooking.filter({ session_id: sessionId });
      if (existing.some((b: any) => normEmail(b.email) === email && ACTIVE_STATUSES.includes(b.status))) {
        return Response.json({ error: 'Ten e-mail jest już zapisany na ten termin.' }, { status: 409 });
      }
      const capacity = Number(session.capacity) || 0;
      if (capacity > 0 && spotsTaken(existing, sessionId) + participants > capacity) {
        return Response.json({ error: 'Brak wolnych miejsc na tym terminie.' }, { status: 409 });
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
        phone: clean(body.phone),
        notes: clean(body.notes),
        user_email: '',
        participants,
        status: body.status === 'confirmed' ? 'confirmed' : 'pending',
        source: 'dashboard',
        confirmed_by_name: body.status === 'confirmed' ? (user.full_name || user.email) : '',
        confirmed_at: body.status === 'confirmed' ? new Date().toISOString() : '',
      });
      return Response.json({ booking });
    }

    const booking = await getBooking(clean(body.booking_id));
    if (!booking) return Response.json({ error: 'Nie znaleziono zapisu.' }, { status: 404 });

    const patch: any = {};
    if (action === 'update') {
      const d = body.data || {};
      if (d.first_name !== undefined) patch.first_name = clean(d.first_name);
      if (d.last_name !== undefined) patch.last_name = clean(d.last_name);
      if (d.email !== undefined) patch.email = normEmail(d.email);
      if (d.phone !== undefined) patch.phone = clean(d.phone);
      if (d.notes !== undefined) patch.notes = clean(d.notes);
      if (d.participants !== undefined) patch.participants = Math.max(1, Number(d.participants) || 1);
      patch.client_name = `${patch.first_name ?? booking.first_name ?? ''} ${patch.last_name ?? booking.last_name ?? ''}`.trim();
    }

    const nextStatus = action === 'update_status' ? clean(body.status) : (body.data?.status || null);
    if (nextStatus && !['pending', 'confirmed', 'cancelled', 'rejected'].includes(nextStatus)) {
      return Response.json({ error: 'Nieprawidłowy status.' }, { status: 400 });
    }

    if (nextStatus === 'confirmed' && booking.status !== 'confirmed') {
      const siblings = await base44.asServiceRole.entities.EventBooking.filter({ session_id: booking.session_id });
      const session = await base44.asServiceRole.entities.EventSession.get(booking.session_id).catch(() => null);
      const capacity = Number(session?.capacity) || 0;
      const taken = spotsTaken(siblings.filter((b: any) => b.id !== booking.id), booking.session_id);
      if (capacity > 0 && taken + (Number(booking.participants) || 1) > capacity) {
        return Response.json({ error: 'Brak wolnych miejsc, aby potwierdzić ten zapis.' }, { status: 409 });
      }
      patch.confirmed_at = new Date().toISOString();
      patch.confirmed_by_name = user.full_name || user.email;
    }
    if (nextStatus) {
      patch.status = nextStatus;
      if (nextStatus !== 'confirmed') {
        patch.confirmed_at = '';
        patch.confirmed_by_name = '';
      }
    }

    if (Object.keys(patch).length === 0) return Response.json({ booking });

    const updated = await base44.asServiceRole.entities.EventBooking.update(booking.id, patch);

    if (nextStatus && nextStatus !== booking.status) {
      const event = await base44.asServiceRole.entities.Event.get(booking.event_id).catch(() => null);
      const rows = [
        { label: 'Wydarzenie', value: updated.event_title },
        { label: 'Termin', value: `${updated.session_date}${updated.session_start_time ? ` · ${updated.session_start_time}${updated.session_end_time ? `–${updated.session_end_time}` : ''}` : ''}` },
        { label: 'Miejsce', value: (event && (event.location || '')) || '' },
        { label: 'Liczba miejsc', value: updated.participants || 1 },
      ];
      if (nextStatus === 'confirmed') {
        await sendEventEmail(base44, {
          to: updated.email,
          subject: `Potwierdzenie zapisu — ${updated.event_title}`,
          text: `Twoje miejsce na ${updated.event_title} (${updated.session_date}) zostało potwierdzone.`,
          html: eventMailHtml({
            heading: 'Miejsce potwierdzone',
            intro: 'Twoje miejsce na wydarzeniu zostało potwierdzone. Do zobaczenia w studio.',
            rows,
            note: event?.organizer_info || '',
            url: event ? eventPublicUrl(event.slug || event.id) : '',
          }),
        });
      } else if (nextStatus === 'cancelled') {
        await sendEventEmail(base44, {
          to: updated.email,
          subject: `Anulowanie zapisu — ${updated.event_title}`,
          text: `Twój zapis na ${updated.event_title} (${updated.session_date}) został anulowany.`,
          html: eventMailHtml({
            heading: 'Zapis anulowany',
            intro: 'Twój zapis na wydarzenie został anulowany. W razie pytań odpisz na tę wiadomość.',
            rows,
            url: event ? eventPublicUrl(event.slug || event.id) : '',
          }),
        });
      } else if (nextStatus === 'rejected') {
        await sendEventEmail(base44, {
          to: updated.email,
          subject: `Zapis nie został przyjęty — ${updated.event_title}`,
          text: `Niestety nie możemy przyjąć Twojego zapisu na ${updated.event_title} (${updated.session_date}).`,
          html: eventMailHtml({
            heading: 'Zapis nie został przyjęty',
            intro: 'Niestety nie możemy przyjąć Twojego zapisu na to wydarzenie. Napisz do nas, jeśli chcesz wybrać inny termin.',
            rows,
            url: event ? eventPublicUrl(event.slug || event.id) : '',
          }),
        });
      }
    }

    return Response.json({ booking: updated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}