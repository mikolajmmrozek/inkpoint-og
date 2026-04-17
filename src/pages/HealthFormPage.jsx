import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LANGUAGES, T } from '@/lib/healthFormTranslations';
import StepPersonal from '@/components/health-form/StepPersonal';
import StepMedical from '@/components/health-form/StepMedical';
import StepConsents from '@/components/health-form/StepConsents';
import StepGuardian from '@/components/health-form/StepGuardian';
import SignatureCanvas from '@/components/health-form/SignatureCanvas';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

function getAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const INITIAL_FORM = {
  client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
  date_of_birth: '', address_street: '', address_city: '', address_postal_code: '',
  pesel: '', id_document: '', procedure_type: '', body_placement: '',
  has_heart_condition: null, heart_condition_description: '',
  has_kidney_condition: null, kidney_condition_description: '',
  has_liver_condition: null, liver_condition_description: '',
  has_lung_condition: null, lung_condition_description: '',
  has_cancer: null, cancer_description: '',
  has_infectious_diseases: null, infectious_diseases_description: '',
  has_epilepsy: null, epilepsy_description: '',
  has_diabetes: null, diabetes_description: '',
  has_hemophilia: null, hemophilia_description: '',
  has_allergies: null, allergies_description: '',
  has_inflammatory_conditions: null, inflammatory_conditions_description: '',
  has_skin_conditions: null, skin_conditions_description: '',
  has_mental_conditions: null, mental_conditions_description: '',
  is_pregnant: null, is_under_alcohol_drug_influence: null,
  is_allergic_to_metals_dyes_latex: null, allergies_metals_dyes_latex_description: '',
  has_blood_clotting_disorders: null, blood_clotting_disorders_description: '',
  has_scars_skin_changes: null, scars_skin_changes_description: '',
  had_tattoo_piercing_before: null, previous_reactions_description: '',
  consent_tattoo_piercing: false, confirm_sober: false,
  consent_image_use: false, confirm_regulations_read: false,
  client_signature: '',
};

const INITIAL_GUARDIAN = {
  guardian_name: '', guardian_phone: '', procedure_type: [], body_placement: '', num_procedures: 1, guardian_signature: '',
};

export default function HealthFormPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('booking_id');

  const [lang, setLang] = useState(null);
  const [step, setStep] = useState(0); // 0=lang, 1=personal, 2=medical, 3=consents, 4=signature, 5=guardian
  const [form, setForm] = useState(INITIAL_FORM);
  const [guardian, setGuardian] = useState(INITIAL_GUARDIAN);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousForm, setPreviousForm] = useState(null);
  const [dataChangeChoice, setDataChangeChoice] = useState(null); // null | 'changed' | 'unchanged'
  const [booking, setBooking] = useState(null);

  const t = lang ? T[lang] : T.pl;
  const isMinor = getAge(form.date_of_birth) !== null && getAge(form.date_of_birth) < 18;

  useEffect(() => {
    if (bookingId) {
      base44.entities.Booking.filter({ id: bookingId }).then(results => {
        if (results && results.length > 0) {
          const b = results[0];
          setBooking(b);
          // pre-fill email if present
          if (b.client_email) setForm(f => ({ ...f, client_email: b.client_email }));
          if (b.client_phone) setForm(f => ({ ...f, client_phone: b.client_phone }));
          // Check for previous health form by email
          if (b.client_email) {
            base44.entities.HealthForm.filter({ client_email: b.client_email }).then(prevForms => {
              if (prevForms && prevForms.length > 0) {
                // Sort by date descending, pick latest
                const sorted = prevForms.sort((a, b) => new Date(b.form_filled_date) - new Date(a.form_filled_date));
                setPreviousForm(sorted[0]);
              }
            });
          }
        }
      }).catch(() => {});
    }
  }, [bookingId]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setGuardianField = (key, value) => setGuardian(g => ({ ...g, [key]: value }));

  const handleLangSelect = (code) => {
    setLang(code);
    setStep(previousForm && dataChangeChoice === null ? 'returning' : 1);
  };

  // When lang is picked and there's a previous form — show the returning user screen first
  const steps = isMinor ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
  const stepLabels = isMinor
    ? [t.stepPersonal, t.stepMedical, t.stepConsents, t.stepSignature, t.stepGuardian]
    : [t.stepPersonal, t.stepMedical, t.stepConsents, t.stepSignature];

  const currentStepIndex = steps.indexOf(step);

  const handleSubmit = async () => {
    setSubmitting(true);
    const clientName = `${form.client_first_name} ${form.client_last_name}`.trim();
    const now = new Date().toISOString();

    const healthFormData = {
      booking_id: bookingId || '',
      client_name: clientName,
      client_email: form.client_email,
      client_phone: form.client_phone,
      date_of_birth: form.date_of_birth,
      address_street: form.address_street,
      address_city: form.address_city,
      address_postal_code: form.address_postal_code,
      pesel: form.pesel,
      id_document: form.id_document,
      procedure_type: form.procedure_type,
      body_placement: form.body_placement,
      has_heart_condition: form.has_heart_condition,
      heart_condition_description: form.heart_condition_description,
      has_kidney_condition: form.has_kidney_condition,
      kidney_condition_description: form.kidney_condition_description,
      has_liver_condition: form.has_liver_condition,
      liver_condition_description: form.liver_condition_description,
      has_lung_condition: form.has_lung_condition,
      lung_condition_description: form.lung_condition_description,
      has_cancer: form.has_cancer,
      cancer_description: form.cancer_description,
      has_infectious_diseases: form.has_infectious_diseases,
      infectious_diseases_description: form.infectious_diseases_description,
      has_epilepsy: form.has_epilepsy,
      epilepsy_description: form.epilepsy_description,
      has_diabetes: form.has_diabetes,
      diabetes_description: form.diabetes_description,
      has_hemophilia: form.has_hemophilia,
      hemophilia_description: form.hemophilia_description,
      has_allergies: form.has_allergies,
      allergies_description: form.allergies_description,
      has_inflammatory_conditions: form.has_inflammatory_conditions,
      inflammatory_conditions_description: form.inflammatory_conditions_description,
      has_skin_conditions: form.has_skin_conditions,
      skin_conditions_description: form.skin_conditions_description,
      has_mental_conditions: form.has_mental_conditions,
      mental_conditions_description: form.mental_conditions_description,
      is_pregnant: form.is_pregnant,
      is_under_alcohol_drug_influence: form.is_under_alcohol_drug_influence,
      is_allergic_to_metals_dyes_latex: form.is_allergic_to_metals_dyes_latex,
      allergies_metals_dyes_latex_description: form.allergies_metals_dyes_latex_description,
      has_blood_clotting_disorders: form.has_blood_clotting_disorders,
      blood_clotting_disorders_description: form.blood_clotting_disorders_description,
      has_scars_skin_changes: form.has_scars_skin_changes,
      scars_skin_changes_description: form.scars_skin_changes_description,
      had_tattoo_piercing_before: form.had_tattoo_piercing_before,
      previous_reactions_description: form.previous_reactions_description,
      consent_tattoo_piercing: form.consent_tattoo_piercing,
      confirm_sober: form.confirm_sober,
      consent_image_use: form.consent_image_use,
      confirm_regulations_read: form.confirm_regulations_read,
      client_signature: form.client_signature,
      form_filled_date: now,
      is_minor: isMinor,
      is_update_only: dataChangeChoice === 'unchanged',
      previous_form_id: previousForm?.id || '',
    };

    const savedForm = await base44.entities.HealthForm.create(healthFormData);

    if (isMinor && guardian.guardian_signature) {
      await base44.entities.GuardianConsentForm.create({
        health_form_id: savedForm.id,
        booking_id: bookingId || '',
        minor_client_name: clientName,
        minor_date_of_birth: form.date_of_birth,
        guardian_name: guardian.guardian_name,
        guardian_phone: guardian.guardian_phone,
        procedure_type: guardian.procedure_type,
        body_placement: guardian.body_placement || form.body_placement,
        num_procedures: guardian.num_procedures,
        guardian_signature: guardian.guardian_signature,
        form_filled_date: now,
      });
    }

    if (bookingId) {
      await base44.entities.Booking.update(bookingId, { health_form_completed: true });
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };

  // ── SUBMITTED ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0A0A0A' }}>
        <div className="text-center max-w-md">
          <div className="w-12 h-px mx-auto mb-8" style={{ background: '#FF007F' }} />
          <h1 style={{ ...display, fontSize: '3rem', color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '16px' }}>{t.successTitle}</h1>
          <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '15px', lineHeight: 1.8 }}>{t.successText}</p>
        </div>
      </div>
    );
  }

  // ── LANGUAGE SELECT ──
  if (!lang) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0A0A0A' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <p style={{ ...mono, fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>ROMANS TATTOO STUDIO</p>
            <h1 style={{ ...display, fontSize: '2.5rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>ANKIETA ZDROWOTNA</h1>
          </div>
          <p style={{ ...mono, fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '20px' }}>
            {T.pl.langSelect}
          </p>
          <div className="space-y-3">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setStep(previousForm ? 'returning' : 1); }}
                className="w-full flex items-center gap-4 px-6 py-4 transition-all"
                style={{ border: '0.5px solid #262626', background: 'transparent', color: '#F5F0EB', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '24px' }}>{l.flag}</span>
                <span style={{ ...mono, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RETURNING USER ──
  if (step === 'returning' && previousForm) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0A0A0A' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <p style={{ ...mono, fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>ROMANS TATTOO</p>
            <h1 style={{ ...display, fontSize: '2rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.dataUnchanged}</h1>
          </div>
          <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px', lineHeight: 1.8, marginBottom: '28px', textAlign: 'center' }}>{t.dataUnchangedInfo}</p>
          <div className="space-y-3">
            <button onClick={() => { setDataChangeChoice('changed'); setStep(1); }}
              className="w-full py-4 transition-all"
              style={{ border: '0.5px solid #FF007F', color: '#FF007F', ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
              {t.dataChangedBtn}
            </button>
            <button onClick={() => {
              // Pre-fill from previous form
              const pf = previousForm;
              setForm(f => ({ ...f, client_email: pf.client_email, client_phone: pf.client_phone, date_of_birth: pf.date_of_birth, procedure_type: pf.procedure_type, body_placement: pf.body_placement }));
              setDataChangeChoice('unchanged');
              setStep(4); // go straight to signature
            }}
              className="w-full py-4 transition-all"
              style={{ border: '0.5px solid #262626', color: 'rgba(245,240,235,0.6)', ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
              {t.dataUnchangedBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canGoNext = () => {
    if (step === 1) return form.client_first_name && form.client_last_name && form.date_of_birth && form.procedure_type && form.body_placement;
    if (step === 3) return form.consent_tattoo_piercing && form.confirm_sober && form.confirm_regulations_read;
    if (step === 4) return !!form.client_signature;
    if (step === 5) return guardian.guardian_name && guardian.guardian_phone && guardian.guardian_signature;
    return true;
  };

  const nextStep = () => {
    if (step === 4 && isMinor) { setStep(5); return; }
    if (step === 4 || step === 5) { handleSubmit(); return; }
    setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step === 4 && dataChangeChoice === 'unchanged') { setStep('returning'); return; }
    setStep(s => s - 1);
  };

  const progressSteps = dataChangeChoice === 'unchanged' ? [t.stepSignature] : stepLabels;
  const progressIndex = dataChangeChoice === 'unchanged' ? 0 : currentStepIndex;

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A', color: '#F5F0EB' }}>
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
        <div>
          <p style={{ ...mono, fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>ROMANS TATTOO</p>
          <p style={{ ...display, fontSize: '1.4rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.title}</p>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {progressSteps.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: i <= progressIndex ? '#FF007F' : '#262626', transition: 'background 0.3s' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Step label */}
      <div className="px-6 pt-6 pb-2">
        <p style={{ ...mono, fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {dataChangeChoice === 'unchanged' ? t.stepSignature : (stepLabels[currentStepIndex] || '')}
        </p>
        {step === 1 && <h2 style={{ ...display, fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.stepPersonal}</h2>}
        {step === 2 && <h2 style={{ ...display, fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.stepMedical}</h2>}
        {step === 3 && <h2 style={{ ...display, fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.stepConsents}</h2>}
        {step === 4 && <h2 style={{ ...display, fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em' }}>{t.stepSignature}</h2>}
        {step === 5 && <h2 style={{ ...display, fontSize: '1.8rem', color: '#FF007F', letterSpacing: '0.04em' }}>{t.stepGuardian}</h2>}
      </div>

      {/* Form content */}
      <div className="px-6 py-6 max-w-2xl mx-auto">
        {step === 1 && <StepPersonal form={form} setField={setField} t={t} inputStyle={inputStyle} />}
        {step === 2 && <StepMedical form={form} setField={setField} t={t} inputStyle={inputStyle} />}
        {step === 3 && <StepConsents form={form} setField={setField} t={t} />}
        {step === 4 && (
          <div className="space-y-4">
            {dataChangeChoice === 'unchanged' && (
              <div className="px-4 py-3 mb-4" style={{ background: 'rgba(22,163,74,0.06)', border: '0.5px solid rgba(22,163,74,0.2)' }}>
                <p style={{ ...mono, fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>{t.updateOnly}</p>
              </div>
            )}
            <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '13px', marginBottom: '16px' }}>{t.signatureInfo}</p>
            <SignatureCanvas
              value={form.client_signature}
              onChange={v => setField('client_signature', v)}
              label={t.signatureTitle}
              clearLabel={t.clearSignature}
            />
          </div>
        )}
        {step === 5 && (
          <StepGuardian guardian={guardian} setGuardianField={setGuardianField} form={form} t={t} inputStyle={inputStyle} />
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 px-6 py-4 flex gap-3" style={{ background: '#0A0A0A', borderTop: '0.5px solid #1a1a1a' }}>
        {(step > 1 || step === 'returning') && (
          <button onClick={prevStep}
            style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 24px', border: '0.5px solid #262626', color: 'rgba(245,240,235,0.4)', background: 'transparent', cursor: 'pointer' }}>
            {t.back}
          </button>
        )}
        <button
          onClick={nextStep}
          disabled={!canGoNext() || submitting}
          style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', background: canGoNext() && !submitting ? 'linear-gradient(135deg, #FF007F, #CC0066)' : '#1a1a1a', color: canGoNext() && !submitting ? '#F5F0EB' : 'rgba(245,240,235,0.2)', border: 'none', cursor: canGoNext() && !submitting ? 'pointer' : 'not-allowed', flex: 1, transition: 'all 0.3s' }}
        >
          {submitting ? t.submitting : (step === 4 && !isMinor) || step === 5 ? t.submit : t.next}
        </button>
      </div>
    </div>
  );
}