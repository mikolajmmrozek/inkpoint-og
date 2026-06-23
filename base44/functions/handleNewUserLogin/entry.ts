import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if already notified — flag on User entity
    if (user.first_login_notified) {
      return Response.json({ success: true });
    }

    // Get all admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    // Create notification for each admin
    const notifications = admins.map(admin => ({
      target_email: admin.email,
      title: 'Nowy użytkownik zarejestrował się',
      message: `${user.full_name || user.email} zalogował się w aplikacji po raz pierwszy.`,
      category: 'system',
      link_path: '/dashboard/clients',
    }));

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Mark that we've notified for this user — prevent repeat notifications
    try {
      await base44.asServiceRole.entities.User.update(user.id, { first_login_notified: true });
    } catch (e) {
      console.error('Failed to mark first_login_notified:', e);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('handleNewUserLogin failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});