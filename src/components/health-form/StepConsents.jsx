function ConsentBlock({ title, text, fieldKey, form, setField, required }) {
  const checked = form[fieldKey];
  return (
    <div className="py-4" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
          {title}{required && ' *'}
        </p>
        <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', lineHeight: 1.7 }}>{text}</p>
      </div>
      <button
        type="button"
        onClick={() => setField(fieldKey, !checked)}
        className="flex items-center gap-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ width: '16px', height: '16px', border: `0.5px solid ${checked ? '#16a34a' : '#262626'}`, background: checked ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: checked ? '#16a34a' : 'rgba(245,240,235,0.3)' }}>
          {checked ? '✓ ZAAKCEPTOWANO' : 'KLIKNIJ ABY ZAAKCEPTOWAĆ'}
        </span>
      </button>
    </div>
  );
}

export default function StepConsents({ form, setField, t }) {
  const consents = [
    { title: t.consent1Title, text: t.consent1Text, fieldKey: 'consent_tattoo_piercing', required: true },
    { title: t.consent2Title, text: t.consent2Text, fieldKey: 'confirm_sober', required: true },
    { title: t.consent3Title, text: t.consent3Text, fieldKey: 'consent_image_use', required: false },
    { title: t.consent4Title, text: t.consent4Text, fieldKey: 'confirm_regulations_read', required: true },
  ];

  return (
    <div>
      {consents.map(c => (
        <ConsentBlock key={c.fieldKey} {...c} form={form} setField={setField} />
      ))}
    </div>
  );
}