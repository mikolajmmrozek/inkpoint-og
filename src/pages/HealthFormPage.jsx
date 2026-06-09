import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { T, LANGUAGES } from '@/lib/healthFormTranslations';
import StepPersonal from '@/components/health-form/StepPersonal';
import StepMedical from '@/components/health-form/StepMedical';
import StepProcedure from '@/components/health-form/StepProcedure';
import StepDeclaration from '@/components/health-form/StepDeclaration';
import StepConsents from '@/components/health-form/StepConsents';
import StepGuardian from '@/components/health-form/StepGuardian';
import SignatureCanvas from '@/components/health-form/SignatureCanvas';

// Fields that should NEVER be copied from a previous form
const SKIP_PREFILL_FIELDS = new Set([
  'id', 'created_date', 'updated_date', 'created_by_id', 'created_by',
  'client_signature', 'booking_id', 'form_filled_date',
  'procedure_type', 'body_placement',
  'is_update_only', 'previous_form_id', 'is_minor', 'guardian_consent_form_id',
  'client_name', // regenerated from first+last
]);

const STEPS = ['personal', 'medical', 'procedure', 'declaration', 'consents', 'signature'];

// Build blank form state from a template
function buildInitialState(tpl) {
  const state = {};
  (tpl?.medical_fields || []).forEach(f => {
    state[f.field_key] = null;
    if (f.has_description !== false) state[`${f.field_key}_desc`] = '';
  });
  (tpl?.procedure_questions || []).forEach(q => {
    state[q.field_key] = null;
    if (q.has_description !== false) state[`${q.field_key}_desc`] = '';
  });
  (tpl?.declaration_fields || []).forEach(f => {
    state[f.field_key] = '';
  });
  (tpl?.consent_fields || []).forEach(f => {
    state[f.field_key] = false;
  });
  if (tpl?.declaration_of_will?.field_key) {
    state[tpl.declaration_of_will.field_key] = false;
  }
  return state;
}

function getBaseForm() {
  return {
    booking_id: '',
    client_first_name: '',
    client_last_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    date_of_birth: '',
    address_street: '',
    address_city: '',
    address_postal_code: '',
    pesel: '',
    id_document: '',
    client_signature: '',
    form_filled_date: new Date().toISOString().split('T')[0],
    procedure_type: '',
    body_placement: '',
    is_update_only: false,
    previous_form_id: null,
  };
}

export default function HealthFormPage() {
  const [lang, setLang] = useState('pl');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [step, setStep] = useState('lang-select');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useQuickRefresh, setUseQuickRefresh] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [template, setTemplate] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(null);
  const [prefillBanner, setPrefillBanner] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const [foundDraft, setFoundDraft] = useState(null);

  const [form, setForm] = useState(getBaseForm);
  const [draftId, setDraftId] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [guardian, setGuardian] = useState({
    guardian_name: '',
    guardian_phone: '',
    procedure_type: [],
    body_placement: '',
    num_procedures: 1,
    guardian_signature: '',
    form_filled_date: new Date().toISOString().split('T')[0],
  });

  const t = T[lang] || T.pl;
  const activeTemplate = template;
  const isMinor = form.date_of_birth
    ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18
    : false;
  const steps = isMinor ? [...STEPS, 'guardian'] : [...STEPS];

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setGuardianField = (key, value) => setGuardian(g => ({ ...g, [key]: value }));

  // Save draft after each step change
  const saveDraft = async (currentForm, currentDraftId) => {
    const fullName = `${currentForm.client_first_name} ${currentForm.client_last_name}`.trim();
    const draftData = { ...currentForm, client_name: fullName || 'Draft', is_draft: true };
    if (currentDraftId) {
      await base44.entities.HealthForm.update(currentDraftId, draftData).catch(() => {});
      return currentDraftId;
    } else if (currentForm.client_first_name || currentForm.client_email) {
      const created = await base44.entities.HealthForm.create(draftData).catch(() => null);
      if (created?.id) {
        setDraftId(created.id);
        return created.id;
      }
    }
    return currentDraftId;
  };

  // Create or update client record
  const upsertClient = async (currentForm) => {
    if (!currentForm.client_email && !currentForm.client_phone) return;
    const fullName = `${currentForm.client_first_name} ${currentForm.client_last_name}`.trim();
    const existing = currentForm.client_email
      ? await base44.entities.Client.filter({ email: currentForm.client_email }, '-created_date', 1).catch(() => [])
      : [];
    if (existing.length > 0) {
      await base44.entities.Client.update(existing[0].id, {
        first_name: currentForm.client_first_name || existing[0].first_name,
        last_name: currentForm.client_last_name || existing[0].last_name,
        name: fullName || existing[0].name,
        phone: currentForm.client_phone || existing[0].phone,
      }).catch(() => {});
    } else {
      await base44.entities.Client.create({
        first_name: currentForm.client_first_name || '',
        last_name: currentForm.client_last_name || '',
        name: fullName,
        email: currentForm.client_email || '',
        phone: currentForm.client_phone || '',
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    const editFormId = params.get('edit_form_id');

    const load = async () => {
      let latestTemplate = {};
      try {
        const tplArr = await base44.entities.HealthFormTemplate.filter({ key: 'default' });
        if (tplArr[0]) latestTemplate = tplArr[0];
      } catch (_) {}

      setTemplate(latestTemplate);
      setForm(() => ({ ...getBaseForm(), ...buildInitialState(latestTemplate) }));

      // Load booking if bookingId provided
      if (bookingId) {
        try {
          const bookings = await base44.entities.Booking.filter({ id: bookingId });
          if (bookings[0]) {
            const bk = bookings[0];
            setBooking(bk);
            setForm(f => ({
              ...f,
              booking_id: bk.id,
              client_first_name: bk.client_name?.split(' ')[0] || '',
              client_last_name: bk.client_name?.split(' ').slice(1).join(' ') || '',
              client_email: bk.client_email || '',
              client_phone: bk.client_phone || '',
            }));
          }
        } catch (_) {}
      }

      // Edit mode: load existing form
      if (editFormId) {
        try {
          const existing = await base44.entities.HealthForm.filter({ id: editFormId }).then(r => r[0]);
          if (existing) {
            // Build initial state, then overlay existing data.
            // For any boolean field that is still null after merge (field added to template after form was saved),
            // default it to false so validation doesn't block the user.
            const merged = {
              ...getBaseForm(),
              ...buildInitialState(latestTemplate),
              ...existing,
              form_filled_date: new Date().toISOString().split('T')[0],
            };
            // Fill missing boolean fields with false
            const allBoolKeys = [
              ...(latestTemplate?.medical_fields || []).map(f => f.field_key),
              ...(latestTemplate?.procedure_questions || []).map(q => q.field_key),
            ];
            allBoolKeys.forEach(k => {
              if (merged[k] === null || merged[k] === undefined) merged[k] = false;
            });
            setForm(() => merged);
            if (existing.booking_id) {
              const bk = await base44.entities.Booking.filter({ id: existing.booking_id }).then(r => r[0]);
              if (bk) setBooking(bk);
            }
            setIsFirstVisit(false);
            setStep('personal');
          }
        } catch (_) {}
      }

      setLoading(false);
    };

    load();
  }, []);

  // Prefill from previous visit — copies ALL non-excluded fields dynamically
  const handleEmailPrefill = async () => {
    if (!form.client_email) return;
    try {
      // Check for an existing draft first
      const drafts = await base44.entities.HealthForm.filter(
        { client_email: form.client_email, is_draft: true },
        '-updated_date',
        1
      );
      if (drafts.length > 0) {
        setFoundDraft(drafts[0]);
        return 'draft';
      }

      const prev = await base44.entities.HealthForm.filter(
        { client_email: form.client_email, is_update_only: false },
        '-form_filled_date',
        1
      );
      if (prev.length > 0) {
        const p = prev[0];
        const prefilled = {};
        Object.keys(p).forEach(key => {
          if (!SKIP_PREFILL_FIELDS.has(key) && p[key] !== null && p[key] !== undefined && p[key] !== '') {
            prefilled[key] = p[key];
          }
        });
        setForm(f => ({ ...f, ...prefilled }));
        setPrefillBanner(true);
        return true;
      }
      return false;
    } catch (_) {}
  };

  // Resume a saved draft
  const resumeDraft = (draft) => {
    const merged = {
      ...getBaseForm(),
      ...buildInitialState(template),
      ...draft,
      form_filled_date: new Date().toISOString().split('T')[0],
    };
    // Fill missing boolean fields with false (for fields added to template after draft was saved)
    const allBoolKeys = [
      ...(template?.medical_fields || []).map(f => f.field_key),
      ...(template?.procedure_questions || []).map(q => q.field_key),
    ];
    allBoolKeys.forEach(k => {
      if (merged[k] === null || merged[k] === undefined) merged[k] = false;
    });
    setForm(() => merged);
    setDraftId(draft.id);
    setDraftBanner(true);
    setFoundDraft(null);
    setStep('personal');
  };

  // Discard draft and start fresh
  const discardDraft = async (draft) => {
    await base44.entities.HealthForm.delete(draft.id).catch(() => {});
    setFoundDraft(null);
    setStep('personal');
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '0.5px solid #262626',
    color: '#F5F0EB',
    padding: '12px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const canProceed = () => {
    if (step === 'personal') {
      return form.client_first_name && form.date_of_birth && form.address_street && form.address_city && form.address_postal_code && form.client_phone && form.procedure_type && form.body_placement && (!isMinor || form.pesel);
    }
    if (step === 'medical') {
      const fields = template?.medical_fields || [];
      return fields.every(f => {
        if (form[f.field_key] === null || form[f.field_key] === undefined) return false;
        if (f.has_description && form[f.field_key] === true) {
          const desc = form[`${f.field_key}_desc`];
          if (!desc || !desc.trim()) return false;
        }
        return true;
      });
    }
    if (step === 'procedure') {
      const questions = template?.procedure_questions || [];
      return questions.filter(q => q.required).every(q => form[q.field_key] !== null && form[q.field_key] !== undefined);
    }
    if (step === 'declaration') {
      const declKey = template?.declaration_of_will?.field_key || 'declaration_of_will';
      return !!form[declKey];
    }
    if (step === 'consents') {
      const required = (template?.consent_fields || []).filter(f => f.required);
      return required.length === 0 || required.every(f => !!form[f.field_key]);
    }
    if (step === 'signature') {
      return !!form.client_signature;
    }
    if (step === 'guardian') {
      return guardian.guardian_name && guardian.guardian_phone && guardian.procedure_type.length > 0 && (guardian.body_placement || form.body_placement) && guardian.guardian_signature;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullName = `${form.client_first_name} ${form.client_last_name}`.trim();
      const formData = { ...form, client_name: fullName, is_minor: isMinor, is_draft: false };

      let savedForm;
      if (draftId) {
        savedForm = await base44.entities.HealthForm.update(draftId, formData);
        // update returns void in some SDK versions, so use draftId
        if (!savedForm?.id) savedForm = { id: draftId };
      } else {
        savedForm = await base44.entities.HealthForm.create(formData);
      }

      if (isMinor) {
        const guardianBody = guardian.body_placement || form.body_placement || '';
        await base44.entities.GuardianConsentForm.create({
          ...guardian,
          body_placement: guardianBody,
          health_form_id: savedForm.id,
          booking_id: form.booking_id,
          minor_client_name: fullName,
          minor_date_of_birth: form.date_of_birth,
        });
      }

      if (booking) {
        await base44.entities.Booking.update(booking.id, { health_form_completed: true });
      }

      // Create/update client record automatically
      await upsertClient(form);

      setSubmitted(true);
    } catch (err) {
      setSubmitError('Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRefresh = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullName = `${form.client_first_name} ${form.client_last_name}`.trim();
      const formData = { ...form, client_name: fullName, is_update_only: true, is_minor: false, is_draft: false };

      if (draftId) {
        await base44.entities.HealthForm.update(draftId, formData);
      } else {
        await base44.entities.HealthForm.create(formData);
      }

      if (booking) {
        await base44.entities.Booking.update(booking.id, { health_form_completed: true });
      }

      await upsertClient(form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError('Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── SCREENS ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
        <div className="max-w-lg text-center flex-1 flex items-center justify-center">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {t.studio}
            </p>
            <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em', marginBottom: '20px' }}>
              {t.successTitle}
            </h1>
            <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '16px', lineHeight: 1.8 }}>
              {t.successText}
            </p>
            <a href="/" style={{ display: 'inline-block', marginTop: '32px', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF007F', textDecoration: 'none', padding: '12px 28px', border: '0.5px solid #FF007F' }} onMouseEnter={e => { e.target.style.background = '#FF007F'; e.target.style.color = '#0A0A0A'; }} onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#FF007F'; }}>
              {t.returnToHome || 'POWRÓT NA STRONĘ GŁÓWNĄ'}
            </a>
          </div>
        </div>
        <div style={{ paddingBottom: '40px', textAlign: 'center' }}>
          <a href="/health-form" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', textDecoration: 'none', letterSpacing: '0.08em' }} onMouseEnter={e => e.target.style.color = 'rgba(245,240,235,0.6)'} onMouseLeave={e => e.target.style.color = 'rgba(245,240,235,0.3)'}>
            {t.newSurvey || 'NOWA ANKIETA'}
          </a>
        </div>
      </div>
    );
  }

  // ── DRAFT RESUME SCREEN ───────────────────────────────────────────────

  if (foundDraft) {
    const draftDate = foundDraft.updated_date
      ? new Date(foundDraft.updated_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {t.studio}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em', marginBottom: '12px' }}>
            Znaleziono zapisany formularz
          </h1>
          <div style={{ height: '0.5px', background: '#FF007F', width: '64px', marginBottom: '32px' }} />

          <div className="mb-8 px-4 py-4" style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.05)' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>NIEZAKOŃCZONA ANKIETA</p>
            <p style={{ color: '#F5F0EB', fontSize: '14px', marginBottom: '4px' }}>
              {foundDraft.client_first_name} {foundDraft.client_last_name}
            </p>
            {draftDate && (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.05em' }}>
                Ostatnio zapisano: {draftDate}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => resumeDraft(foundDraft)}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              ↩ KONTYNUUJ POPRZEDNIĄ ANKIETĘ
            </button>
            <button
              onClick={() => discardDraft(foundDraft)}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 32px', background: 'transparent', color: 'rgba(245,240,235,0.5)', border: '0.5px solid #262626', cursor: 'pointer', width: '100%' }}
            >
              + WYPEŁNIJ NOWĄ ANKIETĘ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LANG SELECT ───────────────────────────────────────────────────────

  if (step === 'lang-select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {t.studio}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em', marginBottom: '12px' }}>
            {t.title}
          </h1>
          <div className="h-px w-16 mb-12" style={{ background: '#FF007F', height: '0.5px' }} />

          {/* Language selector */}
          <div className="mb-8 relative">
            <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              {t.langSelect}
            </label>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', letterSpacing: '0.08em', padding: '12px 16px', border: `0.5px solid ${langMenuOpen ? '#FF007F' : '#262626'}`, color: '#F5F0EB', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', textTransform: 'uppercase' }}
              >
                {LANGUAGES.find(l => l.code === lang)?.flag} {LANGUAGES.find(l => l.code === lang)?.label}
              </button>
              {langMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0A0A0A', border: '0.5px solid #262626', borderTop: 'none', zIndex: 10 }}>
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangMenuOpen(false); }}
                      style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', letterSpacing: '0.08em', padding: '10px 16px', border: 'none', borderBottom: '0.5px solid #262626', color: lang === l.code ? '#FF007F' : '#F5F0EB', background: lang === l.code ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', textTransform: 'uppercase' }}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* First visit? */}
          <div className="mb-6">
            <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              {t.firstVisitQuestion || 'Czy to Twoja pierwsza wizyta w naszym studio?'} *
            </label>
            <div className="flex gap-3">
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  onClick={() => setIsFirstVisit(v)}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${isFirstVisit === v ? '#FF007F' : '#262626'}`, color: isFirstVisit === v ? '#FF007F' : 'rgba(245,240,235,0.4)', background: isFirstVisit === v ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', flex: 1 }}
                >
                  {v ? t.yes : t.no}
                </button>
              ))}
            </div>
          </div>

          {/* Returning client email */}
          {isFirstVisit === false && (
            <div className="mb-6">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                {t.returningEmailLabel || 'Adres e-mail z poprzedniej wizyty'} *
              </label>
              <input
                type="email"
                value={form.client_email || ''}
                onChange={e => setField('client_email', e.target.value)}
                placeholder={t.returningEmailPlaceholder || 'twoj@email.pl'}
                style={inputStyle}
              />
            </div>
          )}

          <button
            disabled={isFirstVisit === null || (isFirstVisit === false && !form.client_email)}
            onClick={async () => {
              if (isFirstVisit === false && form.client_email) {
                const result = await handleEmailPrefill();
                if (result === 'draft') return; // show draft screen instead
              }
              setStep('personal');
            }}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: 'pointer', width: '100%', opacity: isFirstVisit === null || (isFirstVisit === false && !form.client_email) ? 0.5 : 1 }}
          >
            {t.next} →
          </button>
        </div>
      </div>
    );
  }

  // ── FORM STEPS ────────────────────────────────────────────────────────

  const currentStepIndex = steps.indexOf(step);

  const stepTitle = {
    personal: t.stepPersonal,
    medical: t.stepMedical,
    procedure: t.stepProcedure || 'Pytania Przedzabiegowe',
    declaration: t.stepDeclaration || 'Oświadczenie Woli',
    consents: t.stepConsents,
    signature: t.stepSignature,
    guardian: t.stepGuardian,
  };

  return (
    <div className="min-h-screen p-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {currentStepIndex + 1} / {steps.length}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.2rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em' }}>
            {stepTitle[step] || t.title}
          </h1>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: '2px', background: i <= currentStepIndex ? '#FF007F' : '#262626', transition: 'background 0.3s' }} />
          ))}
        </div>

        <form className="mb-12" onSubmit={e => e.preventDefault()}>
          {draftBanner && (
            <div className="mb-4 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.07)', border: '0.5px solid rgba(255,0,127,0.35)' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>↩ Kontynuujesz poprzednio zapisaną ankietę — sprawdź dane i uzupełnij brakujące informacje.</p>
            </div>
          )}
          {prefillBanner && (
            <div className="mb-4 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22,163,74,0.1)', border: '0.5px solid rgba(22,163,74,0.4)' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ {t.prefillBannerText || 'Wczytano dane z poprzedniej wizyty — sprawdź i uzupełnij.'}</p>
            </div>
          )}

          {step === 'personal' && <StepPersonal form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} />}
          {step === 'medical' && <StepMedical form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={activeTemplate} lang={lang} />}
          {step === 'procedure' && <StepProcedure form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={activeTemplate} lang={lang} />}
          {step === 'declaration' && <StepDeclaration form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={activeTemplate} lang={lang} />}
          {step === 'consents' && <StepConsents form={form} setField={setField} t={t} showErrors={showErrors} templateData={activeTemplate} lang={lang} />}
          {step === 'signature' && <SignatureCanvas value={form.client_signature} onChange={v => setField('client_signature', v)} label={t.signatureTitle} clearLabel={t.clearSignature} showErrors={showErrors} />}
          {step === 'guardian' && <StepGuardian guardian={guardian} setGuardianField={setGuardianField} form={form} t={t} inputStyle={inputStyle} showErrors={showErrors} />}

          {/* Navigation */}
          <div className="flex gap-4 mt-12">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => { setShowErrors(false); setStep(steps[currentStepIndex - 1]); }}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', border: '0.5px solid #262626', color: '#F5F0EB', background: 'transparent', cursor: 'pointer', flex: 1 }}
              >
                ← {t.back}
              </button>
            )}

            <div style={{ flex: 1 }}>
              {showErrors && !canProceed() && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  ⚠ Uzupełnij wszystkie wymagane pola przed przejściem dalej.
                </p>
              )}
              {submitError && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  ⚠ {submitError}
                </p>
              )}
              {currentStepIndex < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (canProceed()) {
                      setShowErrors(false);
                      await saveDraft(form, draftId);
                      setStep(steps[currentStepIndex + 1]);
                    } else setShowErrors(true);
                  }}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: 'pointer', width: '100%', opacity: canProceed() ? 1 : 0.7 }}
                >
                  {t.next} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (canProceed() && !submitting) { useQuickRefresh ? handleQuickRefresh() : handleSubmit(); }
                    else setShowErrors(true);
                  }}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: 'pointer', width: '100%', opacity: canProceed() && !submitting ? 1 : 0.5 }}
                >
                  {submitting ? t.submitting : t.submit}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Language switcher — bottom of every step */}
        <div className="flex items-center justify-center gap-2 pb-8 flex-wrap">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              title={l.label}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                padding: '4px 10px',
                border: `0.5px solid ${lang === l.code ? '#FF007F' : '#262626'}`,
                color: lang === l.code ? '#FF007F' : 'rgba(245,240,235,0.35)',
                background: lang === l.code ? 'rgba(255,0,127,0.07)' : 'transparent',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {l.flag} {l.code.toUpperCase()}
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}