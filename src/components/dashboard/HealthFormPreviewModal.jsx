import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const Row = ({ label, value, t }) => (
  <div className="mb-3 pb-3" style={{ borderBottom: `0.5px solid ${t?.border || '#262626'}` }}>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
    <p style={{ color: t?.text || '#111111', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value || '—'}</p>
  </div>
);

const YesNo = ({ label, value, desc, t }) => (
  <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: `0.5px solid ${t?.border || '#1a1a1a'}` }}>
    <p style={{ color: t?.text || '#F5F0EB', fontSize: '13px', lineHeight: 1.4, flex: 1 }}>{label}</p>
    <div className="text-right flex-shrink-0">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: value === true ? 'var(--brand)' : value === false ? '#16a34a' : t?.muted || 'rgba(245,240,235,0.75)' }}>
        {value === true ? 'TAK' : value === false ? 'NIE' : '—'}
      </span>
      {value && desc && <p style={{ fontSize: '11px', color: t?.muted || 'rgba(245,240,235,0.75)', marginTop: '2px' }}>{desc}</p>}
    </div>
  </div>
);

export default function HealthFormPreviewModal({ bookingId, healthFormId, clientName, onClose, t, extraAction, extraActions, formSelector }) {
  t = t || { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', fuchsia: 'var(--brand)' };
  const allActions = [...(extraActions || []), ...(extraAction ? [extraAction] : [])];
  const [form, setForm] = useState(null);
  const [guardian, setGuardian] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!healthFormId && !bookingId) {
        setLoading(false);
        return;
      }
      try {
        // Fetch template + form in parallel to reduce API calls
        const tplPromise = base44.entities.HealthFormTemplate.filter({ key: 'default' });
        let formPromise;
        if (healthFormId) {
          formPromise = base44.entities.HealthForm.get(healthFormId).then(f => (f ? [f] : []));
        } else {
          formPromise = base44.entities.HealthForm.filter({ booking_id: bookingId }, '-form_filled_date', 1).then(forms => {
            if (forms.length === 0 && clientName) {
              return base44.entities.HealthForm.filter({ client_name: clientName }, '-form_filled_date', 1);
            }
            return forms;
          });
        }
        const [tplArr, forms] = await Promise.all([tplPromise, formPromise]);
        if (cancelled) return;
        if (tplArr?.length > 0) setTemplate(tplArr[0]);
        if (forms?.length > 0) {
          setForm(forms[0]);
          if (forms[0].is_minor) {
            const gc = await base44.entities.GuardianConsentForm.filter({ health_form_id: forms[0].id }, '-form_filled_date', 1);
            if (!cancelled && gc.length > 0) setGuardian(gc[0]);
          }
        }
      } catch (e) {
        if (!cancelled) console.error('HealthForm load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bookingId, healthFormId]);

  const MEDICAL = [
    ['Choroby serca', 'has_heart_condition', 'has_heart_condition_desc'],
    ['Nerki', 'has_kidney_condition', 'has_kidney_condition_desc'],
    ['Wątroba', 'has_liver_condition', 'has_liver_condition_desc'],
    ['Płuca', 'has_lung_condition', 'has_lung_condition_desc'],
    ['Nowotwory', 'has_cancer', 'has_cancer_desc'],
    ['Choroby zakaźne', 'has_infectious_diseases', 'has_infectious_diseases_desc'],
    ['Epilepsja', 'has_epilepsy', 'has_epilepsy_desc'],
    ['Cukrzyca', 'has_diabetes', 'has_diabetes_desc'],
    ['Hemofilia', 'has_hemophilia', 'has_hemophilia_desc'],
    ['Alergie', 'has_allergies', 'has_allergies_desc'],
    ['Stany zapalne', 'has_inflammatory_conditions', 'has_inflammatory_conditions_desc'],
    ['Choroby skóry', 'has_skin_conditions', 'has_skin_conditions_desc'],
    ['Choroby psychiczne', 'has_mental_conditions', 'has_mental_conditions_desc'],
    ['Ciąża', 'is_pregnant', null],
    ['Pod wpływem alkoholu/narkotyków', 'is_under_alcohol_drug_influence', null],
    ['Alergia na metale/barwniki/lateks', 'is_allergic_to_metals_dyes_latex', 'is_allergic_to_metals_dyes_latex_desc'],
    ['Zaburzenia krzepliwości', 'has_blood_clotting_disorders', 'has_blood_clotting_disorders_desc'],
    ['Blizny/zmiany skórne', 'has_scars_skin_changes', 'has_scars_skin_changes_desc'],
    ['Wcześniejsze tatuaże/piercings', 'had_tattoo_piercing_before', 'had_tattoo_piercing_before_desc'],
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xl max-h-[85vh] overflow-y-auto"
          style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '28px' }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>ANKIETA ZDROWOTNA</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{clientName}</h2>
            </div>
            <div className="flex items-center gap-2">
              {allActions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  title={action.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px', background: 'none', color: action.color || t.muted, border: `0.5px solid ${t.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {action.icon || action.label}
                </button>
              ))}
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, marginLeft: '4px' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : !form ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK DANYCH ANKIETY</p>
          ) : (
            <div>
              {/* Form selector — when client has multiple forms */}
              {formSelector && formSelector.forms && formSelector.forms.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap mb-5 pb-4" style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.03)', padding: '8px 12px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: '4px' }}>ANKIETY:</p>
                  {formSelector.forms.map(f => (
                    <button key={f.id} onClick={() => formSelector.onSelect(f)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', padding: '3px 8px', border: `0.5px solid ${formSelector.selectedId === f.id ? t.fuchsia : t.border}`, color: formSelector.selectedId === f.id ? t.fuchsia : t.muted, background: formSelector.selectedId === f.id ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer' }}
                    >
                      {f.form_filled_date ? format(new Date(f.form_filled_date), 'dd.MM.yyyy') : f.id?.slice(-4)}{f.is_update_only ? ' ↻' : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Personal */}
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— DANE OSOBOWE</p>
              <Row label="Imię i nazwisko" value={form.client_name} t={t} />
              <Row label="Data urodzenia" value={form.date_of_birth} t={t} />
              <Row label="Email" value={form.client_email} t={t} />
              <Row label="Telefon" value={form.client_phone} t={t} />
              <Row label="Adres" value={[form.address_street, form.address_city, form.address_postal_code].filter(Boolean).join(', ')} t={t} />
              <Row label="PESEL" value={form.pesel} t={t} />
              <Row label="Zabieg" value={form.procedure_type} t={t} />
              <Row label="Miejsce" value={form.body_placement} t={t} />
              <Row label="Data wypełnienia" value={form.form_filled_date} t={t} />

              {/* Medical — only flagged */}
              {(() => {
                const flagged = MEDICAL.filter(([, key, descKey]) => form[key] === true || (descKey && form[descKey]));
                return (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— WYWIAD MEDYCZNY</p>
                    {flagged.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#16a34a', letterSpacing: '0.1em' }}>✓ Brak przeciwwskazań</p>
                    ) : flagged.map(([label, key, descKey]) => (
                      <YesNo key={key} label={label} value={form[key]} desc={descKey ? form[descKey] : null} t={t} />
                    ))}
                  </>
                );
              })()}

              {/* Procedure questions — only flagged */}
              {template?.procedure_questions?.length > 0 && (() => {
                const flagged = template.procedure_questions.filter(q => form[q.field_key] === true || form[`${q.field_key}_desc`]);
                if (flagged.length === 0) return null;
                return (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— PYTANIA PRZEDZABIEGOWE</p>
                    {flagged.map(q => (
                      <YesNo key={q.field_key} label={q.label} value={form[q.field_key]} desc={form[`${q.field_key}_desc`]} t={t} />
                    ))}
                  </>
                );
              })()}

              {/* Consents — only missing */}
              {(() => {
                const consentFields = [
                  ['Zgoda na zabieg', form.consent_tattoo_piercing],
                  ['Trzeźwość', form.confirm_sober],
                  ['Zgoda na wizerunek', form.consent_image_use],
                  ['Regulamin', form.confirm_regulations_read],
                ];
                const missing = consentFields.filter(([, val]) => !val);
                return (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— ZGODY</p>
                    {missing.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#16a34a', letterSpacing: '0.1em' }}>✓ Wszystkie zgody udzielone</p>
                    ) : missing.map(([label]) => (
                      <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                        <p style={{ color: t.text, fontSize: '13px' }}>{label}</p>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>✗ BRAK</span>
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Signature */}
              {form.client_signature && (
                <div className="mt-4">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>— PODPIS KLIENTA</p>
                  <div style={{ background: '#ffffff', display: 'inline-block', padding: '8px', border: `0.5px solid ${t.border}` }}>
                    <img src={form.client_signature} alt="podpis" style={{ maxWidth: '200px', display: 'block' }} />
                  </div>
                </div>
              )}

              {/* Guardian */}
              {guardian && (
                <div className="mt-6">
                  <div className="p-4" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.3)', background: 'rgb(var(--brand-rgb) /0.04)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— ZGODA OPIEKUNA</p>
                    <Row label="Opiekun" value={guardian.guardian_name} t={t} />
                    <Row label="Telefon opiekuna" value={guardian.guardian_phone} t={t} />
                  </div>
                  {guardian.guardian_signature && (
                    <div className="mt-3">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>— PODPIS OPIEKUNA</p>
                      <div style={{ background: '#ffffff', display: 'inline-block', padding: '8px', border: `0.5px solid ${t.border}` }}>
                        <img src={guardian.guardian_signature} alt="podpis opiekuna" style={{ maxWidth: '200px', display: 'block' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}