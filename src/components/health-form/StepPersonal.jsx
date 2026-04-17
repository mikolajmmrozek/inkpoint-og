export default function StepPersonal({ form, setField, t, inputStyle }) {
  const isMinor = form.date_of_birth
    ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18
    : false;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.firstName} *</label>
          <input style={inputStyle} value={form.client_first_name || ''} onChange={e => setField('client_first_name', e.target.value)} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.lastName} *</label>
          <input style={inputStyle} value={form.client_last_name || ''} onChange={e => setField('client_last_name', e.target.value)} />
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.dateOfBirth} *</label>
        <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date_of_birth || ''} onChange={e => setField('date_of_birth', e.target.value)} />
        {isMinor && (
          <div className="mt-2 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.08)', border: '0.5px solid rgba(255,0,127,0.3)' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {t.minorWarning}</p>
          </div>
        )}
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.street} *</label>
        <input style={inputStyle} value={form.address_street || ''} onChange={e => setField('address_street', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.city} *</label>
          <input style={inputStyle} value={form.address_city || ''} onChange={e => setField('address_city', e.target.value)} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.postalCode} *</label>
          <input style={inputStyle} value={form.address_postal_code || ''} onChange={e => setField('address_postal_code', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.phone} *</label>
          <input type="tel" style={inputStyle} value={form.client_phone || ''} onChange={e => setField('client_phone', e.target.value)} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.email}</label>
          <input type="email" style={inputStyle} value={form.client_email || ''} onChange={e => setField('client_email', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.pesel}</label>
          <input style={inputStyle} value={form.pesel || ''} onChange={e => setField('pesel', e.target.value)} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.idDocument}</label>
          <input style={inputStyle} value={form.id_document || ''} onChange={e => setField('id_document', e.target.value)} />
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>{t.procedureType} *</label>
        <div className="flex gap-3">
          {['TATUAŻ', 'PIERCING'].map(p => (
            <button type="button" key={p} onClick={() => setField('procedure_type', p)}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${form.procedure_type === p ? '#FF007F' : '#262626'}`, color: form.procedure_type === p ? '#FF007F' : 'rgba(245,240,235,0.4)', background: form.procedure_type === p ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer' }}>
              {p === 'TATUAŻ' ? t.tattoo : t.piercing}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.bodyPlacement} *</label>
        <input style={inputStyle} value={form.body_placement || ''} onChange={e => setField('body_placement', e.target.value)} />
      </div>
    </div>
  );
}