import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload: { event, data }
    const eventType = body.event?.type;
    const msg = body.data;

    if (!msg || eventType !== 'create') {
      return Response.json({ success: true, message: 'Skipped: not a create event' });
    }

    // Skip booking_card and status_change — those are system messages, not direct chat
    if (msg.message_type === 'booking_card' || msg.message_type === 'status_change') {
      return Response.json({ success: true, message: 'Skipped: system message type' });
    }

    const notifications = [];

    if (msg.sender_type === 'client') {
      // Client sent a message → notify shared admin inbox
      const preview = (msg.message || '').slice(0, 80);
      notifications.push({
        target_email: 'tattoo.wolsztyn@gmail.com',
        title: 'Nowa wiadomość',
        message: `${msg.name || 'Klient'}: ${preview}${msg.message && msg.message.length > 80 ? '...' : ''}`,
        category: 'message',
        link_path: '/dashboard/messages',
        link_data: msg.email,
        is_read: false,
      });
    } else if (msg.sender_type === 'admin' && msg.email) {
      // Admin replied → notify the recipient (client or artist)
      const preview = (msg.message || '').slice(0, 80);
      const recipientEmail = msg.email.toLowerCase().trim();
      
      // Check if recipient is an artist or a client (search all users, then match case-insensitive)
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const user = allUsers.find(u => (u.email || '').toLowerCase().trim() === recipientEmail);
      const isArtist = user && user.role === 'artist';
      
      notifications.push({
        target_email: recipientEmail,
        title: isArtist ? 'Nowa wiadomość od studia' : 'Nowa wiadomość ze studia',
        message: `${preview}${msg.message && msg.message.length > 80 ? '...' : ''}`,
        category: 'message',
        link_path: isArtist ? '/artist/messages' : '/panel/messages',
        link_data: msg.email,
        is_read: false,
      });
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ success: true, created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});