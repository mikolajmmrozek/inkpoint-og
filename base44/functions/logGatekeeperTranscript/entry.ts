import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// logGatekeeperTranscript — obserwacyjne gromadzenie wymian z Gatekeepera artystów.
// Anonimizacja odbywa się SERWEROWO przed zapisem: maskowane są e-maile, długie
// ciągi cyfr (telefon/PESEL) oraz imiona i nazwiska klientów powiązanych z sesjami
// danego artysty. Administratorzy przeglądają zapis w panelu (widok Asystenci AI).

const AGENT_NAME = 'GatekeeperArtist';
const INSTRUCTION_VERSION = 'artist-v1';

const asList = (res: any) => Array.isArray(res) ? res : (res?.items || []);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Maskowanie danych osobowych przed trwałym zapisem
function anonymizeText(text: any, clientNames: string[]): string {
  let s = String(text || '');
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');
  s = s.replace(/\d{7,}/g, '[dane]');
  for (const raw of clientNames) {
    const name = (raw || '').trim();
    if (name.length < 3) continue;
    const re = new RegExp(escapeRegExp(name), 'gi');
    s = s.replace(re, '[klient]');
  }
  return s;
}

function trunc(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default async function (req: Request): Promise<Response> {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'artist' || !user.artist_id) {
      return Response.json({ error: 'Forbidden — logowanie dostępne wyłącznie dla artystów.' }, { status: 403 });
    }
    const artistId = user.artist_id;
    let artistName = '';
    try { artistName = (await base44.entities.Artist.get(artistId))?.name || ''; } catch (_) {}

    // Zakres anonimizacji: klienci powiązani z sesjami tego artysty
    const bookings: any[] = [];
    let cursor: any = null;
    for (let i = 0; i < 3; i++) {
      const opts: any = { sort: '-created_date', limit: 500 };
      if (cursor) opts.cursor = cursor;
      const res: any = await base44.entities.Booking.filter({ artist_id: artistId }, opts);
      const items = asList(res);
      bookings.push(...items);
      if (Array.isArray(res) || !res?.has_more || !res?.next_cursor) break;
      cursor = res.next_cursor;
    }
    const clientNames = new Set<string>();
    for (const b of bookings) {
      if (b.client_name) clientNames.add(b.client_name);
    }
    const emails = [...new Set(bookings.map(b => (b.client_email || '').toLowerCase()).filter(Boolean))];
    for (let i = 0; i < emails.length; i += 50) {
      const clients = asList(await base44.entities.Client.filter({ email: { $in: emails.slice(i, i + 50) } }));
      for (const c of clients) {
        if (c.name) clientNames.add(c.name);
        const full = `${c.first_name || ''} ${c.last_name || ''}`.trim();
        if (full && full.length > 3) clientNames.add(full);
        if ((c.first_name || '').length >= 3) clientNames.add(c.first_name);
        if ((c.last_name || '').length >= 3) clientNames.add(c.last_name);
      }
    }

    const userMessage = trunc(anonymizeText(payload.user_message, [...clientNames]), 2000);
    const assistantMessage = trunc(anonymizeText(payload.assistant_message, [...clientNames]), 4000);
    const errorNote = payload.error ? trunc(anonymizeText(payload.error, [...clientNames]), 300) : '';

    const toolCalls = (Array.isArray(payload.tool_calls) ? payload.tool_calls : []).slice(0, 10).map((tc: any) => ({
      name: String(tc?.name || ''),
      status: String(tc?.status || ''),
      arguments: trunc(anonymizeText(tc?.arguments, [...clientNames]), 400),
      result: trunc(anonymizeText(typeof tc?.result === 'string' ? tc?.result : JSON.stringify(tc?.result ?? ''), [...clientNames]), 400),
    }));

    let memoryEntries = 0;
    try {
      const mem = asList(await base44.asServiceRole.entities.ArtistGatekeeperMemory.filter({
        agent_name: AGENT_NAME, artist_id: artistId, is_current: true,
      }));
      memoryEntries = mem.length;
    } catch (_) {}

    await base44.asServiceRole.entities.GatekeeperTranscript.create({
      agent_name: AGENT_NAME,
      conversation_id: String(payload.conversation_id || ''),
      conversation_name: String(payload.conversation_name || '').slice(0, 120),
      artist_id: artistId,
      artist_name: artistName,
      user_id: user.id,
      user_role: 'artist',
      user_message: userMessage,
      assistant_message: assistantMessage,
      tool_calls: toolCalls,
      had_error: !!payload.error,
      error_note: errorNote,
      instruction_version: INSTRUCTION_VERSION,
      memory_entries: memoryEntries,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}