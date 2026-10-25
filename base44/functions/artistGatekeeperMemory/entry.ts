import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asList } from '../../shared/gatekeeperData.ts';
import { CATEGORIES, KEY_RE, MAX_CONTENT, sanitize, contentHasClientData } from '../../shared/gatekeeperMemoryRules.ts';

// artistGatekeeperMemory — prywatna pamięć Gatekeepera artysty (per artysta).
// Przy pierwszym uruchomieniu (brak wpisów) pamięć startuje od kopii aktualnych
// wyuczonych preferencji Gatekeepera administratorów (GatekeeperMemory, agent 'Gatekeeper') —
// oznaczonych polem seeded_from. Dalsze uczenie tego agenta nie modyfikuje bazy adminów.
// Agent uczy się sam (save wywołuje asystent); artyści nie zarządzają pamięcią z UI.

const AGENT_NAME = 'GatekeeperArtist';
const BASE_STUDIO_ID = 'romanstattoo';

export default async function (req: Request): Promise<Response> {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin';
    const isArtist = user.role === 'artist' && !!user.artist_id;
    if (!isAdmin && !isArtist) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Artysta działa zawsze na własnej pamięci; admin podaje artist_id (nadzór, tylko odczyt)
    const artistId = isArtist ? user.artist_id : sanitize(payload.artist_id);
    if (!artistId) return Response.json({ error: 'Brak artist_id.' }, { status: 400 });
    let artistName = '';
    try {
      const artist = isArtist
        ? await base44.entities.Artist.get(artistId)
        : await base44.asServiceRole.entities.Artist.get(artistId);
      artistName = artist?.name || '';
    } catch (_) {}

    const mem = base44.asServiceRole.entities.ArtistGatekeeperMemory;
    const action = payload.action || 'list';

    if (action === 'list') {
      const fetchCurrent = async () => asList(await mem.filter({ agent_name: AGENT_NAME, artist_id: artistId, is_current: true }));
      let records = await fetchCurrent();
      let seeded = false;

      // Pierwsze uruchomienie: skopiuj aktualną wiedzę Gatekeepera administratorów jako bazę
      if (records.length === 0 && isArtist) {
        const base = asList(await base44.asServiceRole.entities.GatekeeperMemory.filter({
          agent_name: 'Gatekeeper', studio_id: BASE_STUDIO_ID, is_current: true,
        }));
        for (const b of base) {
          await mem.create({
            artist_id: artistId, artist_name: artistName, agent_name: AGENT_NAME,
            memory_key: b.memory_key, category: b.category, content: b.content,
            version: 1, is_current: true, seeded_from: 'admin_gatekeeper',
            author_type: 'assistant', author_name: 'Baza Gatekeepera adminów',
          });
        }
        records = await fetchCurrent();
        seeded = true;
      }

      return Response.json({
        agent_name: AGENT_NAME,
        artist_id: artistId,
        artist_name: artistName,
        seeded_now: seeded,
        memories: records.map(r => ({
          id: r.id, memory_key: r.memory_key, category: r.category, content: r.content,
          version: r.version, seeded_from: r.seeded_from || null,
          author_type: r.author_type, author_name: r.author_name,
          updated_date: r.updated_date || r.created_date,
        })),
      });
    }

    if (action === 'save') {
      if (!isArtist) return Response.json({ error: 'Forbidden — pamięć agenta artysty rozwija się z jego rozmów; zapis jest możliwy wyłącznie w kontekście artysty.' }, { status: 403 });
      const memoryKey = sanitize(payload.memory_key);
      const category = sanitize(payload.category);
      const content = sanitize(payload.content);
      if (!KEY_RE.test(memoryKey)) return Response.json({ error: 'Nieprawidłowy klucz pamięci (3-40 znaków: małe litery, cyfry, podkreślenie).' }, { status: 400 });
      if (!CATEGORIES.includes(category)) return Response.json({ error: 'Kategoria musi być style lub preference.' }, { status: 400 });
      if (content.length < 5 || content.length > MAX_CONTENT) return Response.json({ error: `Treść wpisu musi mieć 5-${MAX_CONTENT} znaków.` }, { status: 400 });
      if (contentHasClientData(content)) {
        return Response.json({ error: 'Pamięć Gatekeepera może zawierać wyłącznie preferencje i styl pracy — bez danych klientów (e-mail, telefon, PESEL).' }, { status: 400 });
      }

      const existing = asList(await mem.filter({ agent_name: AGENT_NAME, artist_id: artistId, memory_key: memoryKey, is_current: true }));
      let nextVersion = 1;
      if (existing.length > 0) {
        const prev = existing[0];
        nextVersion = (prev.version || 1) + 1;
        await mem.update(prev.id, { is_current: false });
      }
      const created = await mem.create({
        artist_id: artistId, artist_name: artistName, agent_name: AGENT_NAME,
        memory_key: memoryKey, category: category, content: content,
        version: nextVersion, is_current: true,
        author_type: 'assistant', author_name: artistName || user.full_name || user.email || '',
      });
      return Response.json({ ok: true, memory_key: memoryKey, version: nextVersion, id: created?.id });
    }

    return Response.json({ error: 'Nieznana akcja. Dostępne: list, save.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}