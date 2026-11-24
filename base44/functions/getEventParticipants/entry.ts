import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normEmail } from '../../shared/eventCore.ts';

// Uczestnicy wydarzeń: administrator widzi wszystko, prowadzący tylko przypisane wydarzenia.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const eventId = typeof body.event_id === 'string' ? body.event_id : '';

    const isAdmin = user.role === 'admin';
    let artist: any = null;
    if (!isAdmin) {
      if (user.role !== 'artist') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (user.artist_id) {
        artist = await base44.asServiceRole.entities.Artist.get(user.artist_id).catch(() => null);
      }
      if (!artist) {
        const byEmail = await base44.asServiceRole.entities.Artist.filter({ email: normEmail(user.email) });
        artist = byEmail[0] || null;
      }
      if (!artist) return Response.json({ error: 'Brak powiązanego profilu artysty.' }, { status: 403 });
    }

    let events = await base44.asServiceRole.entities.Event.list('-created_date', 200);
    if (!isAdmin) {
      events = events.filter((e: any) => (e.leader_ids || []).includes(artist.id));
    }
    if (eventId) events = events.filter((e: any) => e.id === eventId);

    const eventIds = events.map((e: any) => e.id);
    if (eventIds.length === 0) return Response.json({ events: [], sessions: [], bookings: [] });

    const sessions = await base44.asServiceRole.entities.EventSession.filter({ event_id: { $in: eventIds } });
    const bookings = await base44.asServiceRole.entities.EventBooking.filter({ event_id: { $in: eventIds } });

    return Response.json({
      events,
      sessions: sessions.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')),
      bookings: bookings.sort((a: any, b: any) => (b.created_date || '').localeCompare(a.created_date || '')),
      artist_id: artist?.id || null,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}