import { base44 } from '@/api/base44Client';

// Pomocnik audytu rezerwacji — każda operacja panelu (admin/artysta) na rezerwacji
// przechodzi przez te funkcje, żeby rekord zapisał, KTO go zmienił.
// Polecamy last_editor* na rekordzie; workflow "Rezerwacja — log audytu"
// zamienia je na wpis w BookingAuditLog (klient / artysta / admin / system).

async function editorPatch() {
  try {
    const user = await base44.auth.me();
    if (!user) return {};
    return {
      last_editor: 'dashboard',
      last_editor_id: user.id,
      last_editor_name: user.full_name || user.email || '',
      last_editor_role: user.role || 'user',
    };
  } catch {
    return {};
  }
}

export async function bookingCreate(data) {
  return base44.entities.Booking.create({ ...data, ...(await editorPatch()) });
}

export async function bookingUpdate(id, changes) {
  return base44.entities.Booking.update(id, { ...changes, ...(await editorPatch()) });
}

export async function bookingDelete(id) {
  // Przed usunięciem stemplujemy rekord danymi usuającego —
  // wpis audytu usunięcia odczyta je z danych usuwanego rekordu.
  try {
    const patch = await editorPatch();
    if (Object.keys(patch).length > 0) await base44.entities.Booking.update(id, patch);
  } catch { /* stempel nieudany — usuwamy mimo to */ }
  return base44.entities.Booking.delete(id);
}