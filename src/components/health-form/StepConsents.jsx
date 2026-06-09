import { useTranslatedText } from '@/hooks/useTranslatedText';

function ConsentBlock({ title, text, fieldKey, form, setField, required, showErrors, t, lang }) {
  const translatedTitle = useTranslatedText(title, lang);
  const translatedText = useTranslatedText(text, lang);
  const checked = form[fieldKey];
  const isError = showErrors && required && !checked;
  return (
    <div className="py-4" style={{ borderBottom: isError ? '0.5px solid #FF007F' : '0.5px solid #1a1a1a' }}>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {translatedTitle}{required && ' *'} {isError && `(${(t?.required || 'WYMAGANE').toLowerCase()})`}
        </p>
        <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{translatedText}</p>
      </div>
      <button
        type="button"
        onClick={() => setField(fieldKey, !checked)}
        className="flex items-center gap-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ width: '16px', height: '16px', border: `0.5px solid ${checked ? '#16a34a' : isError ? '#FF007F' : '#262626'}`, background: checked ? '#16a34a' : isError ? 'rgba(255,0,127,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: checked ? '#16a34a' : isError ? '#FF007F' : 'rgba(245,240,235,0.3)' }}>
          {checked ? `✓ ${t?.accepted || 'ZAAKCEPTOWANO'}` : isError ? `⚠ ${t?.required || 'WYMAGANE'}` : t?.clickToAccept || 'KLIKNIJ ABY ZAAKCEPTOWAĆ'}
        </span>
      </button>
    </div>
  );
}

export default function StepConsents({ form, setField, t, showErrors, templateData, lang }) {
  const consents = templateData?.consent_fields || [];

  const allChecked = consents.length > 0 && consents.every(c => !!form[c.field_key]);
  const toggleAll = () => {
    const newVal = !allChecked;
    consents.forEach(c => setField(c.field_key, newVal));
  };

  return (
    <div>
      {consents.length > 1 && (
        <button type="button" onClick={toggleAll} className="flex items-center gap-3 mb-4" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: '16px', height: '16px', border: `0.5px solid ${allChecked ? '#16a34a' : '#262626'}`, background: allChecked ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {allChecked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: allChecked ? '#16a34a' : 'rgba(245,240,235,0.5)' }}>
            {allChecked ? (t?.uncheckAll || 'ODZNACZ WSZYSTKIE') : (t?.checkAll || 'ZAZNACZ WSZYSTKIE')}
          </span>
        </button>
      )}
      {consents.map(c => (
        <ConsentBlock key={c.field_key} title={c.label} text={c.description || c.label} fieldKey={c.field_key} required={c.required} form={form} setField={setField} showErrors={showErrors} t={t} lang={lang} />
      ))}
    </div>
  );
}