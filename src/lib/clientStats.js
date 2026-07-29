import { base44 } from '@/api/base44Client';

/**
 * Recomputes a client's `total_sessions` from their COMPLETED bookings only.
 * Cancelled / pending / confirmed sessions are NOT counted.
 * Call this after creating, editing, status-changing, or deleting a booking
 * so the stored count stays accurate.
 */
export async function recomputeClientTotalSessions(clientEmail) {
  if (!clientEmail) return;
  const email = clientEmail.toLowerCase().trim();
  try {
    const [bookings, clients] = await Promise.all([
      base44.entities.Booking.filter({ client_email: email }, '-session_date', 1000),
      base44.entities.Client.list('-created_date', 2000),
    ]);
    const client = clients.find(c => (c.email || '').toLowerCase().trim() === email);
    if (!client) return;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    if ((client.total_sessions || 0) !== completedCount) {
      await base44.entities.Client.update(client.id, { total_sessions: completedCount });
    }
  } catch (e) {
    console.error('recomputeClientTotalSessions error:', e);
  }
}