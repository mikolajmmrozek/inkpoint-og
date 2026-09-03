import { useTranslatedText } from '@/hooks/useTranslatedText';

function YesNoRow({ label, fieldKey, descKey, form, setField, t, inputStyle, lang, required, showErrors, textPrimary, textMuted, borderColor }) {
  const translatedLabel = useTranslatedText(label, lang);
  const val = form[fieldKey];
  const isError = showErrors && required && (val === null || val === undefined);
  return (
    <div className="py-3" style={{ borderBottom: `0.5px solid ${borderColor}` }}>
      <div className="flex items-center justify-between gap-4">
        <p style={{ color: textPrimary, fontSize: '16px', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{translatedLabel}{required && <span style={{ color: 'var(--brand)' }}> *</span>}</p>
        <div className="flex gap-2 flex-shrink-0">
          {[true, false].map(v => (
            <button type="button" key={String(v)} onClick={() => setField(fieldKey, v)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${val === v ? (v ? 'var(--brand)' : '#16a34a') : isError ? 'var(--brand)' : borderColor}`, color: val === v ? (v ? 'var(--brand)' : '#16a34a') : textMuted, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
              {v ? t.yes : t.no}
            </button>
          ))}
        </div>
      </div>
      {isError && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', marginTop: '4px', letterSpacing: '0.08em' }}>⚠ {t?.required || 'WYMAGANE'}</p>}
      {val === true && descKey && (
        <input
          type="text"
          placeholder={t.describeIfYes}
          style={{ ...inputStyle, marginTop: '8px', fontSize: '15px' }}
          value={form[descKey] || ''}
          onChange={e => setField(descKey, e.target.value)}
        />
      )}
    </div>
  );
}

function TranslatedText({ text, lang, style }) {
  const translated = useTranslatedText(text, lang);
  return <p style={style}>{translated}</p>;
}

export default function StepMedical({ form, setField, t, inputStyle, showErrors, templateData, lang, textPrimary, textMuted, borderColor }) {
  const fields = templateData?.medical_fields || [];
  const sectionIntro = templateData?.section_intros?.medical || '';

  return (
    <div>
      {sectionIntro && (
        <TranslatedText
          text={sectionIntro}
          lang={lang}
          style={{ color: textMuted, fontSize: '15px', marginBottom: '20px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
      )}
      <div>
        {fields.map(f => (
          <YesNoRow
            key={f.field_key}
            label={f.label}
            fieldKey={f.field_key}
            descKey={f.has_description !== false ? `${f.field_key}_desc` : null}
            form={form} setField={setField} t={t} inputStyle={inputStyle} lang={lang}
            required={f.required} showErrors={showErrors}
            textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor}
          />
        ))}
      </div>
    </div>
  );
}