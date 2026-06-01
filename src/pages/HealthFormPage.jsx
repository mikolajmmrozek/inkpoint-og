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

// Hardcoded template — matches current DB template (key: 'default').
// Used to initialize form state synchronously. Still overridden by DB version on load.
const HARDCODED_TEMPLATE = {
  key: 'default',
  section_intros: {
    medical: 'Czy cierpisz na którąś z poniższych chorób?',
    procedure: 'Prosimy o odpowiedź na poniższe pytania.',
    declaration: 'Prosimy o zapoznanie się z poniższym oświadczeniem i jego akceptację.',
    consents: 'Prosimy o zapoznanie się z poniższymi zgodami i ich akceptację.',
  },
  medical_fields: [
    { field_key: 'has_heart_condition', label: 'Choroby serca', required: true, has_description: false },
    { field_key: 'has_kidney_condition', label: 'Choroby nerek', required: true, has_description: false },
    { field_key: 'has_liver_condition', label: 'Choroby wątroby', required: true, has_description: false },
    { field_key: 'has_lung_condition', label: 'Choroby płuc', required: true, has_description: false },
    { field_key: 'has_cancer', label: 'Nowotwory', required: true, has_description: false },
    { field_key: 'has_infectious_diseases', label: 'HIV', required: true, has_description: false },
    { field_key: 'has_epilepsy', label: 'Epilepsja', required: true, has_description: false },
    { field_key: 'has_diabetes', label: 'Choroby autoimmunologiczne (np. cukrzyca, choroby tarczycy)', required: true, has_description: false },
    { field_key: 'has_hemophilia', label: 'Hemofilia', required: true, has_description: false },
    { field_key: 'has_allergies', label: 'Alergie', required: true, has_description: true },
    { field_key: 'has_inflammatory_conditions', label: 'Czy przechodziłeś/aś w ostatnim tygodniu infekcję?', required: true, has_description: true },
    { field_key: 'has_skin_conditions', label: 'Schorzenia skóry', required: true, has_description: true },
    { field_key: 'has_mental_conditions', label: 'Schorzenia psychiczne', required: true, has_description: false },
    { field_key: 'is_pregnant', label: 'Ciąża', required: false, has_description: false },
    { field_key: 'is_under_alcohol_drug_influence', label: 'Pod wpływem alkoholu/narkotyków', required: false, has_description: false },
    { field_key: 'is_allergic_to_metals_dyes_latex', label: 'Alergia na metale, barwniki lub lateks', required: false, has_description: true },
    { field_key: 'has_blood_clotting_disorders', label: 'Zaburzenia krzepnięcia krwi', required: false, has_description: false },
    { field_key: 'has_scars_skin_changes', label: 'Bliznowce lub zmiany skórne', required: false, has_description: false },
    { field_key: 'had_tattoo_piercing_before', label: 'Wcześniejszy tatuaż/piercing', required: false, has_description: true },
  ],
  procedure_questions: [
    { field_key: 'procedure_q1', label: 'Czy jesteś w ciąży? (jeśli dotyczy)', required: false, has_description: false },
    { field_key: 'procedure_q2', label: 'Czy masz zaplanowaną operację/zabieg?', required: true, has_description: true },
    { field_key: 'procedure_q_1780258468164', label: 'Czy przyjmowałeś/aś leki (ost. 24h)', required: true, has_description: true },
    { field_key: 'procedure_q_1780258502043', label: 'Czy zażywałeś narkotyki (ost. 24h)', required: true, has_description: false },
    { field_key: 'procedure_q_1780258539127', label: 'Czy spożywałeś alkohol (ost. 24h)', required: true, has_description: false },
    { field_key: 'procedure_q_1780258600027', label: 'Czy Twoja skóra ciężko się goi?', required: true, has_description: true },
    { field_key: 'procedure_q_1780258617059', label: 'Czy uprawiasz sport?', required: true, has_description: true },
    { field_key: 'procedure_q_1780258627893', label: 'Czy wykonujesz pracę, która powoduje kontakt z pyłami/płynami/wysoką temperaturą/szkodliwymi substancjami?', required: true, has_description: true },
  ],
  declaration_of_will: {
    field_key: 'declaration_of_will',
    label: 'Akceptuję powyższe informacje',
    content: 'W pełni rozumiem, że:',
    required: true,
  },
  declaration_fields: [
    { field_key: 'decl_field_1780257758865', label: '', placeholder: 'Tatuaż zostaje na całe życie i nie ma sposobu, żeby go usunąć tak, aby nie pozostał żaden ślad.', required: false },
    { field_key: 'decl_field_1780258975442', label: '', placeholder: 'Wpływ tatuażu na zdrowie nie został do tej pory dokładnie zbadany.', required: false },
    { field_key: 'decl_field_1780258984575', label: '', placeholder: 'Tatuaż lub przekłucie może mieć wpływ na interakcje społeczne.', required: false },
    { field_key: 'decl_field_1780259014792', label: '', placeholder: 'Tatuaż może ulec zmianie z biegiem czasu.', required: false },
    { field_key: 'decl_field_1780259028157', label: '', placeholder: 'Tatuaż może odbiegać od wykonywanego projektu.', required: false },
    { field_key: 'decl_field_1780259040176', label: '', placeholder: 'Motyw tatuowany na ciele może stać się z czasem niemodny.', required: false },
    { field_key: 'decl_field_1780259084574', label: '', placeholder: 'Tatuator ma prawo dopasować wzór wielkością, formą oraz kolorem.', required: false },
    { field_key: 'decl_field_1780259106807', label: '', placeholder: 'Piercer ma prawo dopasować wybrany kolczyk do anatomii.', required: false },
    { field_key: 'decl_field_1780259107508', label: '', placeholder: 'Tatuator pracuje w swojej manierze artystycznej.', required: false },
    { field_key: 'decl_field_1780259107725', label: '', placeholder: 'Wizja artystyczna ma prawo odbiegać od oczekiwań klienta.', required: false },
    { field_key: 'decl_field_1780259107941', label: '', placeholder: 'Tatuaż lub kolczyk może wywołać reakcję alergiczną.', required: false },
    { field_key: 'decl_field_1780259108158', label: '', placeholder: 'Tatuaż może spowodować efekt rozmycia pod skórą.', required: false },
    { field_key: 'decl_field_1780259158007', label: '', placeholder: 'Nie będę mógł oddać krwi przez okres 4 miesięcy od wykonania tatuażu.', required: false },
    { field_key: 'decl_field_1780259158089', label: '', placeholder: 'Nie będę korzystać z kąpieli słonecznych przez 2 miesiące.', required: false },
    { field_key: 'decl_field_1780259158241', label: '', placeholder: 'Nie będę mógł korzystać z kąpieli w basenie przez 2 miesiące.', required: false },
    { field_key: 'decl_field_1780259158408', label: '', placeholder: 'Będę stosować się do zaleceń pielęgnacyjnych.', required: false },
    { field_key: 'decl_field_1780259158575', label: '', placeholder: 'Tatuowane miejsce może puchnąć.', required: false },
    { field_key: 'decl_field_1780259158924', label: '', placeholder: 'Cena tatuażu uzależniona jest od jego wielkości/rodzaju.', required: false },
  ],
  consent_fields: [
    { field_key: 'consent_tattoo_piercing', label: 'Zgoda na zabieg', description: 'JA NIŻEJ PODPISANY/A DECYDUJĘ SIĘ DOBROWOLNIE I W PEŁNI ŚWIADOMIE NA WYKONANIE TATUAŻU/PRZEKŁUCIA W STUDIO TATUAŻU „ROMANS"', required: true },
    { field_key: 'confirm_sober', label: 'Trzeźwość i używki', description: 'Oświadczam iż nie jestem pod wpływem środków odurzających ani pod wpływem alkoholu.', required: true },
    { field_key: 'consent_image_use', label: 'Zgoda na wykonanie materiałów promocyjnych.', description: 'Zgadzam się na publikację zdjęcia wykonywanego tatuażu/przekłucia w materiałach promujących studio „ROMANS".', required: false },
    { field_key: 'confirm_regulations_read', label: 'Regulamin', description: 'Zapoznałem/am się z regulaminem studio oraz będę stosować się do niego.', required: true },
    { field_key: 'consent_1779995760853', label: 'Pielęgnacja i zalecenia', description: 'Zostałem poinformowany o sposobie pielęgnacji nowo wykonanego tatuażu/przekłucia.', required: true },
    { field_key: 'consent_1779995809081', label: 'Dane osobowe', description: 'Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO.', required: true },
    { field_key: 'consent_1779995841314', label: 'Przygotowanie stanowiska', description: 'Stanowisko zabiegu zostało przygotowane dla mnie i w mojej obecności.', required: true },
    { field_key: 'consent_1779995923833', label: 'Zgodność danych', description: 'Oświadczam, że podane dane osobowe oraz odpowiedzi na temat stanu zdrowia są zgodne z prawdą.', required: true },
  ],
};

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
  const [template, setTemplate] = useState(HARDCODED_TEMPLATE);
  const [isFirstVisit, setIsFirstVisit] = useState(null);
  const [prefillBanner, setPrefillBanner] = useState(false);

  // Initialize form synchronously from hardcoded template — no async needed
  const [form, setForm] = useState(() => ({
    ...getBaseForm(),
    ...buildInitialState(HARDCODED_TEMPLATE),
  }));

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
  const isMinor = form.date_of_birth
    ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18
    : false;
  const steps = isMinor ? [...STEPS, 'guardian'] : [...STEPS];

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setGuardianField = (key, value) => setGuardian(g => ({ ...g, [key]: value }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    const editFormId = params.get('edit_form_id');

    const load = async () => {
      // Load latest template from DB (updates from hardcoded baseline)
      let latestTemplate = HARDCODED_TEMPLATE;
      try {
        const tplArr = await base44.entities.HealthFormTemplate.filter({ key: 'default' });
        if (tplArr[0]) {
          latestTemplate = tplArr[0];
          setTemplate(latestTemplate);
          // Merge any new fields from latest template into current form state
          setForm(f => ({ ...getBaseForm(), ...buildInitialState(latestTemplate), ...f }));
        }
      } catch (_) {}

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
            setForm(() => ({
              ...getBaseForm(),
              ...buildInitialState(latestTemplate),
              ...existing,
              form_filled_date: new Date().toISOString().split('T')[0],
            }));
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
      }
    } catch (_) {}
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
      return form.client_first_name && form.date_of_birth && form.address_street && form.address_city && form.address_postal_code && form.client_phone && form.procedure_type && form.body_placement;
    }
    if (step === 'medical') {
      const fields = template?.medical_fields || [];
      return fields.every(f => form[f.field_key] !== null && form[f.field_key] !== undefined);
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
    try {
      const fullName = `${form.client_first_name} ${form.client_last_name}`.trim();
      const created = await base44.entities.HealthForm.create({ ...form, client_name: fullName, is_minor: isMinor });

      if (isMinor) {
        await base44.entities.GuardianConsentForm.create({
          ...guardian,
          health_form_id: created.id,
          booking_id: form.booking_id,
          minor_client_name: fullName,
          minor_date_of_birth: form.date_of_birth,
        });
      }

      if (booking) {
        await base44.entities.Booking.update(booking.id, { health_form_completed: true });
      }

      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRefresh = async () => {
    setSubmitting(true);
    try {
      const fullName = `${form.client_first_name} ${form.client_last_name}`.trim();
      await base44.entities.HealthForm.create({
        ...form,
        client_name: fullName,
        is_update_only: true,
        is_minor: false,
      });

      if (booking) {
        await base44.entities.Booking.update(booking.id, { health_form_completed: true });
      }

      setSubmitted(true);
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
        <div className="max-w-lg text-center">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {t.studio}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em', marginBottom: '20px' }}>
            {t.successTitle}
          </h1>
          <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '16px', lineHeight: 1.8 }}>
            {t.successText}
          </p>
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
              Czy to Twoja pierwsza wizyta w naszym studio? *
            </label>
            <div className="flex gap-3">
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  onClick={() => setIsFirstVisit(v)}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${isFirstVisit === v ? '#FF007F' : '#262626'}`, color: isFirstVisit === v ? '#FF007F' : 'rgba(245,240,235,0.4)', background: isFirstVisit === v ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', flex: 1 }}
                >
                  {v ? 'TAK' : 'NIE'}
                </button>
              ))}
            </div>
          </div>

          {/* Returning client email */}
          {isFirstVisit === false && (
            <div className="mb-6">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Adres e-mail z poprzedniej wizyty *
              </label>
              <input
                type="email"
                value={form.client_email || ''}
                onChange={e => setField('client_email', e.target.value)}
                placeholder="twoj@email.pl"
                style={inputStyle}
              />
            </div>
          )}

          <button
            disabled={isFirstVisit === null || (isFirstVisit === false && !form.client_email)}
            onClick={async () => {
              if (isFirstVisit === false && form.client_email) await handleEmailPrefill();
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
    procedure: 'Pytania Przedzabiegowe',
    declaration: 'Oświadczenie Woli',
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
          {prefillBanner && (
            <div className="mb-4 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22,163,74,0.1)', border: '0.5px solid rgba(22,163,74,0.4)' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ Wczytano dane z poprzedniej wizyty — sprawdź i uzupełnij.</p>
            </div>
          )}

          {step === 'personal' && <StepPersonal form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} />}
          {step === 'medical' && <StepMedical form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={template} />}
          {step === 'procedure' && <StepProcedure form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={template} />}
          {step === 'declaration' && <StepDeclaration form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} templateData={template} />}
          {step === 'consents' && <StepConsents form={form} setField={setField} t={t} showErrors={showErrors} />}
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
              {currentStepIndex < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (canProceed()) { setShowErrors(false); setStep(steps[currentStepIndex + 1]); }
                    else setShowErrors(true);
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
      </div>
    </div>
  );
}