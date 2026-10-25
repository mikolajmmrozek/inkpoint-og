import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { TOKEN_TTL_MS, signToken, verifyToken } from '../../shared/gatekeeperConfirm.ts';
import { builtinFields, maskRecord, pick, genSessionId } from '../../shared/gatekeeperData.ts';

// ─────────────────────────────────────────────────────────────────────────
// gatekeeperOps — narzędzie Gatekeepera do zarządzania danymi Dashboard.
// Każde wywołanie weryfikuje po stronie serwera, że caller jest zalogowanym
// administratorem. Mutacje (create/update/delete) działają dwuetapowo:
// 1) wywołanie BEZ confirm_token waliduje dane i zwraca podsumowanie + token
// 2) wywołanie z confirm_token (ten sam payload) wykonuje operację
// Token jest HMAC-iem powiązanym z dokładną treścią operacji i wygasa po 15 min.
// ─────────────────────────────────────────────────────────────────────────

const READ_ONLY = { read: true };
const NO_DELETE = { read: true, create: true, update: true };

const ENTITIES = {
  Booking: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['client_name', 'client_email', 'session_date'],
    fields: ['session_id', 'service_id', 'service_name', 'client_name', 'client_email', 'client_phone', 'artist_id', 'artist_name', 'session_date', 'session_time', 'session_end_time', 'session_duration', 'tattoo_description', 'tattoo_placement', 'reference_images', 'estimated_price', 'deposit_paid', 'deposit_amount', 'final_amount', 'payment_breakdown', 'is_settled', 'status', 'health_form_completed', 'notes', 'admin_notes', 'source', 'last_editor', 'form_reminder_hidden'],
    filter: ['session_id', 'client_name', 'client_email', 'client_phone', 'artist_id', 'artist_name', 'session_date', 'status', 'is_settled', 'health_form_completed'],
    sensitive: ['deposit_amount', 'final_amount', 'payment_breakdown', 'is_settled', 'status'],
  },
  Client: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['first_name'],
    fields: ['first_name', 'last_name', 'name', 'email', 'phone', 'avatar_url', 'notes', 'total_sessions', 'user_id', 'invite_sent', 'invite_sent_date', 'last_login', 'is_read', 'is_blocked', 'auth_provider'],
    filter: ['email', 'phone', 'name', 'first_name', 'last_name', 'user_id', 'is_blocked', 'invite_sent'],
    sensitive: ['is_blocked'],
  },
  Artist: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['name'],
    fields: ['name', 'slug', 'bio', 'specialty', 'photo_url', 'instagram', 'years_experience', 'portfolio_images', 'is_active', 'is_visible', 'bookable_online', 'artist_cut_percent', 'order', 'gcal_calendar_id'],
    filter: ['name', 'slug', 'is_active', 'is_visible', 'bookable_online'],
    sensitive: ['is_active', 'is_visible', 'bookable_online', 'gcal_calendar_id'],
  },
  Service: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['name'],
    fields: ['name', 'category', 'short_description', 'long_description', 'image_url', 'duration_minutes', 'price_type', 'price_fixed', 'price_min', 'price_max', 'artist_ids', 'hidden_from_clients', 'visibility', 'members_only', 'min_advance_booking', 'is_active', 'order'],
    filter: ['name', 'category', 'is_active', 'visibility'],
    sensitive: [],
  },
  Promotion: {
    // create/update delegowane do managePromotion (normalny proces: kod QR, e-mail, salda)
    ops: { read: true, create: true, update: true, delete: true },
    required: ['type', 'value', 'expires_at'],
    fields: ['type', 'code', 'value_type', 'value', 'usage_mode', 'expires_at', 'assigned_client_email', 'assigned_until', 'assignment_permanent', 'send_email', 'email_to', 'is_active', 'revoked', 'grace_value', 'grace_expires_at', 'admin_notes'],
    filter: ['code', 'type', 'status', 'assigned_client_email', 'is_active', 'revoked', 'admin_notes', 'created_date'],
    sensitive: ['value', 'balance', 'status', 'revoked', 'grace_value'],
  },
  ArtistAvailability: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['artist_id', 'type', 'is_available'],
    fields: ['artist_id', 'type', 'day_of_week', 'date', 'start_time', 'end_time', 'is_available', 'note', 'repeat', 'repeat_until'],
    filter: ['artist_id', 'type', 'day_of_week', 'date', 'is_available'],
    sensitive: [],
  },
  SiteSettings: {
    ops: NO_DELETE,
    required: ['key'],
    fields: ['key', 'hero_video_url', 'hero_tagline', 'hero_subtext', 'about_heading', 'about_highlight_word', 'about_paragraph_1', 'about_paragraph_2', 'about_image_url', 'about_stats_number', 'about_stats_text', 'contact_email', 'contact_address_street', 'contact_address_city', 'contact_phone', 'contact_hours', 'contact_instagram', 'contact_instagram_url', 'contact_facebook', 'contact_facebook_url', 'contact_youtube', 'contact_youtube_url', 'contact_tiktok', 'contact_tiktok_url', 'contact_google_maps_url', 'site_logo_url', 'app_icon_url', 'app_description', 'theme_mode', 'primary_color', 'font_package', 'corner_radius', 'border_thickness', 'image_border_style'],
    filter: ['key'],
    sensitive: ['theme_mode', 'primary_color', 'font_package'],
  },
  BlogPost: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['title'],
    fields: ['title', 'slug', 'excerpt', 'content', 'cover_image_url', 'images', 'video_url', 'author_name', 'tags', 'is_published', 'published_at'],
    filter: ['title', 'slug', 'is_published'],
    sensitive: [],
  },
  FAQ: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['question', 'answer'],
    fields: ['question', 'answer', 'order'],
    filter: [],
    sensitive: [],
  },
  TermsAndConditions: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['key'],
    fields: ['key', 'title', 'content', 'last_updated', 'translations'],
    filter: ['key'],
    sensitive: ['content'],
  },
  Instruction: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['type', 'title'],
    fields: ['type', 'title', 'content', 'translations'],
    filter: ['type', 'title'],
    sensitive: ['content'],
  },
  HealthFormTemplate: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['key'],
    fields: ['key', 'section_intros', 'medical_fields', 'procedure_questions', 'declaration_of_will', 'declaration_fields', 'consent_fields'],
    filter: ['key'],
    sensitive: [],
  },
  FeedbackSurveyConfig: {
    ops: NO_DELETE,
    required: ['key'],
    fields: ['key', 'intro_text', 'thank_you_text', 'email_subject', 'email_body', 'question_overall', 'question_artist', 'question_studio', 'question_cleanliness', 'question_value', 'question_short_review', 'question_full_review', 'show_rating_studio', 'show_rating_cleanliness', 'show_rating_value', 'show_photo_upload'],
    filter: ['key'],
    sensitive: [],
  },
  Feedback: {
    ops: { read: true, update: true, delete: true },
    required: [],
    fields: ['client_name', 'client_email', 'artist_id', 'artist_name', 'short_review', 'full_review', 'tattoo_photo_url', 'is_published', 'admin_note'],
    filter: ['client_email', 'artist_id', 'artist_name', 'is_published', 'booking_id'],
    sensitive: ['is_published'],
  },
  ContactMessage: {
    ops: { read: true, update: true, delete: true },
    required: [],
    fields: ['is_read', 'subject', 'message', 'booking_id'],
    filter: ['email', 'is_read', 'sender_type', 'booking_id'],
    sensitive: [],
  },
  Notification: {
    ops: { read: true, create: true, update: true, delete: true },
    required: ['target_email', 'title', 'message'],
    fields: ['target_email', 'title', 'message', 'category', 'link_path', 'booking_id', 'is_read'],
    filter: ['target_email', 'is_read', 'category', 'booking_id'],
    sensitive: [],
  },
  ChangeRequest: {
    ops: READ_ONLY, // rozstrzyganie próśb idzie przez panel (własne maile i procesy)
    required: [],
    fields: [],
    filter: ['booking_id', 'session_id', 'client_email', 'artist_id', 'status'],
    sensitive: [],
  },
  ArtistCommissionHistory: {
    ops: { read: true, create: true, update: true },
    required: ['artist_id', 'cut_percent', 'effective_from'],
    fields: ['artist_id', 'artist_name', 'cut_percent', 'effective_from', 'note'],
    filter: ['artist_id', 'effective_from'],
    sensitive: ['cut_percent'],
  },
  PendingStaffInvite: {
    ops: { read: true, create: true, delete: true },
    required: ['email', 'role'],
    fields: ['email', 'role', 'artist_id', 'artist_name'],
    filter: ['email', 'role'],
    sensitive: ['email', 'role'], // cała operacja wrażliwa — zaproszenie daje dostęp do aplikacji
  },
  HealthForm: {
    ops: READ_ONLY, // zapis ankiet wyłącznie przez publiczny formularz klienta
    required: [],
    fields: [],
    filter: ['client_email', 'client_name', 'booking_id', 'is_draft', 'is_read', 'form_number', 'procedure_type'],
    sensitive: [],
    mask: ['pesel', 'id_document', 'address_street', 'address_city', 'address_postal_code', 'date_of_birth', 'client_signature'],
    maskPattern: /(_desc|description)$/,
  },
  GuardianConsentForm: {
    ops: READ_ONLY,
    required: [],
    fields: [],
    filter: ['health_form_id', 'booking_id', 'guardian_name'],
    sensitive: [],
    mask: ['guardian_phone', 'guardian_signature', 'minor_date_of_birth'],
    maskPattern: null,
  },
  UserLog: {
    ops: READ_ONLY,
    required: [],
    fields: [],
    filter: ['user_id', 'user_email', 'event_type'],
    sensitive: [],
  },
  User: {
    ops: READ_ONLY, // konta użytkowników zarządza platforma (zaproszenia z panelu Użytkownicy)
    required: [],
    fields: [],
    filter: ['email', 'role'],
    sensitive: [],
  },
  BookingAuditLog: {
    ops: READ_ONLY, // niezmienny log audytu rezerwacji — wyłącznie odczyt
    required: [],
    fields: ['booking_id', 'session_id', 'client_name', 'artist_name', 'action', 'actor_type', 'actor_name', 'changed_fields', 'changes', 'summary'],
    filter: ['booking_id', 'session_id', 'action', 'actor_type', 'client_name'],
    sensitive: [],
  },
};

function pickSummary(record, cfg) {
  // Skrócony podsumowujący widok rekordu (bez długich treści)
  const out = {};
  for (const k of Object.keys(record)) {
    if (builtinFields.includes(k)) { out[k] = record[k]; continue; }
    const v = record[k];
    if (typeof v === 'string' && v.length > 120) { out[k] = v.slice(0, 120) + '…'; continue; }
    out[k] = v;
  }
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Weryfikacja roli po stronie serwera — niezależnie od instrukcji AI
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — operacje dostępne wyłącznie dla administratorów' }, { status: 403 });

    const body = await req.json();
    const action = String(body.action || '');
    const entityName = String(body.entity || '');
    const cfg = Object.prototype.hasOwnProperty.call(ENTITIES, entityName) ? ENTITIES[entityName] : null;
    if (!cfg) {
      return Response.json({ error: `Nieznana encja: "${entityName}". Dostępne: ${Object.keys(ENTITIES).join(', ')}` }, { status: 400 });
    }
    const ent = base44.entities[entityName];

    // ── ODCZYT: search ──────────────────────────────────────────────
    if (action === 'search') {
      if (!cfg.ops.read) return Response.json({ error: 'Encja tylko do odczytu w innym kontekście' }, { status: 400 });
      const query = body.filters || {};
      const badFilters = Object.keys(query).filter(k => !cfg.filter.includes(k));
      if (badFilters.length > 0) {
        return Response.json({ error: `Niedozwolone pola filtra: ${badFilters.join(', ')}. Dozwolone: ${cfg.filter.join(', ') || '(brak filtrów)'}` }, { status: 400 });
      }
      const rawSort = typeof body.sort === 'string' ? body.sort : '-created_date';
      const sortField = rawSort.replace(/^-/, '');
      const allowedSort = [...new Set([...cfg.fields, ...cfg.filter, ...builtinFields, 'form_filled_date'])];
      if (!allowedSort.includes(sortField)) {
        return Response.json({ error: `Niedozwolone sortowanie: ${rawSort}` }, { status: 400 });
      }
      const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);
      let result: any = await ent.filter(query, { sort: rawSort, limit });
      if (Array.isArray(result)) {
        const items = result.slice(0, limit).map(r => maskRecord(r, cfg, !!body.include_sensitive));
        return Response.json({ entity: entityName, items, count: items.length, next_cursor: null, has_more: false, note: !body.include_sensitive && (cfg.mask || cfg.maskPattern) ? 'Pola wrażliwe (PESEL, adres, dane medyczne, podpisy) ukryte — przekaż include_sensitive=true, aby je pobrać.' : undefined });
      }
      const items = (result.items || []).map(r => maskRecord(r, cfg, !!body.include_sensitive));
      return Response.json({
        entity: entityName, items, count: items.length,
        next_cursor: result.next_cursor || null, has_more: !!result.has_more,
        note: !body.include_sensitive && (cfg.mask || cfg.maskPattern) ? 'Pola wrażliwe (PESEL, adres, dane medyczne, podpisy) ukryte — przekaż include_sensitive=true, aby je pobrać.' : undefined,
      });
    }

    // ── ODCZYT: get ─────────────────────────────────────────────────
    if (action === 'get') {
      if (!cfg.ops.read) return Response.json({ error: 'Encja tylko do odczytu w innym kontekście' }, { status: 400 });
      if (!body.id) return Response.json({ error: 'Brak id rekordu' }, { status: 400 });
      const record = await ent.get(body.id);
      if (!record) return Response.json({ error: 'Rekord nie istnieje' }, { status: 404 });
      return Response.json({ entity: entityName, record: maskRecord(record, cfg, !!body.include_sensitive) });
    }

    // ── MUTACJE: create / update / delete (dwuetapowe) ───────────────
    const isMutation = action === 'create' || action === 'update' || action === 'delete';
    if (!isMutation) return Response.json({ error: `Nieznana akcja: "${action}"` }, { status: 400 });
    if (!cfg.ops[action]) {
      return Response.json({ error: `Operacja "${action}" niedostępna dla encji ${entityName}.` + (entityName === 'HealthForm' || entityName === 'GuardianConsentForm' ? ' Zapis ankiet odbywa się wyłącznie przez publiczny formularz klienta.' : '') + (entityName === 'ChangeRequest' ? ' Prośby o zmianę terminu rozstrzygaj w panelu (wysyła własne maile).' : '') + (entityName === 'User' ? ' Konta użytkowników zapraszaj z panelu Użytkownicy.' : '') }, { status: 400 });
    }

    // payload operacji — identyczny przy propozycji i wykonaniu (wiąże token)
    const dat = action === 'create' ? (body.data || {}) : action === 'update' ? { id: body.id, changes: body.changes || {} } : { id: body.id };
    if (action === 'update' || action === 'delete') {
      if (!body.id) return Response.json({ error: 'Brak id rekordu' }, { status: 400 });
    }

    // walidacja białych list (przed propozycją i przed wykonaniem)
    if (action === 'create') {
      const bad = unknownKeys(dat, cfg.fields);
      if (bad.length > 0) return Response.json({ error: `Niedozwolone pola dla tworzenia ${entityName}: ${bad.join(', ')}` }, { status: 400 });
      const missing = cfg.required.filter(f => dat[f] === undefined || dat[f] === null || dat[f] === '');
      if (missing.length > 0) return Response.json({ error: `Brak wymaganych pól: ${missing.join(', ')}` }, { status: 400 });
    }
    if (action === 'update') {
      const bad = unknownKeys(dat.changes, cfg.fields);
      if (bad.length > 0) return Response.json({ error: `Niedozwolone pola dla edycji ${entityName}: ${bad.join(', ')}` }, { status: 400 });
      if (Object.keys(dat.changes).length === 0) return Response.json({ error: 'Brak zmian do wykonania' }, { status: 400 });
    }

    // ── ETAP 1: propozycja (bez confirm_token) ───────────────────────
    if (!body.confirm_token) {
      let current = null;
      if (action === 'update' || action === 'delete') {
        current = await ent.get(body.id);
        if (!current) return Response.json({ error: 'Rekord nie istnieje' }, { status: 404 });
      }
      const touched = action === 'update' ? Object.keys(dat.changes) : action === 'create' ? Object.keys(dat) : ['*cały rekord*'];
      const sensitiveFields = touched.filter(f => cfg.sensitive.includes(f));
      const confirm_token = await signToken(user.id, action, entityName, dat, 'gatekeeper-confirm');
      return Response.json({
        status: 'awaiting_confirmation',
        entity: entityName,
        action,
        current: current ? pickSummary(maskRecord(current, cfg, true), cfg) : null,
        proposed: action === 'update' ? dat.changes : action === 'create' ? dat : { id: body.id },
        sensitive: sensitiveFields.length > 0 || entityName === 'Promotion' || entityName === 'PendingStaffInvite',
        sensitive_fields: sensitiveFields,
        side_effects: sideEffectsFor(entityName, action, dat),
        confirm_token,
        expires_in_seconds: TOKEN_TTL_MS / 1000,
        hint: 'Przedstaw administratorowi podsumowanie i po uzyskaniu potwierdzenia wywołaj ponownie z identycznymi danymi oraz confirm_token.',
      });
    }

    // ── ETAP 2: wykonanie (z confirm_token) ──────────────────────────
    const tokenOk = await verifyToken(body.confirm_token, user.id, action, entityName, dat, 'gatekeeper-confirm');
    if (!tokenOk) {
      return Response.json({ error: 'Token potwierdzenia nieprawidłowy lub wygasł (max 15 min). Wygeneruj nową propozycję bez confirm_token, uzyskaj potwierdzenie administratora i wykonaj ponownie.' }, { status: 400 });
    }

    if (action === 'delete') {
      const record = await ent.get(body.id);
      if (!record) return Response.json({ error: 'Rekord nie istnieje' }, { status: 404 });
      if (entityName === 'Booking') {
        // Audyt — stempel autora przed usunięciem (wpis audytu odczyta te pola)
        await ent.update(body.id, { last_editor: 'dashboard', last_editor_id: user.id, last_editor_name: user.full_name || user.email || '', last_editor_role: user.role }).catch(() => {});
      }
      await ent.delete(body.id);
      return Response.json({ status: 'executed', entity: entityName, action, deleted: pickSummary(maskRecord(record, cfg, true), cfg) });
    }

    if (action === 'create') {
      // Promotion: normalny proces z panelu (kod QR, e-mail, salda) — managePromotion
      if (entityName === 'Promotion') {
        const inv = await base44.functions.invoke('managePromotion', {
          action: 'create',
          type: dat.type,
          value: dat.value,
          value_type: dat.value_type,
          usage_mode: dat.usage_mode,
          expires_at: dat.expires_at,
          code: dat.code,
          assigned_client_email: dat.assigned_client_email,
          assigned_until: dat.assigned_until,
          assignment_permanent: dat.assignment_permanent,
          send_email: dat.send_email,
          email_to: dat.email_to,
          admin_notes: dat.admin_notes,
        });
        return Response.json({ status: 'executed', entity: entityName, action, promotion: inv.data, process: 'managePromotion' });
      }
      // PendingStaffInvite: normalny proces z panelu — zaproszenie platformowe + rekord
      if (entityName === 'PendingStaffInvite') {
        let inviteResult = null;
        if (typeof base44.users?.inviteUser === 'function') {
          const platformRole = dat.role === 'admin' ? 'admin' : 'user';
          try {
            await base44.users.inviteUser(dat.email, platformRole);
            inviteResult = { platform_invite_sent: true, platform_role: platformRole };
          } catch (e) {
            return Response.json({ error: `Zaproszenie platformowe nie zostało wysłane: ${e.message}. Rekord NIE został utworzony.` }, { status: 400 });
          }
        }
        const created = await ent.create(pick(dat, cfg.fields));
        return Response.json({ status: 'executed', entity: entityName, action, record: created, invite: inviteResult });
      }
      const payload = pick(dat, cfg.fields);
      if (entityName === 'Booking') {
        if (!payload.session_id) payload.session_id = genSessionId();
        if (!payload.source) payload.source = 'dashboard';
        // Audyt — oznacz autora zmiany (log audytu odczyta te pola)
        payload.last_editor = 'dashboard';
        payload.last_editor_id = user.id;
        payload.last_editor_name = user.full_name || user.email || '';
        payload.last_editor_role = user.role;
      }
      const created = await ent.create(payload);
      return Response.json({ status: 'executed', entity: entityName, action, record: created });
    }

    // update
    if (entityName === 'Promotion') {
      const changes = dat.changes;
      const updateFields = ['value', 'value_type', 'usage_mode', 'expires_at', 'assigned_client_email', 'assigned_until', 'assignment_permanent', 'is_active', 'admin_notes'];
      const graceKeys = ['grace_value', 'grace_expires_at'];
      const results: any = {};
      const plain = pick(changes, updateFields);
      if (Object.keys(plain).length > 0) {
        const inv = await base44.functions.invoke('managePromotion', { action: 'update', promotion_id: body.id, ...plain });
        results.promotion = inv.data?.promotion || inv.data;
      }
      if (changes.revoked === true) {
        const inv = await base44.functions.invoke('managePromotion', { action: 'revoke', promotion_id: body.id });
        results.promotion = inv.data?.promotion || inv.data;
      }
      if (changes.grace_value !== undefined || changes.grace_expires_at !== undefined) {
        const gv = changes.grace_value !== undefined ? changes.grace_value : undefined;
        const ge = changes.grace_expires_at !== undefined ? changes.grace_expires_at : undefined;
        const rec = await ent.get(body.id);
        const inv = await base44.functions.invoke('managePromotion', {
          action: 'extend_grace', promotion_id: body.id,
          grace_value: gv !== undefined ? gv : rec.grace_value,
          grace_expires_at: ge !== undefined ? ge : rec.grace_expires_at,
        });
        results.promotion = inv.data?.promotion || inv.data;
      }
      if (!results.promotion) return Response.json({ error: 'Brak obsługiwanych pól edycji Promotion (value, value_type, usage_mode, expires_at, przypisanie, is_active, revoked, grace). Pól status/balance nie zmienia się ręcznie.' }, { status: 400 });
      return Response.json({ status: 'executed', entity: entityName, action, ...results, process: 'managePromotion' });
    }

    const changes = pick(dat.changes, cfg.fields);
    if (entityName === 'Booking') {
      // rozliczenie sesji — normalny proces z panelu: automatyczne metadane rozliczającego
      if (changes.is_settled === true) {
        changes.settled_by_id = user.id;
        changes.settled_by_name = user.full_name || user.email;
        changes.settled_date = new Date().toISOString();
      }
      // Audyt — oznacz autora zmiany (log audytu odczyta te pola)
      changes.last_editor = 'dashboard';
      changes.last_editor_id = user.id;
      changes.last_editor_name = user.full_name || user.email || '';
      changes.last_editor_role = user.role;
    }
    const updated = await ent.update(body.id, changes);
    return Response.json({ status: 'executed', entity: entityName, action, record: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function sideEffectsFor(entityName, action, dat) {
  if (entityName === 'Booking') {
    const changed = action === 'update' ? Object.keys(dat.changes) : [];
    const fx: string[] = [];
    if (action === 'create') fx.push('Nowa rezerwacja uruchamia automatycznie: powiadomienia studia, konwersację z klientem i synchronizację z Google Calendar.');
    if (action === 'delete') fx.push('Usunięcie rezerwacji jest nieodwracalne i uruchamia czyszczenie wydarzenia w Google Calendar.');
    if (changed.some(f => ['session_date', 'session_time', 'artist_name', 'service_name', 'tattoo_placement'].includes(f))) {
      fx.push('Zmiana daty/godziny/artysty/usługi/miejsca wyśle klientowi e-mail z aktualizacją i zsynchronizuje Google Calendar.');
    }
    if (changed.includes('status')) fx.push('Zmiana statusu (zwłaszcza anulowanie) ma skutki dla klienta i kalendarza.');
    if (changed.some(f => ['deposit_amount', 'final_amount', 'payment_breakdown', 'is_settled'].includes(f))) fx.push('Rozliczenie sesji (is_settled=true) zapisze automatycznie osobę i datę rozliczenia.');
    return fx;
  }
  if (entityName === 'Promotion') {
    if (action === 'create') return ['Voucher/zniżka powstaje przez normalny proces: unikalny kod, kod QR (voucher), opcjonalny e-mail do klienta.'];
    if (action === 'update') return ['Zmiany przechodzą przez normalny proces vouchera (salda, statusy, grace).'];
    return ['Usunięcie vouchera/zniżki jest nieodwracalne — klient traci do niego dostęp.'];
  }
  if (entityName === 'PendingStaffInvite') return ['Zaproszenie wysyła dostęp do aplikacji na podany e-mail (rola admin/artist).'];
  if (entityName === 'Client' && action === 'update' && dat.changes && dat.changes.is_blocked === true) return ['Zablokowanie klienta odbiera mu możliwość rezerwacji i wysyłania wiadomości (bez informowania go o blokadzie).'];
  if (entityName === 'Feedback' && action === 'update' && dat.changes && dat.changes.is_published !== undefined) return ['Publikacja opinii sprawia, że staje się ona widoczna publicznie na stronie.'];
  if (entityName === 'TermsAndConditions' && action !== 'create') return ['Zmiany treści prawnych widzą wszyscy klienci — zmiana ma charakter dokumentu.'];
  return [];
}