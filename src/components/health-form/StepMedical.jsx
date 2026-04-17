function YesNoRow({ label, fieldKey, descKey, form, setField, t, inputStyle }) {
  const val = form[fieldKey];
  return (
    <div className="py-3" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
      <div className="flex items-center justify-between gap-4">
        <p style={{ color: 'rgba(245,240,235,0.8)', fontSize: '14px', lineHeight: 1.4 }}>{label}</p>
        <div className="flex gap-2 flex-shrink-0">
          {[true, false].map(v => (
            <button type="button" key={String(v)} onClick={() => setField(fieldKey, v)}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', border: `0.5px solid ${val === v ? (v ? '#FF007F' : '#16a34a') : '#262626'}`, color: val === v ? (v ? '#FF007F' : '#16a34a') : 'rgba(245,240,235,0.3)', background: 'transparent', cursor: 'pointer' }}>
              {v ? t.yes : t.no}
            </button>
          ))}
        </div>
      </div>
      {val === true && descKey && (
        <input
          type="text"
          placeholder={t.describeIfYes}
          style={{ ...inputStyle, marginTop: '8px', fontSize: '13px' }}
          value={form[descKey] || ''}
          onChange={e => setField(descKey, e.target.value)}
        />
      )}
    </div>
  );
}

export default function StepMedical({ form, setField, t, inputStyle }) {
  const fields = [
    { label: t.heart, fieldKey: 'has_heart_condition', descKey: 'heart_condition_description' },
    { label: t.kidney, fieldKey: 'has_kidney_condition', descKey: 'kidney_condition_description' },
    { label: t.liver, fieldKey: 'has_liver_condition', descKey: 'liver_condition_description' },
    { label: t.lung, fieldKey: 'has_lung_condition', descKey: 'lung_condition_description' },
    { label: t.cancer, fieldKey: 'has_cancer', descKey: 'cancer_description' },
    { label: t.infectious, fieldKey: 'has_infectious_diseases', descKey: 'infectious_diseases_description' },
    { label: t.epilepsy, fieldKey: 'has_epilepsy', descKey: 'epilepsy_description' },
    { label: t.diabetes, fieldKey: 'has_diabetes', descKey: 'diabetes_description' },
    { label: t.hemophilia, fieldKey: 'has_hemophilia', descKey: 'hemophilia_description' },
    { label: t.allergies, fieldKey: 'has_allergies', descKey: 'allergies_description' },
    { label: t.inflammatory, fieldKey: 'has_inflammatory_conditions', descKey: 'inflammatory_conditions_description' },
    { label: t.skin, fieldKey: 'has_skin_conditions', descKey: 'skin_conditions_description' },
    { label: t.mental, fieldKey: 'has_mental_conditions', descKey: 'mental_conditions_description' },
    { label: t.pregnant, fieldKey: 'is_pregnant', descKey: null },
    { label: t.alcoholDrugs, fieldKey: 'is_under_alcohol_drug_influence', descKey: null },
    { label: t.metalsDyesLatex, fieldKey: 'is_allergic_to_metals_dyes_latex', descKey: 'allergies_metals_dyes_latex_description' },
    { label: t.bloodClotting, fieldKey: 'has_blood_clotting_disorders', descKey: 'blood_clotting_disorders_description' },
    { label: t.scars, fieldKey: 'has_scars_skin_changes', descKey: 'scars_skin_changes_description' },
    { label: t.hadBefore, fieldKey: 'had_tattoo_piercing_before', descKey: 'previous_reactions_description' },
  ];

  return (
    <div>
      <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.7 }}>{t.medicalInfo}</p>
      <div>
        {fields.map(f => (
          <YesNoRow key={f.fieldKey} {...f} form={form} setField={setField} t={t} inputStyle={inputStyle} />
        ))}
      </div>
    </div>
  );
}