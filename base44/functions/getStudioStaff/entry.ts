import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const staff = users
      .filter(u => u.role === 'admin' || u.role === 'artist')
      .map(u => ({
        id: u.id,
        name: u.full_name || u.email,
        email: u.email || '',
        role: u.role,
      }))
      .filter(u => u.email);

    return Response.json({ staff });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});