import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function StepDeclaration({ form, setField, t, inputStyle, showErrors }) {
  const [declaration, setDeclarationData] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const template = await base44.entities.HealthFormTemplate.filter({ key: 'default' }).then(r => r[0]);
        if (template?.declaration_of_will) {
          setDeclarationData(template.declaration_of_will);
        }
        if (template?.declaration_fields) {
          setCustomFields(template.declaration_fields);
        }
      } catch (e) {
        console.error('Failed to load declaration:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ color: 'rgba(245,240,235,0.5)' }}>Ładowanie...</div>;
  if (!declaration) return <div style={{ color: 'rgba(245,240,235,0.4)', fontSize: '14px' }}>Brak konfiguracji oświadczenia. Uzupełnij dane w ustawieniach szablonu.</div>;

  const isError = showErrors && declaration.required && !form[declaration.field_key];

  return (
    <div className="space-y-6">
      {/* Declaration content */}
      <div style={{ borderTop: '0.5px solid #262626' }}>
        {(declaration.content || '').split(/\n+/).filter(p => p.trim()).map((para, i) => (
          <p key={i} style={{ color: 'rgba(245,240,235,0.7)', fontSize: '13px', lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word', paddingTop: '14px', paddingBottom: '24px', borderBottom: '0.5px solid #262626' }}>
            {para.trim()}
          </p>
        ))}
      </div>

      {/* Custom declaration fields */}
      {customFields.length > 0 && (
        <div className="space-y-4">
          {customFields.map(field => (
            <div key={field.field_key}>
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {field.label}
              </label>
              <textarea
                rows={1}
                style={{ ...inputStyle, resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap' }}
                value={form[field.field_key] || ''}
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                onChange={e => { setField(field.field_key, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                placeholder={field.placeholder || field.label}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main declaration consent */}
      <div style={{ paddingTop: '20px' }}>
        <button
          type="button"
          onClick={() => setField(declaration.field_key, !form[declaration.field_key])}
          className="flex items-center gap-3 w-full"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: '18px', height: '18px', border: `0.5px solid ${form[declaration.field_key] ? '#16a34a' : isError ? '#FF007F' : '#262626'}`, background: form[declaration.field_key] ? '#16a34a' : isError ? 'rgba(255,0,127,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form[declaration.field_key] && <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1, fontWeight: 'bold' }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: form[declaration.field_key] ? '#16a34a' : isError ? '#FF007F' : 'rgba(245,240,235,0.4)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}>
            {declaration.label}
          </span>
        </button>
        {isError && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', marginTop: '6px', letterSpacing: '0.08em' }}>⚠ WYMAGANE</p>}
      </div>
    </div>
  );
}