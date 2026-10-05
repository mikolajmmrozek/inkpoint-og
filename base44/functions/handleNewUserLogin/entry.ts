import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let roleApplied = false;

    // Mark the client's auth provider as Google on first login.
    // The app uses Google OAuth exclusively — no password login is offered — so any
    // newly authenticated user is a Google user. This lets the profile UI hide the
    // password-change section (Google manages the password).
    try {
      const clients = await base44.asServiceRole.entities.Client.filter({ user_id: user.id });
      if (clients.length > 0 && !clients[0].auth_provider) {
        await base44.asServiceRole.entities.Client.update(clients[0].id, { auth_provider: 'google' });
      }
    } catch (e) {
      console.error('Failed to set auth_provider on client:', e);
    }

    // Check for pending staff invite by email
    const pending = await base44.asServiceRole.entities.PendingStaffInvite.filter({
      email: user.email
    });

    if (pending.length > 0) {
      const invite = pending[0];
      const updateData = { role: invite.role };
      if (invite.artist_id) {
        updateData.artist_id = invite.artist_id;
      }
      if (invite.artist_name) {
        updateData.display_name = invite.artist_name;
      }
      await base44.asServiceRole.entities.User.update(user.id, updateData);
      // Delete the pending invite record
      await base44.asServiceRole.entities.PendingStaffInvite.delete(invite.id);
      roleApplied = true;
    }

    // Notify admins of first login — flag on User entity
    if (!user.first_login_notified) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const notifications = admins.map(admin => ({
        target_email: admin.email,
        title: 'Nowy użytkownik zarejestrował się',
        message: `${user.full_name || user.email} zalogował się w aplikacji po raz pierwszy.`,
        category: 'system',
        link_path: '/dashboard/users',
      }));

      if (notifications.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
      }

      try {
        await base44.asServiceRole.entities.User.update(user.id, { first_login_notified: true });
      } catch (e) {
        console.error('Failed to mark first_login_notified:', e);
      }
    }

    return Response.json({ success: true, roleApplied });
  } catch (error) {
    console.error('handleNewUserLogin failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});