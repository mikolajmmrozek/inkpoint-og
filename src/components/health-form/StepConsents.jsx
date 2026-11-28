import { useState } from 'react';
import { useTranslatedText } from '@/hooks/useTranslatedText';
import DocumentModal from '@/components/site/DocumentModal';

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
  const [termsOpen, setTermsOpen] = useState(false);

  const allChecked = consents.length > 0 && consents.every(c => !!form[c.field_key]);
  const toggleAll = () => {
    const newVal = !allChecked;
    const updates = {};
    consents.forEach(c => { updates[c.field_key] = newVal; });
    setField('__batch__', updates);
  };

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
      {/* Zgoda marketingowa — stała pozycja, domyślnie niezaznaczona, dobrowolna.
          Zaznaczenie = tak, brak zaznaczenia = nie. */}
      <div className="py-4" style={{ borderTop: `0.5px solid ${borderColor}`, marginTop: '4px' }}>
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
            ZGODA MARKETINGOWA
          </p>
          <p style={{ color: textMuted, fontSize: '15px', lineHeight: 1.7 }}>
            Wyrażam zgodę na otrzymywanie od studia Romans Tattoo wiadomości marketingowych o promocjach, nowościach i ofertach na podany adres e-mail. Zgodę mogę wycofać w każdej chwili.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setField('marketing_consent', !form.marketing_consent)}
          className="flex items-center gap-3"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: '16px', height: '16px', border: `0.5px solid ${form.marketing_consent ? '#16a34a' : borderColor}`, background: form.marketing_consent ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.marketing_consent && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.marketing_consent ? '#16a34a' : textMuted }}>
            {form.marketing_consent ? '✓ WYRAŻAM ZGODĘ' : 'KLIKNIJ, ABY WYRAZIĆ ZGODĘ'}
          </span>
        </button>
      </div>

      {/* Regulamin studia otwierany w oknie — ankieta zostaje wypełniona pod spodem */}
      <div className="mt-4 pt-4" style={{ borderTop: `0.5px solid ${borderColor}` }}>
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ↗ {t?.readTerms || 'PRZECZYTAJ REGULAMIN STUDIA'}
        </button>
      </div>

      <DocumentModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        docKey="default"
        fallbackTitle="Regulamin studia"
        backLabel={t?.backToForm || 'POWRÓT DO ANKIETY'}
        onBack={() => setTermsOpen(false)}
        lang={lang || 'pl'}
      />
    </div>
  );
}