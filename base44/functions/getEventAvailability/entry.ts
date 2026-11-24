import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { spotsTaken } from '../../shared/eventCore.ts';

// Publiczna dostępność miejsc — zwraca wyłącznie liczby, nigdy dane uczestników.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const eventIds: string[] = Array.isArray(body.event_ids) ? body.event_ids.filter(Boolean) : (body.event_id ? [body.event_id] : []);

    const sessions = eventIds.length > 0
      ? await base44.asServiceRole.entities.EventSession.filter({ event_id: { $in: eventIds } })
      : await base44.asServiceRole.entities.EventSession.list('-date', 500);

    if (sessions.length === 0) return Response.json({ sessions: [] });

    const bookings = await base44.asServiceRole.entities.EventBooking.filter({
      session_id: { $in: sessions.map((s: any) => s.id) },
    });

    return Response.json({
      sessions: sessions.map((s: any) => {
        const capacity = Number(s.capacity) || 0;
        const taken = spotsTaken(bookings, s.id);
        return {
          id: s.id,
          event_id: s.event_id,
          capacity,
          taken,
          left: capacity > 0 ? Math.max(0, capacity - taken) : 0,
          full: capacity > 0 && taken >= capacity,
        };
      }),
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}