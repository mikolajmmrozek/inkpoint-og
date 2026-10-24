import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ─────────────────────────────────────────────────────────────────────────
// recordBookingAudit — zapisuje wpis historii zmian rezerwacji (BookingAuditLog).
// Wywoływany automatycznie przez workflow "Rezerwacja — log audytu" przy każdym
// utworzeniu, edycji i usunięciu rezerwacji. Określa KTO wykonał operację
// (klient / artysta / admin / system) na podstawie pól last_editor* na rezerwacji,
// zapisuje zmienione pola z poprzednimi wartościami i czytelne podsumowanie.
// Endpoint publiczny — dostęp tylko dla zalogowanego administratora.
// ─────────────────────────────────────────────────────────────────────────

const FIELD_LABELS = {
  session_date: 'datę sesji',
  session_time: 'godzinę rozpoczęcia',
  session_end_time: 'godzinę zakończenia',
  session_duration: 'czas trwania',
  artist_name: 'artystę',
  artist_id: 'artystę',
  service_name: 'usługę',
  service_id: 'usługę',
  client_name: 'dane klienta',
  client_email: 'e-mail klienta',
  client_phone: 'telefon klienta',
  tattoo_description: 'opis projektu',
  tattoo_placement: 'miejsce na ciele',
  reference_images: 'zdjęcia referencyjne',
  estimated_price: 'cenę',
  deposit_amount: 'zaliczkę',
  final_amount: 'kwotę rozliczenia',
  payment_breakdown: 'podział płatności',
  is_settled: 'status rozliczenia',
  status: 'status',
  health_form_completed: 'status ankiety zdrowotnej',
  notes: 'notatki klienta',
  admin_notes: 'notatki admina',
  settled_by_name: 'rozliczającego',
};

// Pola techniczne — nie są ciekawe dla historii zmian
const NOISE_FIELDS = [
  'gcal_event_id', 'form_reminder_hidden',
  'last_editor', 'last_editor_id', 'last_editor_name', 'last_editor_role',
  'created_date', 'updated_date', 'created_by_id',
];

function truncateVal(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.length > 80 ? v.slice(0, 80) + '…' : v;
  if (Array.isArray(v)) return `[${v.length} poz.]`;
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  }
  return String(v);
}

function deriveActor(eventType, data) {
  if (data?.last_editor === 'client') return { type: 'client', name: data?.client_name || 'Klient' };
  if (data?.last_editor === 'change_request') return { type: 'client', name: data?.client_name || 'Klient (prośba o zmianę)' };
  if (data?.last_editor === 'dashboard' || data?.last_editor_id) {
    const isAdmin = data?.last_editor_role === 'admin';
    return {
      type: isAdmin ? 'admin' : 'artist',
      name: data?.last_editor_name || (isAdmin ? 'Admin (panel)' : 'Artysta (panel)'),
    };
  }
  if (eventType === 'create' && data?.source === 'online_form') {
    return { type: 'client', name: data?.client_name || 'Klient (formularz online)' };
  }
  return { type: 'system', name: 'System' };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — funkcja dostępna wyłącznie dla administratorów' }, { status: 403 });

    const body = await req.json();
    const eventType = String(body.event_type || 'update');
    const entityId = String(body.entity_id || '');
    if (!entityId) return Response.json({ error: 'Brak entity_id' }, { status: 400 });

    let data = body.data || null;
    const oldData = body.old_data || null;
    // Rekord zbyt duży dla triggera — pobierz go ponownie (dla delete rekord już nie istnieje)
    if (!data && body.payload_too_large && eventType !== 'delete') {
      data = await base44.asServiceRole.entities.Booking.get(entityId).catch(() => null);
    }

    const changedRaw = Array.isArray(body.changed_fields) ? body.changed_fields : [];
    const changed = changedRaw.filter((f) => !NOISE_FIELDS.includes(f));
    if (eventType === 'update' && changed.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'Tylko pola techniczne' });
    }

    const actor = deriveActor(eventType, data);
    const changes = {};
    for (const f of changed) {
      changes[f] = {
        from: truncateVal(oldData ? oldData[f] : null),
        to: truncateVal(data ? data[f] : null),
      };
    }

    const action = eventType === 'create' ? 'created' : eventType === 'delete' ? 'deleted' : 'updated';
    const actorLabel = actor.type === 'client' ? 'klient' : actor.type === 'artist' ? 'artysta' : actor.type === 'admin' ? 'admin' : 'system';
    const who = actor.name && actor.name.toLowerCase() !== actorLabel ? `${actor.name} (${actorLabel})` : actorLabel;

    let summary = '';
    if (action === 'created') {
      summary = `Sesja utworzona — ${who}`;
    } else if (action === 'deleted') {
      summary = `Rezerwacja usunięta — ${who}`;
    } else {
      const what = changed.map((f) => FIELD_LABELS[f] || f).join(', ');
      summary = `${who} — zmiany: ${what || 'dane sesji'}`;
    }
    if (data?.session_id && (action === 'created' || action === 'deleted')) summary += ` (${data.session_id})`;

    await base44.asServiceRole.entities.BookingAuditLog.create({
      booking_id: entityId,
      session_id: data?.session_id || '',
      client_name: data?.client_name || '',
      artist_name: data?.artist_name || '',
      action,
      actor_type: actor.type,
      actor_name: actor.name || '',
      changed_fields: changed,
      changes,
      summary,
    });

    return Response.json({ ok: true, action, actor_type: actor.type, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}