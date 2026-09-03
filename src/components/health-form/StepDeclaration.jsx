import { useTranslatedText } from '@/hooks/useTranslatedText';

function TranslatedParagraph({ text, lang, style }) {
  const translated = useTranslatedText(text, lang);
  return <p style={style}>{translated}</p>;
}

function TranslatedLabel({ text, lang, style }) {
  const translated = useTranslatedText(text, lang);
  return <label style={style}>{translated}</label>;
}

function TranslatedSpan({ text, lang, style }) {
  const translated = useTranslatedText(text, lang);
  return <span style={style}>{translated}</span>;
}

export default function StepDeclaration({ form, setField, t, inputStyle, showErrors, templateData, lang, textPrimary, textMuted, borderColor }) {
  const declaration = templateData?.declaration_of_will || null;
  const customFields = templateData?.declaration_fields || [];

  if (!declaration) return <div style={{ color: textMuted, fontSize: '15px' }}>Brak konfiguracji oświadczenia. Uzupełnij dane w ustawieniach szablonu.</div>;

  const isError = showErrors && declaration.required && !form[declaration.field_key];
  const checked = !!form[declaration.field_key];
  const paragraphs = (declaration.content || '').split(/\n+/).filter(p => p.trim());

  return (
    <div className="space-y-0">
      {/* Declaration paragraphs — line-separated, black text, no boxes (like step 5) */}
      {paragraphs.map((para, i) => (
        <div key={i} className="py-4" style={{ borderBottom: `0.5px solid ${borderColor}` }}>
          <TranslatedParagraph
            text={para.trim()}
            lang={lang}
            style={{ color: textPrimary, fontSize: '15px', lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}
          />
        </div>
      ))}

      {/* Custom declaration fields — line-separated, black text, no boxes */}
      {customFields.length > 0 && (
        <div>
          {customFields.map(field => (
            <div key={field.field_key} className="py-4" style={{ borderBottom: `0.5px solid ${borderColor}` }}>
              {field.label && (
                <TranslatedLabel
                  text={field.label}
                  lang={lang}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
              )}
              <TranslatedParagraph
                text={form[field.field_key] || field.placeholder || field.label || ''}
                lang={lang}
                style={{ color: textPrimary, fontSize: '15px', lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Section title at the bottom — mirrors consent blocks heading style */}
      {declaration.label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '16px 0 4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {declaration.label}{declaration.required && ' *'}
        </p>
      )}

      {/* Single accept checkbox at the very bottom — covers all declaration statements */}
      <div className="py-4">
        <button
          type="button"
          onClick={() => setField(declaration.field_key, !checked)}
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
        {isError && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', marginTop: '6px', letterSpacing: '0.08em' }}>⚠ {t?.required || 'WYMAGANE'}</p>}
      </div>
    </div>
  );
}