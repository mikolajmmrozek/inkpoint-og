import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asList } from '../../shared/gatekeeperData.ts';
import { CATEGORIES, KEY_RE, MAX_CONTENT, sanitize, contentHasClientData } from '../../shared/gatekeeperMemoryRules.ts';

const DEFAULT_STUDIO_ID = 'romanstattoo';
const AUTHOR_TYPES = ['assistant', 'admin'];

// Nadrzędny dostęp właściciela platformy to osobny, jawny check (lista PlatformOwner),
// nie rola admina studia — konto studia nie może się same podnieść.
async function isPlatformOwner(base44, email) {
  const owners = asList(await base44.asServiceRole.entities.PlatformOwner.filter({ email: email, is_active: true }));
  return owners.length > 0;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isOwner = await isPlatformOwner(base44, user.email);
    if (!isOwner && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const action = payload.action || 'list';
    const agentName = sanitize(payload.agent_name) || 'Gatekeeper';

    // Izolacja studia: administrator studia działa wyłącznie w ramach własnego studia;
    // właściciel platformy może wskazać studio_id lub zobaczyć wszystkie (null).
    let studioScope = null;
    if (!isOwner) {
      studioScope = DEFAULT_STUDIO_ID;
    } else if (payload.studio_id !== undefined && payload.studio_id !== 'all') {
      studioScope = sanitize(payload.studio_id) || DEFAULT_STUDIO_ID;
    }

    const memory = base44.asServiceRole.entities.GatekeeperMemory;

    if (action === 'list') {
      const query = { agent_name: agentName };
      if (studioScope) query.studio_id = studioScope;
      if (payload.memory_key) query.memory_key = sanitize(payload.memory_key);
      const records = asList(await memory.filter(query));
      if (payload.memory_key) {
        // Pełna historia jednego wpisu (wszystkie wersje)
        const versions = records.sort((a, b) => (b.version || 0) - (a.version || 0));
        return Response.json({ is_platform_owner: isOwner, studio_id: studioScope, memory_key: payload.memory_key, versions });
      }
      const current = records
        .filter(r => r.is_current !== false)
        .map(r => ({
          id: r.id,
          agent_name: r.agent_name,
          studio_id: r.studio_id,
          memory_key: r.memory_key,
          category: r.category,
          content: r.content,
          version: r.version,
          author_type: r.author_type,
          author_name: r.author_name,
          updated_date: r.updated_date || r.created_date,
        }));
      return Response.json({ is_platform_owner: isOwner, studio_id: studioScope, memories: current });
    }

    if (action === 'save') {
      const memoryKey = sanitize(payload.memory_key);
      const category = sanitize(payload.category);
      const content = sanitize(payload.content);
      const authorType = AUTHOR_TYPES.includes(payload.author_type) ? payload.author_type : 'assistant';
      const studioId = studioScope || DEFAULT_STUDIO_ID;

      if (!KEY_RE.test(memoryKey)) return Response.json({ error: 'Nieprawidłowy klucz pamięci (3-40 znaków: małe litery, cyfry, podkreślenie).' }, { status: 400 });
      if (!CATEGORIES.includes(category)) return Response.json({ error: 'Kategoria musi być style lub preference.' }, { status: 400 });
      if (content.length < 5 || content.length > MAX_CONTENT) return Response.json({ error: `Treść wpisu musi mieć 5-${MAX_CONTENT} znaków.` }, { status: 400 });
      if (contentHasClientData(content)) {
        return Response.json({ error: 'Pamięć Gatekeepera może zawierać wyłącznie preferencje i styl pracy — bez danych klientów (e-mail, telefon, PESEL).' }, { status: 400 });
      }

      const existing = asList(await memory.filter({ agent_name: agentName, studio_id: studioId, memory_key: memoryKey, is_current: true }));
      let nextVersion = 1;
      if (existing.length > 0) {
        const prev = existing[0];
        nextVersion = (prev.version || 1) + 1;
        await memory.update(prev.id, { is_current: false });
      }
      const created = await memory.create({
        agent_name: agentName,
        studio_id: studioId,
        memory_key: memoryKey,
        category: category,
        content: content,
        version: nextVersion,
        is_current: true,
        author_type: authorType,
        author_name: user.full_name || user.email || '',
      });
      return Response.json({ ok: true, memory_key: memoryKey, version: nextVersion, id: created?.id });
    }

    if (action === 'restore') {
      const recordId = sanitize(payload.id);
      if (!recordId) return Response.json({ error: 'Brak id wersji do przywrócenia.' }, { status: 400 });
      const record = await memory.get(recordId);
      if (!record) return Response.json({ error: 'Nie znaleziono wersji.' }, { status: 404 });
      if (!isOwner && record.studio_id !== DEFAULT_STUDIO_ID) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const versions = asList(await memory.filter({ agent_name: record.agent_name, studio_id: record.studio_id, memory_key: record.memory_key }));
      const maxVersion = versions.reduce((m, v) => Math.max(m, v.version || 0), 0);
      const current = versions.find(v => v.is_current !== false);
      if (current) await memory.update(current.id, { is_current: false });
      const created = await memory.create({
        agent_name: record.agent_name,
        studio_id: record.studio_id,
        memory_key: record.memory_key,
        category: record.category,
        content: record.content,
        version: maxVersion + 1,
        is_current: true,
        author_type: 'admin',
        author_name: user.full_name || user.email || '',
        source_version: record.version,
      });
      return Response.json({ ok: true, memory_key: record.memory_key, version: maxVersion + 1, restored_from: record.version, id: created?.id });
    }

    if (action === 'delete') {
      const memoryKey = sanitize(payload.memory_key);
      if (!KEY_RE.test(memoryKey)) return Response.json({ error: 'Nieprawidłowy klucz pamięci.' }, { status: 400 });
      const studioId = studioScope || DEFAULT_STUDIO_ID;
      const existing = asList(await memory.filter({ agent_name: agentName, studio_id: studioId, memory_key: memoryKey }));
      if (existing.length === 0) return Response.json({ error: 'Nie znaleziono wpisu.' }, { status: 404 });
      await memory.deleteMany({ agent_name: agentName, studio_id: studioId, memory_key: memoryKey });
      return Response.json({ ok: true, deleted: existing.length });
    }

    return Response.json({ error: 'Nieznana akcja. Dostępne: list, save, restore, delete.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});