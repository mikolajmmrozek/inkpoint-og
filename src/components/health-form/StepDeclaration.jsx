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

  return (
    <div className="space-y-6">
      {/* Declaration block — mirrors ConsentBlock structure for consistency with step 5 */}
      <div className="py-4" style={{ borderBottom: isError ? '0.5px solid #FF007F' : `0.5px solid ${borderColor}` }}>
        <div style={{ marginBottom: '10px' }}>
          {declaration.label && (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {declaration.label}{declaration.required && ' *'} {isError && `(${(t?.required || 'WYMAGANE').toLowerCase()})`}
            </p>
          )}
          <div>
            {(declaration.content || '').split(/\n+/).filter(p => p.trim()).map((para, i) => (
              <TranslatedParagraph
                key={i}
                text={para.trim()}
                lang={lang}
                style={{ color: textPrimary, fontSize: '15px', lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0, marginBottom: '6px' }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setField(declaration.field_key, !checked)}
          className="flex items-center gap-3"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: '16px', height: '16px', border: `0.5px solid ${checked ? '#16a34a' : isError ? '#FF007F' : borderColor}`, background: checked ? '#16a34a' : isError ? 'rgba(255,0,127,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: checked ? '#16a34a' : isError ? '#FF007F' : textMuted }}>
            {checked ? `✓ ${t?.accepted || 'ZAAKCEPTOWANO'}` : isError ? `⚠ ${t?.required || 'WYMAGANE'}` : t?.clickToAccept || 'KLIKNIJ ABY ZAAKCEPTOWAĆ'}
          </span>
        </button>
      </div>

      {/* Custom declaration fields */}
      {customFields.length > 0 && (
        <div className="space-y-4">
          {customFields.map(field => (
            <div key={field.field_key}>
              {field.label && (
                <TranslatedLabel
                  text={field.label}
                  lang={lang}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: textMuted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
              )}
              <textarea
                rows={1}
                readOnly
                style={{ ...inputStyle, resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap' }}
                value={form[field.field_key] || ''}
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                placeholder={field.placeholder || field.label}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}