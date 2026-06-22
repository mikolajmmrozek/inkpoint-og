import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Accept payload from entity automation: { event, data, old_data }
    // data = the booking object
    const booking = body.data;
    
    if (!booking) {
      return Response.json({ success: false, error: 'No booking data in payload' }, { status: 400 });
    }
    
    // Only process bookings created via the online form (by clients themselves)
    if (booking.source !== 'online_form') {
      return Response.json({ success: true, message: 'Skipped: booking not from online form' });
    }
    
    // Create a ContactMessage with booking card type
    // This will appear in the admin's message inbox as a new conversation entry
    const message = await base44.asServiceRole.entities.ContactMessage.create({
      name: booking.client_name || 'Klient',
      email: booking.client_email,
      phone: booking.client_phone || '',
      subject: 'Nowa rezerwacja online',
      message: `Klient utworzył nową rezerwację na dzień ${booking.session_date} o godzinie ${booking.session_time || '—'}.`,
      is_read: false,
      sender_type: 'system',
      message_type: 'booking_card',
      booking_id: booking.id,
    });
    
    return Response.json({ success: true, messageId: message.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});