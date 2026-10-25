export default async function (req) {
  // artistManageConversation — zmiana nazwy / archiwizacja rozmów Gatekeepera artysty
  // (agent 'GatekeeperArtist'). Każdy artysta zarządza wyłącznie własnymi rozmowami;
  // funkcja jest całkowicie odseparowana od manageConversation administratorów.
  const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.55");
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== "artist") return Response.json({ error: "Unauthorized" }, { status: 401 });

  let { conversation_id, action, name } = await req.json();

  if (!conversation_id) {
    const list = await base44.agents.listConversations({ agent_name: "GatekeeperArtist" });
    const mine = (list || [])
      .filter(c => c.created_by_id === user.id && !(c.metadata || {}).archived)
      .sort((a, b) => (b.updated_date || b.created_date || "").localeCompare(a.updated_date || a.created_date || ""));
    conversation_id = mine[0]?.id;
  }
  if (!conversation_id) return Response.json({ error: "conversation not found" }, { status: 404 });

  const conv = await base44.agents.getConversation(conversation_id);
  if (!conv || !conv.id) return Response.json({ error: "not found" }, { status: 404 });
  if (conv.created_by_id !== user.id) return Response.json({ error: "forbidden" }, { status: 403 });

  const origin = new URL(req.url).origin;
  const path = `/api/apps/${conv.app_id}/agents/conversations/${conversation_id}`;

  const metadata = (conv.metadata && typeof conv.metadata === "object") ? { ...conv.metadata } : {};
  if (action === "rename") {
    const clean = String(name || "").trim().slice(0, 60);
    if (!clean) return Response.json({ error: "name required" }, { status: 400 });
    metadata.name = clean;
  } else if (action === "archive") {
    metadata.archived = true;
  } else if (action === "unarchive") {
    metadata.archived = false;
  } else {
    return Response.json({ error: "unknown action" }, { status: 400 });
  }

  const r = await base44.fetchWithAuth(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
    fetch: (p, init) => fetch(new URL(p, origin).toString(), init),
  });
  if (!r.ok) return Response.json({ error: "update failed", status: r.status }, { status: 500 });

  const after = await base44.agents.getConversation(conversation_id);
  return Response.json({ ok: true, conversation: after });
}