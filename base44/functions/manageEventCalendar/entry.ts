import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  calendarHeaders, ensureArtistCalendar, deterministicId, buildSessionEventBody,
} from '../../shared/eventCore.ts';

// Synchronizacja terminów wydarzeń z kalendarzami Google prowadzących.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'sync_event');
    const headers = await calendarHeaders(base44);
    if (!headers) return Response.json({ error: 'Brak połączenia z Google Calendar.' }, { status: 400 });

    const syncSession = async (event: any, session: any) => {
      const leaderIds: string[] = (session.leader_ids?.length ? session.leader_ids : event.leader_ids) || [];
      if (leaderIds.length === 0) return { session_id: session.id, synced: 0, errors: ['Brak prowadzącego'] };
      if (session.status === 'cancelled' || !session.date) {
        await deleteSessionEvents(session);
        return { session_id: session.id, synced: 0, errors: [] };
      }

      const eventBody = buildSessionEventBody(event, session);
      const stored: any[] = [];
      const errors: string[] = [];

      for (const artistId of leaderIds) {
        try {
          const artist = await base44.asServiceRole.entities.Artist.get(artistId);
          const calendarId = await ensureArtistCalendar(base44, artist, headers);
          const evId = await deterministicId(`evt-${session.id}-${artistId}`);
          const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
          let res = await fetch(`${base}/${encodeURIComponent(evId)}`, {
            method: 'PUT', headers, body: JSON.stringify({ ...eventBody, id: evId }), signal: AbortSignal.timeout(15000),
          });
          if (res.status === 404) {
            res = await fetch(base, {
              method: 'POST', headers, body: JSON.stringify({ ...eventBody, id: evId }), signal: AbortSignal.timeout(15000),
            });
          }
          if (!res.ok) {
            errors.push(`${artist.name}: ${res.status}`);
            continue;
          }
          stored.push({ artist_id: artistId, event_id: evId });
        } catch (e: any) {
          errors.push(`${artistId}: ${e.message}`);
        }
      }

      await base44.asServiceRole.entities.EventSession.update(session.id, { gcal_events: stored });
      return { session_id: session.id, synced: stored.length, errors };
    };

    const deleteSessionEvents = async (session: any) => {
      for (const entry of session.gcal_events || []) {
        try {
          const artist = await base44.asServiceRole.entities.Artist.get(entry.artist_id).catch(() => null);
          const calendarId = artist?.gcal_calendar_id;
          if (!calendarId || !entry.event_id) continue;
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(entry.event_id)}`,
            { method: 'DELETE', headers, signal: AbortSignal.timeout(15000) },
          );
        } catch (_) { /* best effort */ }
      }
      await base44.asServiceRole.entities.EventSession.update(session.id, { gcal_events: [] });
    };

    if (action === 'delete_session') {
      const session = await base44.asServiceRole.entities.EventSession.get(String(body.session_id)).catch(() => null);
      if (!session) return Response.json({ error: 'Nie znaleziono terminu.' }, { status: 404 });
      await deleteSessionEvents(session);
      return Response.json({ deleted: true });
    }

    if (action === 'sync_session') {
      const session = await base44.asServiceRole.entities.EventSession.get(String(body.session_id)).catch(() => null);
      if (!session) return Response.json({ error: 'Nie znaleziono terminu.' }, { status: 404 });
      const event = await base44.asServiceRole.entities.Event.get(session.event_id);
      const result = await syncSession(event, session);
      return Response.json({ results: [result] });
    }

    const event = await base44.asServiceRole.entities.Event.get(String(body.event_id)).catch(() => null);
    if (!event) return Response.json({ error: 'Nie znaleziono wydarzenia.' }, { status: 404 });
    const sessions = await base44.asServiceRole.entities.EventSession.filter({ event_id: event.id });
    const results = [];
    for (const session of sessions) results.push(await syncSession(event, session));
    return Response.json({ results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}