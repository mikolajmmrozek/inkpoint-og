import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const Row = ({ label, value, t }) => (
  <div className="mb-3 pb-3" style={{ borderBottom: `0.5px solid ${t?.border || '#262626'}` }}>
    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
    <p style={{ color: t?.text || 'rgba(245,240,235,0.7)', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value || '—'}</p>
  </div>
);

const YesNo = ({ label, value, desc, t }) => (
  <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: `0.5px solid ${t?.border || '#1a1a1a'}` }}>
    <p style={{ color: t?.text || '#F5F0EB', fontSize: '13px', lineHeight: 1.4, flex: 1 }}>{label}</p>
    <div className="text-right flex-shrink-0">
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', color: value === true ? '#FF007F' : value === false ? '#16a34a' : t?.muted || 'rgba(245,240,235,0.3)' }}>
        {value === true ? 'TAK' : value === false ? 'NIE' : '—'}
      </span>
      {value && desc && <p style={{ fontSize: '11px', color: t?.muted || 'rgba(245,240,235,0.4)', marginTop: '2px' }}>{desc}</p>}
    </div>
  </div>
);

export default function HealthFormPreviewModal({ bookingId, healthFormId, clientName, onClose, t }) {
  t = t || { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' };
  const [form, setForm] = useState(null);
  const [guardian, setGuardian] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let forms;
      const tplArr = await base44.entities.HealthFormTemplate.filter({ key: 'default' });
      if (healthFormId) {
        const f = await base44.entities.HealthForm.filter({ id: healthFormId }, '-form_filled_date', 1);
        forms = f;
      } else {
        forms = await base44.entities.HealthForm.filter({ booking_id: bookingId }, '-form_filled_date', 1);
      }
      if (tplArr.length > 0) setTemplate(tplArr[0]);
      if (tplArr.length > 0) setTemplate(tplArr[0]);
      if (forms.length > 0) {
        setForm(forms[0]);
        if (forms[0].is_minor) {
          const gc = await base44.entities.GuardianConsentForm.filter({ health_form_id: forms[0].id }, '-form_filled_date', 1);
          if (gc.length > 0) setGuardian(gc[0]);
        }
      }
      setLoading(false);
    };
    load();
  }, [bookingId, healthFormId]);

  const MEDICAL = [
    ['Choroby serca', 'has_heart_condition', 'heart_condition_description'],
    ['Nerki', 'has_kidney_condition', 'kidney_condition_description'],
    ['Wątroba', 'has_liver_condition', 'liver_condition_description'],
    ['Płuca', 'has_lung_condition', 'lung_condition_description'],
    ['Nowotwory', 'has_cancer', 'cancer_description'],
    ['Choroby zakaźne', 'has_infectious_diseases', 'infectious_diseases_description'],
    ['Epilepsja', 'has_epilepsy', 'epilepsy_description'],
    ['Cukrzyca', 'has_diabetes', 'diabetes_description'],
    ['Hemofilia', 'has_hemophilia', 'hemophilia_description'],
    ['Alergie', 'has_allergies', 'allergies_description'],
    ['Stany zapalne', 'has_inflammatory_conditions', 'inflammatory_conditions_description'],
    ['Choroby skóry', 'has_skin_conditions', 'skin_conditions_description'],
    ['Choroby psychiczne', 'has_mental_conditions', 'mental_conditions_description'],
    ['Ciąża', 'is_pregnant', null],
    ['Pod wpływem alkoholu/narkotyków', 'is_under_alcohol_drug_influence', null],
    ['Alergia na metale/barwniki/lateks', 'is_allergic_to_metals_dyes_latex', 'allergies_metals_dyes_latex_description'],
    ['Zaburzenia krzepliwości', 'has_blood_clotting_disorders', 'blood_clotting_disorders_description'],
    ['Blizny/zmiany skórne', 'has_scars_skin_changes', 'scars_skin_changes_description'],
    ['Wcześniejsze tatuaże/piercings', 'had_tattoo_piercing_before', 'previous_reactions_description'],
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
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>ANKIETA ZDROWOTNA</p>
              <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{clientName}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: '#FF007F' }} />
            </div>
          ) : !form ? (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK DANYCH ANKIETY</p>
          ) : (
            <div>
              {/* Personal */}
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— DANE OSOBOWE</p>
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
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— WYWIAD MEDYCZNY</p>
                    {flagged.length === 0 ? (
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#16a34a', letterSpacing: '0.1em' }}>✓ Brak przeciwwskazań</p>
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
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— PYTANIA PRZEDZABIEGOWE</p>
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
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— ZGODY</p>
                    {missing.length === 0 ? (
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#16a34a', letterSpacing: '0.1em' }}>✓ Wszystkie zgody udzielone</p>
                    ) : missing.map(([label]) => (
                      <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                        <p style={{ color: t.text, fontSize: '13px' }}>{label}</p>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F' }}>✗ BRAK</span>
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Signature */}
              {form.client_signature && (
                <div className="mt-4">
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>— PODPIS KLIENTA</p>
                  <div style={{ background: '#ffffff', display: 'inline-block', padding: '8px', border: '0.5px solid #cccccc' }}>
                    <img src={form.client_signature} alt="podpis" style={{ maxWidth: '200px', display: 'block' }} />
                  </div>
                </div>
              )}

              {/* Guardian */}
              {guardian && (
                <div className="mt-6 p-4" style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.04)' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— ZGODA OPIEKUNA</p>
                  <Row label="Opiekun" value={guardian.guardian_name} t={t} />
                  <Row label="Telefon opiekuna" value={guardian.guardian_phone} t={t} />
                  {guardian.guardian_signature && (
                    <div style={{ background: '#ffffff', display: 'inline-block', padding: '8px', border: '0.5px solid #cccccc', marginTop: '8px' }}>
                      <img src={guardian.guardian_signature} alt="podpis opiekuna" style={{ maxWidth: '200px', display: 'block' }} />
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