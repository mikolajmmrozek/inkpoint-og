import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const event_type = body.event_type || 'page_view';
    const metadata = body.metadata || {};

    // Log activity
    await base44.asServiceRole.entities.UserLog.create({
      user_id: user.id,
      user_email: user.email,
      event_type,
      metadata,
      user_agent: req.headers.get('user-agent') || '',
    });

    // On login event, update Client record with last_login + user_id
    if (event_type === 'login') {
      const clients = await base44.asServiceRole.entities.Client.filter({ email: user.email });
      if (clients.length > 0) {
        await base44.asServiceRole.entities.Client.update(clients[0].id, {
          last_login: new Date().toISOString(),
          user_id: user.id,
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});