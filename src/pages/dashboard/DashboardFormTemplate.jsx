import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2 } from 'lucide-react';

const DEFAULT_MEDICAL_FIELDS = [
  { field_key: 'has_heart_condition', label: 'Choroby serca', required: false, has_description: true },
  { field_key: 'has_kidney_condition', label: 'Choroby nerek', required: false, has_description: true },
  { field_key: 'has_liver_condition', label: 'Choroby wątroby', required: false, has_description: true },
  { field_key: 'has_lung_condition', label: 'Choroby płuc', required: false, has_description: true },
  { field_key: 'has_cancer', label: 'Nowotwory', required: false, has_description: true },
  { field_key: 'has_infectious_diseases', label: 'Choroby zakaźne (HIV/WZW)', required: false, has_description: true },
  { field_key: 'has_epilepsy', label: 'Epilepsja', required: false, has_description: true },
  { field_key: 'has_diabetes', label: 'Cukrzyca', required: false, has_description: true },
  { field_key: 'has_hemophilia', label: 'Hemofilia', required: false, has_description: true },
  { field_key: 'has_allergies', label: 'Alergie', required: false, has_description: true },
  { field_key: 'has_inflammatory_conditions', label: 'Schorzenia zapalne', required: false, has_description: true },
  { field_key: 'has_skin_conditions', label: 'Schorzenia skóry', required: false, has_description: true },
  { field_key: 'has_mental_conditions', label: 'Schorzenia psychiczne', required: false, has_description: true },
  { field_key: 'is_pregnant', label: 'Ciąża', required: false, has_description: false },
  { field_key: 'is_under_alcohol_drug_influence', label: 'Wpływ alkoholu/narkotyków', required: false, has_description: false },
  { field_key: 'is_allergic_to_metals_dyes_latex', label: 'Alergia na metale/barwniki/lateks', required: false, has_description: true },
  { field_key: 'has_blood_clotting_disorders', label: 'Zaburzenia krzepnięcia krwi', required: false, has_description: true },
  { field_key: 'has_scars_skin_changes', label: 'Blizny / zmiany na skórze', required: false, has_description: true },
  { field_key: 'had_tattoo_piercing_before', label: 'Poprzednie tatuaże / piercинги', required: false, has_description: true },
];

const DEFAULT_PROCEDURE_QUESTIONS = [
  { field_key: 'procedure_q1', label: 'Pytanie 1' },
  { field_key: 'procedure_q2', label: 'Pytanie 2' },
];

const DEFAULT_DECLARATION = {
  content: 'Oświadczam, że zapoznałem(a) się ze wszystkimi informacjami i powyższymi pytaniami dotyczącymi zabiegu tatuażu/piercingu.',
  field_key: 'declaration_of_will',
  label: 'Zaakceptuję powyższe informacje',
  required: true
};

const DEFAULT_CONSENT_FIELDS = [
  { field_key: 'consent_tattoo_piercing', label: 'Zgoda na zabieg', description: 'Oświadczam, że dobrowolnie wyrażam zgodę na wykonanie zabiegu tatuażu/piercingu zgodnie z moim życzeniem. Potwierdzam, że zapoznałem(a) się z procedurą, ryzykami i możliwymi powikłaniami oraz mam świadomość konsekwencji zdrowotnych związanych z tym zabiegiem.', required: true },
  { field_key: 'confirm_sober', label: 'Trzeźwość', description: 'Potwierdzam, że w momencie podpisania tej deklaracji nie jestem pod wpływem alkoholu, narkotyków, leków psychoaktywnych lub innych substancji mogących wpłynąć na moją zdolność do podejmowania świadomych decyzji. Rozumiem, że zabieg będzie wykonany wyłącznie w stanie pełnej trzeźwości.', required: true },
  { field_key: 'consent_image_use', label: 'Zgoda na fotografowanie', description: 'Wyrażam dobrowolną zgodę na fotografowanie/filmowanie wyniku zabiegu w celu dokumentacji artystycznej, analizy jakości pracy oraz promowania portfolio studia, z zaznaczeniem, że dane osobowe nie będą ujawniane bez mojej dodatkowej pisemnej zgody.', required: false },
  { field_key: 'confirm_regulations_read', label: 'Zasady pielęgnacji i regulamin', description: 'Potwierdzam, że zapoznałem(a) się w pełni z instrukcją pielęgnacji pooperacyjnej, regulaminem studia oraz polityką reklamacji. Zobowiązuję się do przestrzegania wszystkich zaleceń medycznych i higienicznych przez okres wskazany przez personel studia.', required: true },
];

export default function DashboardFormTemplate() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' };

  const [template, setTemplate] = useState(null);
  const [medicalFields, setMedicalFields] = useState(DEFAULT_MEDICAL_FIELDS);
  const [procedureQuestions, setProcedureQuestions] = useState(DEFAULT_PROCEDURE_QUESTIONS);
  const [declaration, setDeclaration] = useState(DEFAULT_DECLARATION);
  const [declarationFields, setDeclarationFields] = useState([]);
  const [consentFields, setConsentFields] = useState(DEFAULT_CONSENT_FIELDS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.HealthFormTemplate.filter({ key: 'default' })
      .then(data => {
        if (data.length > 0) {
          const t = data[0];
          setTemplate(t);
          setMedicalFields(t.medical_fields || DEFAULT_MEDICAL_FIELDS);
          setProcedureQuestions(t.procedure_questions || DEFAULT_PROCEDURE_QUESTIONS);
          setDeclaration(t.declaration_of_will || DEFAULT_DECLARATION);
          setDeclarationFields(t.declaration_fields || []);
          setConsentFields(t.consent_fields || DEFAULT_CONSENT_FIELDS);
        }
      })
      .catch(() => {});
  }, []);

  const addMedicalField = () => {
    setMedicalFields([...medicalFields, { field_key: `custom_${Date.now()}`, label: '', required: false, has_description: true }]);
  };

  const removeMedicalField = (index) => {
    setMedicalFields(medicalFields.filter((_, i) => i !== index));
  };

  const updateMedicalField = (index, key, value) => {
    const updated = [...medicalFields];
    updated[index][key] = value;
    setMedicalFields(updated);
  };

  const addProcedureQuestion = () => {
    setProcedureQuestions([...procedureQuestions, { field_key: `procedure_q_${Date.now()}`, label: '' }]);
  };

  const removeProcedureQuestion = (index) => {
    setProcedureQuestions(procedureQuestions.filter((_, i) => i !== index));
  };

  const updateProcedureQuestion = (index, key, value) => {
    const updated = [...procedureQuestions];
    updated[index][key] = value;
    setProcedureQuestions(updated);
  };

  const addConsentField = () => {
    setConsentFields([...consentFields, { field_key: `consent_${Date.now()}`, label: '', description: '', required: false }]);
  };

  const removeConsentField = (index) => {
    setConsentFields(consentFields.filter((_, i) => i !== index));
  };

  const updateConsentField = (index, key, value) => {
    const updated = [...consentFields];
    updated[index][key] = value;
    setConsentFields(updated);
  };

  const addDeclarationField = () => {
    setDeclarationFields([...declarationFields, { field_key: `decl_field_${Date.now()}`, label: '', placeholder: '' }]);
  };

  const removeDeclarationField = (index) => {
    setDeclarationFields(declarationFields.filter((_, i) => i !== index));
  };

  const updateDeclarationField = (index, key, value) => {
    const updated = [...declarationFields];
    updated[index][key] = value;
    setDeclarationFields(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        key: 'default',
        medical_fields: medicalFields,
        procedure_questions: procedureQuestions,
        declaration_of_will: declaration,
        declaration_fields: declarationFields,
        consent_fields: consentFields
      };
      
      if (template?.id) {
        await base44.entities.HealthFormTemplate.update(template.id, data);
      } else {
        const created = await base44.entities.HealthFormTemplate.create(data);
        setTemplate(created);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '8px 0',
    fontSize: '13px',
    color: t.text,
    outline: 'none',
    fontFamily: 'Inter',
    width: '100%',
  };

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };

  return (
    <div>
      <div className="mb-6">
        <p style={{ ...mono, fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          KONFIGURACJA
        </p>
        <h2 style={{ ...display, fontSize: '2.5rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Szablon Ankiety</h2>
      </div>

      <div className="space-y-8">
        {/* Medical fields */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Pytania Medyczne</h3>
            <button onClick={addMedicalField} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
              <Plus size={12} /> DODAJ
            </button>
          </div>

          <div className="space-y-4">
            {medicalFields.map((field, i) => (
              <div key={i} style={{ border: `0.5px solid ${t.border}`, padding: '12px', background: 'rgba(255,0,127,0.02)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Etykieta</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => updateMedicalField(i, 'label', e.target.value)}
                        placeholder="Np. Choroby serca"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: t.text, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateMedicalField(i, 'required', e.target.checked)}
                        />
                        Wymagane
                      </label>
                      <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: t.text, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={field.has_description}
                          onChange={e => updateMedicalField(i, 'has_description', e.target.checked)}
                        />
                        Zezwól na opis
                      </label>
                    </div>
                  </div>
                  <button onClick={() => removeMedicalField(i)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Procedure questions */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Pytania o Zabieg</h3>
            <button onClick={addProcedureQuestion} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
              <Plus size={12} /> DODAJ
            </button>
          </div>

          <div className="space-y-4">
            {procedureQuestions.map((field, i) => (
              <div key={i} style={{ border: `0.5px solid ${t.border}`, padding: '12px', background: 'rgba(255,0,127,0.02)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Pytanie</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={e => updateProcedureQuestion(i, 'label', e.target.value)}
                      placeholder="Opisz pytanie dotyczące zabiegu"
                      style={inputStyle}
                    />
                  </div>
                  <button onClick={() => removeProcedureQuestion(i)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Declaration of will */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
          <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', marginBottom: '16px' }}>Oświadczenie Woli</h3>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '12px', background: 'rgba(255,0,127,0.02)' }}>
            <div className="space-y-3">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Treść oświadczenia</label>
                <textarea
                  value={declaration.content || ''}
                  onChange={e => setDeclaration({ ...declaration, content: e.target.value })}
                  placeholder="Treść oświadczenia woli"
                  style={{ ...inputStyle, resize: 'none', minHeight: '80px' }}
                />
              </div>

              {/* Declaration fields */}
              <div className="pt-4 border-t border-t-slate-300" style={{ borderTopColor: t.border }}>
                <div className="flex items-center justify-between mb-3">
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pola Dodatkowe</p>
                  <button onClick={addDeclarationField} className="flex items-center gap-2" style={{ ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
                    <Plus size={10} /> DODAJ
                  </button>
                </div>
                <div className="space-y-2">
                  {declarationFields.map((field, i) => (
                    <div key={i} style={{ border: `0.5px solid ${t.border}`, padding: '8px', background: 'rgba(255,0,127,0.01)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={field.label || ''}
                            onChange={e => updateDeclarationField(i, 'label', e.target.value)}
                            placeholder="Etykieta pola"
                            style={{ ...inputStyle, fontSize: '12px' }}
                          />
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={e => updateDeclarationField(i, 'placeholder', e.target.value)}
                            placeholder="Placeholder"
                            style={{ ...inputStyle, fontSize: '12px' }}
                          />
                        </div>
                        <button onClick={() => removeDeclarationField(i)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Etykieta zgody</label>
                <input
                  type="text"
                  value={declaration.label || ''}
                  onChange={e => setDeclaration({ ...declaration, label: e.target.value })}
                  placeholder="Np. Zaakceptuję powyższe informacje"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consent fields */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Zgody</h3>
            <button onClick={addConsentField} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
              <Plus size={12} /> DODAJ
            </button>
          </div>

          <div className="space-y-4">
            {consentFields.map((field, i) => (
              <div key={i} style={{ border: `0.5px solid ${t.border}`, padding: '12px', background: 'rgba(255,0,127,0.02)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Etykieta</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => updateConsentField(i, 'label', e.target.value)}
                        placeholder="Np. Zgoda na zabieg"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Treść zgody</label>
                      <textarea
                        value={field.description || ''}
                        onChange={e => updateConsentField(i, 'description', e.target.value)}
                        placeholder="Pełny tekst zgody do przeczytania przez użytkownika"
                        style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                      />
                    </div>
                    <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: t.text, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateConsentField(i, 'required', e.target.checked)}
                      />
                      Wymagane
                    </label>
                  </div>
                  <button onClick={() => removeConsentField(i)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-oxblood"
            style={{ flex: 1, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ SZABLON'}
          </button>
        </div>
      </div>
    </div>
  );
}