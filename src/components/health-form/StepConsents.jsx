import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

function ConsentBlock({ title, text, fieldKey, form, setField, required, showErrors }) {
  const checked = form[fieldKey];
  const isError = showErrors && required && !checked;
  return (
    <div className="py-4" style={{ borderBottom: isError ? '0.5px solid #FF007F' : '0.5px solid #1a1a1a' }}>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: isError ? '#FF007F' : '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
          {title}{required && ' *'} {isError && '(wymagane)'}
        </p>
        <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', lineHeight: 1.7 }}>{text}</p>
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
          {checked ? '✓ ZAAKCEPTOWANO' : isError ? '⚠ WYMAGANE' : 'KLIKNIJ ABY ZAAKCEPTOWAĆ'}
        </span>
      </button>
    </div>
  );
}

export default function StepConsents({ form, setField, t, showErrors }) {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const template = await base44.entities.HealthFormTemplate.filter({ key: 'default' }).then(r => r[0]);
        if (template?.consent_fields) {
          setConsents(template.consent_fields);
        }
      } catch (e) {
        console.error('Failed to load consent fields:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ color: 'rgba(245,240,235,0.5)' }}>Ładowanie...</div>;

  return (
    <div>
      {consents.map(c => (
        <ConsentBlock key={c.field_key} title={c.label} text={c.description || c.label} fieldKey={c.field_key} required={c.required} form={form} setField={setField} showErrors={showErrors} />
      ))}
    </div>
  );
}