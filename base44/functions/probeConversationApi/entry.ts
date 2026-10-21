export default async function (req) {
  const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.55");
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== "admin") return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id, payload, action } = await req.json();
  const conv = await base44.agents.getConversation(conversation_id);
  if (!conv) return Response.json({ error: "not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const path = `/api/apps/${conv.app_id}/agents/conversations/${conversation_id}`;

  if (action === "delete") {
    const r = await base44.fetchWithAuth(path, {
      method: "DELETE",
      fetch: (p, init) => fetch(new URL(p, origin).toString(), init),
    });
    const gone = await base44.agents.getConversation(conversation_id).then(() => "still-exists").catch(e => "gone:" + String(e?.status || e?.message || e).slice(0, 60));
    return Response.json({ status: r.status, text: (await r.text()).slice(0, 200), gone });
  }

  const r = await base44.fetchWithAuth(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    fetch: (p, init) => fetch(new URL(p, origin).toString(), init),
  });
  const text = await r.text();
  const after = await base44.agents.getConversation(conversation_id);
  return Response.json({
    status: r.status,
    respTitle: (() => { try { return JSON.parse(text).title; } catch { return text.slice(0, 120); } })(),
    afterTitle: after?.title,
    afterMetadata: after?.metadata,
    afterArchived: after?.is_archived,
  });
}