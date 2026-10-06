import { base44 } from '@/api/base44Client';

/**
 * Recomputes a client's `total_sessions` from their COMPLETED bookings only.
 * Cancelled / pending / confirmed sessions are NOT counted.
 * Call this after creating, editing, status-changing, or deleting a booking
 * so the stored count stays accurate.
 */
export async function recomputeClientTotalSessions(clientEmail, clientName) {
  const email = (clientEmail || '').toLowerCase().trim();
  const name = (clientName || '').trim();
  if (!email && !name) return;
  try {
    const [bookings, clients] = await Promise.all([
      base44.entities.Booking.filter(email ? { client_email: email } : { client_name: name }, '-session_date', 1000),
      base44.entities.Client.list('-created_date', 2000),
    ]);
    // Dopasuj klienta: po emailu (preferowane), inaczej po nazwie.
    const client = email
      ? clients.find(c => (c.email || '').toLowerCase().trim() === email)
      : clients.find(c => (c.name || '').trim() === name);
    if (!client) return;
    // Policz zakończone sesje — dopasuj po emailu, a gdy pusty, po nazwie.
    const completedCount = bookings.filter(b => b.status === 'completed' && (
      email ? true : (b.client_name || '').trim() === name
    )).length;
    if ((client.total_sessions || 0) !== completedCount) {
      await base44.entities.Client.update(client.id, { total_sessions: completedCount });
    }
  } catch (e) {
    console.error('recomputeClientTotalSessions error:', e);
  }
}