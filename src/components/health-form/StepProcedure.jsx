import { useTranslatedText } from '@/hooks/useTranslatedText';

function ProcedureRow({ q, form, setField, t, inputStyle, showErrors, lang, textPrimary, textMuted, borderColor }) {
  const translatedLabel = useTranslatedText(q.label, lang);
  return (
    <div className="py-3" style={{ borderBottom: `0.5px solid ${borderColor}` }}>
      <div className="flex items-center justify-between gap-4">
        <p style={{ color: textPrimary, fontSize: '16px', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {translatedLabel}{q.required && <span style={{ color: 'var(--brand)' }}> *</span>}
        </p>
        <div className="flex gap-2 flex-shrink-0">
          {[true, false].map(v => (
            <button type="button" key={String(v)} onClick={() => setField(q.field_key, v)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${form[q.field_key] === v ? (v ? 'var(--brand)' : '#16a34a') : (showErrors && q.required && (form[q.field_key] === undefined || form[q.field_key] === null) ? 'var(--brand)' : borderColor)}`, color: form[q.field_key] === v ? (v ? 'var(--brand)' : '#16a34a') : textMuted, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
              {v ? t.yes : t.no}
            </button>
          ))}
        </div>
      </div>
      {showErrors && q.required && (form[q.field_key] === null || form[q.field_key] === undefined) && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', marginTop: '4px', letterSpacing: '0.08em' }}>⚠ {t?.required || 'WYMAGANE'}</p>
      )}
      {form[q.field_key] === true && q.has_description && (
        <input
          type="text"
          placeholder={t.describeIfYes}
          style={{ ...inputStyle, marginTop: '8px', fontSize: '15px' }}
          value={form[`${q.field_key}_desc`] || ''}
          onChange={e => setField(`${q.field_key}_desc`, e.target.value)}
        />
      )}
    </div>
  );
}

export default function StepProcedure({ form, setField, t, inputStyle, showErrors, templateData, lang, textPrimary, textMuted, borderColor }) {
  const questions = templateData?.procedure_questions || [];

  if (questions.length === 0) {
    return <p style={{ color: textMuted, fontSize: '15px' }}>Brak pytań przedzabiegowych.</p>;
  }

  return (
    <div>
      {questions.map(q => (
        <ProcedureRow key={q.field_key} q={q} form={form} setField={setField} t={t} inputStyle={inputStyle} showErrors={showErrors} lang={lang} textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor} />
      ))}
    </div>
  );
}