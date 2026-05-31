import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const Row = ({ label, value }) => (
  <div className="mb-3 pb-3" style={{ borderBottom: '0.5px solid #262626' }}>
    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
    <p style={{ color: 'rgba(245,240,235,0.7)', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value || '—'}</p>
  </div>
);

const YesNo = ({ label, value, desc }) => (
  <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
    <p style={{ color: 'rgba(245,240,235,0.7)', fontSize: '13px', lineHeight: 1.4, flex: 1 }}>{label}</p>
    <div className="text-right flex-shrink-0">
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', color: value === true ? '#FF007F' : value === false ? '#16a34a' : 'rgba(245,240,235,0.3)' }}>
        {value === true ? 'TAK' : value === false ? 'NIE' : '—'}
      </span>
      {value && desc && <p style={{ fontSize: '11px', color: 'rgba(245,240,235,0.4)', marginTop: '2px' }}>{desc}</p>}
    </div>
  </div>
);

export default function HealthFormPreviewModal({ bookingId, clientName, onClose }) {
  const [form, setForm] = useState(null);
  const [guardian, setGuardian] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const forms = await base44.entities.HealthForm.filter({ booking_id: bookingId }, '-form_filled_date', 1);
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
  }, [bookingId]);

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
          style={{ background: '#0A0A0A', border: '0.5px solid #262626', padding: '28px' }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>ANKIETA ZDROWOTNA</p>
              <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: '#F5F0EB', letterSpacing: '0.04em', lineHeight: 1 }}>{clientName}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,235,0.4)' }}>
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: '#FF007F' }} />
            </div>
          ) : !form ? (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>BRAK DANYCH ANKIETY</p>
          ) : (
            <div>
              {/* Personal */}
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— DANE OSOBOWE</p>
              <Row label="Imię i nazwisko" value={form.client_name} />
              <Row label="Data urodzenia" value={form.date_of_birth} />
              <Row label="Email" value={form.client_email} />
              <Row label="Telefon" value={form.client_phone} />
              <Row label="Adres" value={[form.address_street, form.address_city, form.address_postal_code].filter(Boolean).join(', ')} />
              <Row label="PESEL" value={form.pesel} />
              <Row label="Zabieg" value={form.procedure_type} />
              <Row label="Miejsce" value={form.body_placement} />
              <Row label="Data wypełnienia" value={form.form_filled_date} />

              {/* Medical */}
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— WYWIAD MEDYCZNY</p>
              {MEDICAL.map(([label, key, descKey]) => (
                <YesNo key={key} label={label} value={form[key]} desc={descKey ? form[descKey] : null} />
              ))}

              {/* Consents */}
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '20px 0 12px' }}>— ZGODY</p>
              {[
                ['Zgoda na zabieg', form.consent_tattoo_piercing],
                ['Trzeźwość', form.confirm_sober],
                ['Zgoda na wizerunek', form.consent_image_use],
                ['Regulamin', form.confirm_regulations_read],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  <p style={{ color: 'rgba(245,240,235,0.7)', fontSize: '13px' }}>{label}</p>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: val ? '#16a34a' : '#FF007F' }}>{val ? '✓' : '✗'}</span>
                </div>
              ))}

              {/* Signature */}
              {form.client_signature && (
                <div className="mt-4">
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>— PODPIS</p>
                  <img src={form.client_signature} alt="podpis" style={{ background: '#fff', maxWidth: '200px', border: '0.5px solid #262626' }} />
                </div>
              )}

              {/* Guardian */}
              {guardian && (
                <div className="mt-6 p-4" style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.04)' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>— ZGODA OPIEKUNA</p>
                  <Row label="Opiekun" value={guardian.guardian_name} />
                  <Row label="Telefon opiekuna" value={guardian.guardian_phone} />
                  {guardian.guardian_signature && (
                    <img src={guardian.guardian_signature} alt="podpis opiekuna" style={{ background: '#fff', maxWidth: '200px', border: '0.5px solid #262626', marginTop: '8px' }} />
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