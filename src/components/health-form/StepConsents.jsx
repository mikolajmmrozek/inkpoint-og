import { useTranslatedText } from '@/hooks/useTranslatedText';

function ConsentBlock({ title, text, fieldKey, form, setField, required, showErrors, t, lang, textMuted, borderColor }) {
  const translatedTitle = useTranslatedText(title, lang);
  const translatedText = useTranslatedText(text, lang);
  const checked = form[fieldKey];
  const isError = showErrors && required && !checked;
  return (
    <div className="py-4" style={{ borderBottom: isError ? '0.5px solid var(--brand)' : `0.5px solid ${borderColor}` }}>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {translatedTitle}{required && ' *'} {isError && `(${(t?.required || 'WYMAGANE').toLowerCase()})`}
        </p>
        <p style={{ color: textMuted, fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{translatedText}</p>
      </div>
      <button
        type="button"
        onClick={() => setField(fieldKey, !checked)}
        className="flex items-center gap-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ width: '16px', height: '16px', border: `0.5px solid ${checked ? '#16a34a' : isError ? 'var(--brand)' : borderColor}`, background: checked ? '#16a34a' : isError ? 'rgb(var(--brand-rgb) /0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: checked ? '#16a34a' : isError ? 'var(--brand)' : textMuted }}>
          {checked ? `✓ ${t?.accepted || 'ZAAKCEPTOWANO'}` : isError ? `⚠ ${t?.required || 'WYMAGANE'}` : t?.clickToAccept || 'KLIKNIJ ABY ZAAKCEPTOWAĆ'}
        </span>
      </button>
    </div>
  );
}

export default function StepConsents({ form, setField, t, showErrors, templateData, lang, textPrimary, textMuted, borderColor }) {
  const consents = templateData?.consent_fields || [];

  const allChecked = consents.length > 0 && consents.every(c => !!form[c.field_key]);
  const toggleAll = () => {
    const newVal = !allChecked;
    consents.forEach(c => setField(c.field_key, newVal));
  };

  const termsUrl = lang && lang !== 'pl' ? `/terms?lang=${lang}` : '/terms';

  return (
    <div>
      {consents.length > 1 && (
        <button type="button" onClick={toggleAll} className="flex items-center gap-3 mb-4" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: '16px', height: '16px', border: `0.5px solid ${allChecked ? '#16a34a' : borderColor}`, background: allChecked ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {allChecked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: allChecked ? '#16a34a' : textMuted }}>
            {allChecked ? (t?.uncheckAll || 'ODZNACZ WSZYSTKIE') : (t?.checkAll || 'ZAZNACZ WSZYSTKIE')}
          </span>
        </button>
      )}
      {consents.map(c => (
        <ConsentBlock key={c.field_key} title={c.label} text={c.description || c.label} fieldKey={c.field_key} required={c.required} form={form} setField={setField} showErrors={showErrors} t={t} lang={lang} textMuted={textMuted} borderColor={borderColor} />
      ))}
      {/* Link to studio terms in client's language */}
      <div className="mt-4 pt-4" style={{ borderTop: `0.5px solid ${borderColor}` }}>
        <a
          href={termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}
        >
          ↗ {t?.readTerms || 'PRZECZYTAJ REGULAMIN STUDIA'}
        </a>
      </div>
    </div>
  );
}