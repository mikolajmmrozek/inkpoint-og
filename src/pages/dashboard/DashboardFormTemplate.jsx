import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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

const DEFAULT_PROCEDURE_QUESTIONS = [];

const DEFAULT_DECLARATION = {
  content: 'Oświadczam, że zapoznałem(a) się ze wszystkimi informacjami i powyższymi pytaniami dotyczącymi zabiegu tatuażu/piercingu.',
  field_key: 'declaration_of_will',
  label: 'Zaakceptuję powyższe informacje',
  required: true
};

const DEFAULT_CONSENT_FIELDS = [
  { field_key: 'consent_tattoo_piercing', label: 'Zgoda na zabieg', description: 'Oświadczam, że dobrowolnie wyrażam zgodę na wykonanie zabiegu tatuażu/piercingu zgodnie z moim życzeniem.', required: true },
  { field_key: 'confirm_sober', label: 'Trzeźwość', description: 'Potwierdzam, że w momencie podpisania tej deklaracji nie jestem pod wpływem alkoholu, narkotyków ani leków psychoaktywnych.', required: true },
  { field_key: 'consent_image_use', label: 'Zgoda na fotografowanie', description: 'Wyrażam dobrowolną zgodę na fotografowanie/filmowanie wyniku zabiegu w celu dokumentacji artystycznej.', required: false },
  { field_key: 'confirm_regulations_read', label: 'Zasady pielęgnacji i regulamin', description: 'Potwierdzam, że zapoznałem(a) się z instrukcją pielęgnacji, regulaminem studia oraz polityką reklamacji.', required: true },
];

const DEFAULT_SECTION_INTROS = {
  medical: 'Prosimy o udzielenie szczerych odpowiedzi. Informacje te są niezbędne do bezpiecznego przeprowadzenia zabiegu.',
  procedure: 'Prosimy o odpowiedź na poniższe pytania dotyczące planowanego zabiegu.',
  declaration: 'Prosimy o zapoznanie się z poniższym oświadczeniem i jego akceptację.',
  consents: 'Prosimy o zapoznanie się z poniższymi zgodami i ich akceptację.',
};

function SectionCard({ title, color, open, onToggle, children, fg, borderCol, cardBg, dividerCol }) {
  return (
    <div style={{ border: `0.5px solid ${open ? color : borderCol}`, background: cardBg, transition: 'border-color 0.2s' }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between"
        style={{ padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div className="flex items-center gap-3">
          <div style={{ width: '6px', height: '6px', background: open ? color : borderCol, borderRadius: '50%', transition: 'background 0.2s' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: fg, letterSpacing: '0.04em' }}>{title}</span>
        </div>
        {open ? <ChevronDown size={16} color={color} /> : <ChevronRight size={16} color="#555" />}
      </button>
      {open && (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ height: '0.5px', background: dividerCol, marginBottom: '20px' }} />
          {children}
        </div>
      )}
    </div>
  );
}

export default function DashboardFormTemplate() {
  const { theme } = useTheme();
  const fuchsia = 'var(--brand)';
  const isDark = theme !== 'light';
  const fg = isDark ? '#F5F0EB' : '#1a1a1a';
  const fgMuted = isDark ? 'rgba(245,240,235,0.4)' : 'rgba(30,30,30,0.5)';
  const fgFaint = isDark ? 'rgba(245,240,235,0.25)' : 'rgba(30,30,30,0.3)';
  const borderCol = isDark ? '#262626' : '#d1d5db';
  const dividerCol = isDark ? '#1a1a1a' : '#e5e7eb';
  const cardBg = isDark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.9)';

  const [template, setTemplate] = useState(null);
  const [openSection, setOpenSection] = useState('medical');

  const [sectionIntros, setSectionIntros] = useState(DEFAULT_SECTION_INTROS);
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
          const tpl = data[0];
          setTemplate(tpl);
          if (tpl.section_intros) setSectionIntros({ ...DEFAULT_SECTION_INTROS, ...tpl.section_intros });
          if (tpl.medical_fields) setMedicalFields(tpl.medical_fields);
          if (tpl.procedure_questions) setProcedureQuestions(tpl.procedure_questions);
          if (tpl.declaration_of_will) setDeclaration(tpl.declaration_of_will);
          if (tpl.declaration_fields) setDeclarationFields(tpl.declaration_fields);
          if (tpl.consent_fields) setConsentFields(tpl.consent_fields);
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        key: 'default',
        section_intros: sectionIntros,
        medical_fields: medicalFields,
        procedure_questions: procedureQuestions,
        declaration_of_will: declaration,
        declaration_fields: declarationFields,
        consent_fields: consentFields,
      };
      if (template?.id) {
        await base44.entities.HealthFormTemplate.update(template.id, data);
      } else {
        const created = await base44.entities.HealthFormTemplate.create(data);
        setTemplate(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'transparent', border: 'none',
    borderBottom: `0.5px solid ${borderCol}`,
    padding: '8px 0', fontSize: '13px', color: fg,
    outline: 'none', fontFamily: 'var(--font-body)', width: '100%',
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  return (
    <div>
      <div className="space-y-3">

        {/* ── PYTANIA MEDYCZNE ── */}
        <SectionCard title="Pytania Medyczne" color={fuchsia} open={openSection === 'medical'} onToggle={() => setOpenSection(openSection === 'medical' ? null : 'medical')} fg={fg} borderCol={borderCol} cardBg={cardBg} dividerCol={dividerCol}>
          <div className="space-y-4">
            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Tekst wprowadzający (widoczny w ankiecie)
              </label>
              <textarea
                value={sectionIntros.medical || ''}
                onChange={e => setSectionIntros({ ...sectionIntros, medical: e.target.value })}
                style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                placeholder="Np. Prosimy o udzielenie szczerych odpowiedzi..."
              />
            </div>

            <div style={{ height: '0.5px', background: dividerCol }} />

            <div className="flex items-center justify-between">
              <p style={{ ...mono, fontSize: '9px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lista pytań</p>
              <button onClick={() => setMedicalFields([...medicalFields, { field_key: `custom_${Date.now()}`, label: '', required: false, has_description: true }])}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${fuchsia}`, color: fuchsia, background: 'transparent', cursor: 'pointer' }}>
                <Plus size={11} /> DODAJ
              </button>
            </div>

            <div className="space-y-3">
              {medicalFields.map((field, i) => (
                <div key={i} style={{ border: `0.5px solid ${dividerCol}`, padding: '10px', background: 'rgb(var(--brand-rgb) /0.02)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={field.label} onChange={e => setMedicalFields(u => u.map((f, j) => j === i ? { ...f, label: e.target.value } : f))} placeholder="Etykieta pytania" style={inputStyle} />
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: fg, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!field.required} onChange={e => setMedicalFields(u => u.map((f, j) => j === i ? { ...f, required: e.target.checked } : f))} /> Wymagane
                        </label>
                        <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: fg, cursor: 'pointer' }}>
                          <input type="checkbox" checked={field.has_description !== false} onChange={e => setMedicalFields(u => u.map((f, j) => j === i ? { ...f, has_description: e.target.checked } : f))} /> Pole opisu
                        </label>
                      </div>
                    </div>
                    <button onClick={() => setMedicalFields(medicalFields.filter((_, j) => j !== i))} style={{ color: fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── PYTANIA PRZEDZABIEGOWE ── */}
        <SectionCard title="Pytania Przedzabiegowe" color={fuchsia} open={openSection === 'procedure'} onToggle={() => setOpenSection(openSection === 'procedure' ? null : 'procedure')} fg={fg} borderCol={borderCol} cardBg={cardBg} dividerCol={dividerCol}>
          <div className="space-y-4">
            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Tekst wprowadzający (widoczny w ankiecie)
              </label>
              <textarea
                value={sectionIntros.procedure || ''}
                onChange={e => setSectionIntros({ ...sectionIntros, procedure: e.target.value })}
                style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                placeholder="Np. Prosimy o odpowiedź na poniższe pytania..."
              />
            </div>

            <div style={{ height: '0.5px', background: dividerCol }} />

            <div className="flex items-center justify-between">
              <p style={{ ...mono, fontSize: '9px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pytania</p>
              <button onClick={() => setProcedureQuestions([...procedureQuestions, { field_key: `procedure_q_${Date.now()}`, label: '', required: false, has_description: false }])}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${fuchsia}`, color: fuchsia, background: 'transparent', cursor: 'pointer' }}>
                <Plus size={11} /> DODAJ
              </button>
            </div>

            {procedureQuestions.length === 0 && (
              <p style={{ ...mono, fontSize: '10px', color: fgFaint, letterSpacing: '0.05em' }}>Brak pytań. Kliknij DODAJ aby dodać pierwsze pytanie.</p>
            )}

            <div className="space-y-3">
              {procedureQuestions.map((field, i) => (
                <div key={i} style={{ border: `0.5px solid ${dividerCol}`, padding: '10px', background: 'rgb(var(--brand-rgb) /0.02)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={field.label} onChange={e => setProcedureQuestions(u => u.map((f, j) => j === i ? { ...f, label: e.target.value } : f))} placeholder="Treść pytania" style={inputStyle} />
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: fg, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!field.required} onChange={e => setProcedureQuestions(u => u.map((f, j) => j === i ? { ...f, required: e.target.checked } : f))} /> Wymagane
                        </label>
                        <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: fg, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!field.has_description} onChange={e => setProcedureQuestions(u => u.map((f, j) => j === i ? { ...f, has_description: e.target.checked } : f))} /> Pole opisu
                        </label>
                      </div>
                    </div>
                    <button onClick={() => setProcedureQuestions(procedureQuestions.filter((_, j) => j !== i))} style={{ color: fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── OŚWIADCZENIE WOLI ── */}
        <SectionCard title="Oświadczenie Woli" color={fuchsia} open={openSection === 'declaration'} onToggle={() => setOpenSection(openSection === 'declaration' ? null : 'declaration')} fg={fg} borderCol={borderCol} cardBg={cardBg} dividerCol={dividerCol}>
          <div className="space-y-4">
            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Tekst wprowadzający (widoczny w ankiecie)
              </label>
              <textarea
                value={sectionIntros.declaration || ''}
                onChange={e => setSectionIntros({ ...sectionIntros, declaration: e.target.value })}
                style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                placeholder="Np. Prosimy o zapoznanie się..."
              />
            </div>

            <div style={{ height: '0.5px', background: dividerCol }} />

            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Treść oświadczenia</label>
              <textarea
                value={declaration.content || ''}
                onChange={e => setDeclaration({ ...declaration, content: e.target.value })}
                style={{ ...inputStyle, resize: 'none', minHeight: '100px' }}
                placeholder="Pełna treść oświadczenia woli..."
              />
            </div>

            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Etykieta zgody (tekst przycisku akceptacji)</label>
              <input type="text" value={declaration.label || ''} onChange={e => setDeclaration({ ...declaration, label: e.target.value })} placeholder="Np. Zaakceptuję powyższe informacje" style={inputStyle} />
            </div>

            <div style={{ height: '0.5px', background: dividerCol }} />

            <div className="flex items-center justify-between">
              <p style={{ ...mono, fontSize: '9px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dodatkowe pola do wypełnienia</p>
              <button onClick={() => setDeclarationFields([...declarationFields, { field_key: `decl_field_${Date.now()}`, label: '', placeholder: '', required: false }])}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${fuchsia}`, color: fuchsia, background: 'transparent', cursor: 'pointer' }}>
                <Plus size={11} /> DODAJ
              </button>
            </div>

            <div className="space-y-3">
              {declarationFields.map((field, i) => (
                <div key={i} style={{ border: `0.5px solid ${dividerCol}`, padding: '10px', background: 'rgb(var(--brand-rgb) /0.02)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={field.label || ''} onChange={e => setDeclarationFields(u => u.map((f, j) => j === i ? { ...f, label: e.target.value } : f))} placeholder="Etykieta pola" style={inputStyle} />
                      <input type="text" value={field.placeholder || ''} onChange={e => setDeclarationFields(u => u.map((f, j) => j === i ? { ...f, placeholder: e.target.value } : f))} placeholder="Placeholder" style={inputStyle} />
                    </div>
                    <button onClick={() => setDeclarationFields(declarationFields.filter((_, j) => j !== i))} style={{ color: fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── ZGODY ── */}
        <SectionCard title="Zgody" color={fuchsia} open={openSection === 'consents'} onToggle={() => setOpenSection(openSection === 'consents' ? null : 'consents')} fg={fg} borderCol={borderCol} cardBg={cardBg} dividerCol={dividerCol}>
          <div className="space-y-4">
            <div>
              <label style={{ ...mono, fontSize: '8px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Tekst wprowadzający (widoczny w ankiecie)
              </label>
              <textarea
                value={sectionIntros.consents || ''}
                onChange={e => setSectionIntros({ ...sectionIntros, consents: e.target.value })}
                style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                placeholder="Np. Prosimy o zapoznanie się z poniższymi zgodami..."
              />
            </div>

            <div style={{ height: '0.5px', background: dividerCol }} />

            <div className="flex items-center justify-between">
              <p style={{ ...mono, fontSize: '9px', color: fgMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zgody</p>
              <button onClick={() => setConsentFields([...consentFields, { field_key: `consent_${Date.now()}`, label: '', description: '', required: false }])}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${fuchsia}`, color: fuchsia, background: 'transparent', cursor: 'pointer' }}>
                <Plus size={11} /> DODAJ
              </button>
            </div>

            <div className="space-y-3">
              {consentFields.map((field, i) => (
                <div key={i} style={{ border: `0.5px solid ${dividerCol}`, padding: '10px', background: 'rgb(var(--brand-rgb) /0.02)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={field.label} onChange={e => setConsentFields(u => u.map((f, j) => j === i ? { ...f, label: e.target.value } : f))} placeholder="Etykieta zgody" style={inputStyle} />
                      <textarea value={field.description || ''} onChange={e => setConsentFields(u => u.map((f, j) => j === i ? { ...f, description: e.target.value } : f))} placeholder="Pełny tekst zgody do przeczytania przez użytkownika" style={{ ...inputStyle, resize: 'none', minHeight: '60px' }} />
                      <label className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', color: fg, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!field.required} onChange={e => setConsentFields(u => u.map((f, j) => j === i ? { ...f, required: e.target.checked } : f))} /> Wymagane
                      </label>
                    </div>
                    <button onClick={() => setConsentFields(consentFields.filter((_, j) => j !== i))} style={{ color: fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-oxblood w-full"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ SZABLON'}
        </button>
      </div>
    </div>
  );
}