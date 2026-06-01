function YesNoRow({ label, fieldKey, descKey, form, setField, t, inputStyle }) {
  const val = form[fieldKey];
  return (
    <div className="py-3" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
      <div className="flex items-center justify-between gap-4">
        <p style={{ color: 'rgba(245,240,235,0.8)', fontSize: '14px', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{label}</p>
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

export default function StepMedical({ form, setField, t, inputStyle, showErrors, templateData }) {
  const fields = templateData?.medical_fields || [];
  const sectionIntro = templateData?.section_intros?.medical || '';

  return (
    <div>
      {sectionIntro && <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{sectionIntro}</p>}
      <div>
        {fields.map(f => (
          <YesNoRow key={f.field_key} label={f.label} fieldKey={f.field_key} descKey={f.has_description !== false ? `${f.field_key}_desc` : null} form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} />
        ))}
      </div>
    </div>
  );
}