import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { T, LANGUAGES } from '@/lib/healthFormTranslations';
import StepPersonal from '@/components/health-form/StepPersonal';
import StepMedical from '@/components/health-form/StepMedical';
import StepConsents from '@/components/health-form/StepConsents';
import StepGuardian from '@/components/health-form/StepGuardian';
import SignatureCanvas from '@/components/health-form/SignatureCanvas';

const STEPS = ['personal', 'medical', 'consents', 'signature'];

export default function HealthFormPage() {
  const [lang, setLang] = useState('pl');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [step, setStep] = useState('lang-select');
  const [booking, setBooking] = useState(null);
  const [previousForm, setPreviousForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useQuickRefresh, setUseQuickRefresh] = useState(false);

  const [form, setForm] = useState({
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
    has_heart_condition: null,
    has_kidney_condition: null,
    has_liver_condition: null,
    has_lung_condition: null,
    has_cancer: null,
    has_infectious_diseases: null,
    has_epilepsy: null,
    has_diabetes: null,
    has_hemophilia: null,
    has_allergies: null,
    has_inflammatory_conditions: null,
    has_skin_conditions: null,
    has_mental_conditions: null,
    is_pregnant: null,
    is_under_alcohol_drug_influence: null,
    is_allergic_to_metals_dyes_latex: null,
    has_blood_clotting_disorders: null,
    has_scars_skin_changes: null,
    had_tattoo_piercing_before: null,
    consent_tattoo_piercing: false,
    confirm_sober: false,
    consent_image_use: false,
    confirm_regulations_read: false,
    client_signature: '',
    form_filled_date: new Date().toISOString().split('T')[0],
    procedure_type: '',
    body_placement: '',
    is_update_only: false,
    previous_form_id: null,
  });

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');

    const load = async () => {
      if (bookingId) {
        const b = await base44.entities.Booking.filter({ id: bookingId }).then(r => r[0]);
        if (b) {
          setBooking(b);
          setForm(f => ({
            ...f,
            booking_id: b.id,
            client_first_name: (b.client_name || '').split(' ')[0],
            client_last_name: (b.client_name || '').split(' ').slice(1).join(' ') || '',
            client_email: b.client_email || '',
            client_phone: b.client_phone || '',
            procedure_type: b.tattoo_description ? 'TATUAŻ' : '',
            body_placement: b.tattoo_placement || '',
          }));

          // Check for previous form
          const prevForms = await base44.entities.HealthForm.filter({ booking_id: bookingId, is_update_only: false }, '-form_filled_date', 1);
          if (prevForms.length > 0) {
            setPreviousForm(prevForms[0]);
          }
        }
      }
      setLoading(false);
    };

    load();
  }, []);

  const isMinor = form.date_of_birth ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18 : false;
  const steps = isMinor ? [...STEPS, 'signature', 'guardian'] : [...STEPS];

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setGuardianField = (key, value) => setGuardian(g => ({ ...g, [key]: value }));

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
    if (step === 'consents') {
      return form.consent_tattoo_piercing && form.confirm_sober && form.confirm_regulations_read;
    }
    if (step === 'signature') {
      return form.client_signature;
    }
    if (step === 'guardian') {
      return guardian.guardian_name && guardian.guardian_phone && guardian.procedure_type.length > 0 && guardian.body_placement && guardian.guardian_signature;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fullName = `${form.client_first_name} ${form.client_last_name}`.trim();
      const healthData = { ...form, client_name: fullName, is_minor: isMinor };
      const created = await base44.entities.HealthForm.create(healthData);

      if (isMinor) {
        await base44.entities.GuardianConsentForm.create({
          ...guardian,
          health_form_id: created.id,
          booking_id: form.booking_id,
          minor_client_name: form.client_name,
          minor_date_of_birth: form.date_of_birth,
        });
      }

      // Mark booking as form completed
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
      await base44.entities.HealthForm.create({
        ...form,
        is_update_only: true,
        previous_form_id: previousForm.id,
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
            {t.successTitle}
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

  // Language selection
  if (step === 'lang-select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
        <div className="max-w-lg">
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
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '13px',
                  letterSpacing: '0.08em',
                  padding: '12px 16px',
                  border: `0.5px solid ${langMenuOpen ? '#FF007F' : '#262626'}`,
                  color: '#F5F0EB',
                  background: 'transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  textTransform: 'uppercase',
                }}
              >
                {LANGUAGES.find(l => l.code === lang)?.flag} {LANGUAGES.find(l => l.code === lang)?.label}
              </button>
              {langMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#0A0A0A',
                  border: `0.5px solid #262626`,
                  borderTop: 'none',
                  zIndex: 10,
                }}>
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangMenuOpen(false); setStep('personal'); }}
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                        letterSpacing: '0.08em',
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: `0.5px solid #262626`,
                        color: lang === l.code ? '#FF007F' : '#F5F0EB',
                        background: lang === l.code ? 'rgba(255,0,127,0.08)' : 'transparent',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                      }}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {previousForm && (
            <div style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.06)', padding: '20px', marginTop: '24px' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {t.dataUnchanged}
              </p>
              <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
                {t.dataUnchangedInfo}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('personal'); }}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', padding: '10px 20px', border: '0.5px solid #262626', color: '#F5F0EB', background: 'transparent', cursor: 'pointer', flex: 1 }}
                >
                  {t.dataChangedBtn}
                </button>
                <button
                  onClick={() => { setUseQuickRefresh(true); setStep('personal'); }}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', padding: '10px 20px', border: '0.5px solid #FF007F', color: '#FF007F', background: 'rgba(255,0,127,0.08)', cursor: 'pointer', flex: 1 }}
                >
                  {t.dataUnchangedBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen p-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentStepIndex + 1} / {steps.length}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.2rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em' }}>
            {t[`step${step.charAt(0).toUpperCase() + step.slice(1).replace('-', '')}`] || t.title}
          </h1>
        </div>

        {/* Progress bar */}
        <div className="h-px mb-8" style={{ background: '#262626' }} />
        <div className="h-px mb-8" style={{ background: '#FF007F', width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} />

        {/* Form */}
        <form className="mb-12" onSubmit={e => e.preventDefault()}>
          {step === 'personal' && <StepPersonal form={form} setField={setField} t={t} inputStyle={inputStyle} />}
          {step === 'medical' && <StepMedical form={form} setField={setField} t={t} inputStyle={inputStyle} />}
          {step === 'consents' && <StepConsents form={form} setField={setField} t={t} />}
          {step === 'signature' && <SignatureCanvas value={form.client_signature} onChange={v => setField('client_signature', v)} label={t.signatureTitle} clearLabel={t.clearSignature} />}
          {step === 'guardian' && <StepGuardian guardian={guardian} setGuardianField={setGuardianField} form={form} t={t} inputStyle={inputStyle} />}

          {/* Navigation */}
          <div className="flex gap-4 mt-12">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStep(steps[currentStepIndex - 1])}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', border: '0.5px solid #262626', color: '#F5F0EB', background: 'transparent', cursor: 'pointer', flex: 1 }}
              >
                ← {t.back}
              </button>
            )}

            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => canProceed() && setStep(steps[currentStepIndex + 1])}
                disabled={!canProceed()}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: canProceed() ? 'pointer' : 'not-allowed', flex: 1, opacity: canProceed() ? 1 : 0.5 }}
              >
                {t.next} →
              </button>
            ) : (
              <button
                type="button"
                onClick={useQuickRefresh ? handleQuickRefresh : handleSubmit}
                disabled={!canProceed() || submitting}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 32px', background: 'linear-gradient(135deg, #FF007F 0%, #CC0066 100%)', color: '#F5F0EB', border: 'none', cursor: canProceed() && !submitting ? 'pointer' : 'not-allowed', flex: 1, opacity: canProceed() && !submitting ? 1 : 0.5 }}
              >
                {submitting ? t.submitting : t.submit}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}