import DatePickerCustom from './DatePickerCustom';

export default function StepPersonal({ form, setField, t, inputStyle, showErrors, textPrimary, textMuted, borderColor }) {
  const isMinor = form.date_of_birth
    ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18
    : false;

  const labelStyle = (error) => ({
    fontFamily: 'JetBrains Mono', fontSize: '8px',
    color: error ? '#FF007F' : textMuted,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    display: 'block', marginBottom: '6px'
  });

  const inp = (field, required) => ({
    ...inputStyle,
    borderBottomColor: showErrors && required && !form[field] ? '#FF007F' : borderColor
  });

  return (
    <div className="space-y-6">

      {/* Email */}
      <div>
        <label style={labelStyle(false)}>{t.email}</label>
        <input type="email" style={inputStyle} value={form.client_email || ''} onChange={e => setField('client_email', e.target.value)} />
      </div>

      {/* Imię / nazwisko */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={labelStyle(showErrors && !form.client_first_name)}>{t.firstName} * {showErrors && !form.client_first_name && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
          <input style={inp('client_first_name', true)} value={form.client_first_name || ''} onChange={e => setField('client_first_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle(showErrors && !form.client_last_name)}>{t.lastName} * {showErrors && !form.client_last_name && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
          <input style={inp('client_last_name', true)} value={form.client_last_name || ''} onChange={e => setField('client_last_name', e.target.value)} />
        </div>
      </div>

      {/* Data urodzenia */}
      <div>
        <DatePickerCustom value={form.date_of_birth} onChange={v => setField('date_of_birth', v)} showErrors={showErrors} t={t} textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor} />
        {isMinor && (
          <div className="mt-2 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.08)', border: '0.5px solid rgba(255,0,127,0.3)' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {t.minorWarning}</p>
          </div>
        )}
      </div>

      {/* Adres */}
      <div>
        <label style={labelStyle(showErrors && !form.address_street)}>{t.street} * {showErrors && !form.address_street && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
        <input style={inp('address_street', true)} value={form.address_street || ''} onChange={e => setField('address_street', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={labelStyle(showErrors && !form.address_city)}>{t.city} * {showErrors && !form.address_city && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
          <input style={inp('address_city', true)} value={form.address_city || ''} onChange={e => setField('address_city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle(showErrors && !form.address_postal_code)}>{t.postalCode} * {showErrors && !form.address_postal_code && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
          <input style={inp('address_postal_code', true)} value={form.address_postal_code || ''} onChange={e => setField('address_postal_code', e.target.value)} />
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label style={labelStyle(showErrors && !form.client_phone)}>{t.phone} * {showErrors && !form.client_phone && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
        <input type="tel" style={inp('client_phone', true)} value={form.client_phone || ''} onChange={e => setField('client_phone', e.target.value)} />
      </div>

      {/* PESEL */}
      <div>
        <label style={labelStyle(isMinor && showErrors && !form.pesel)}>{t.pesel}{isMinor ? ' *' : ''} {isMinor && showErrors && !form.pesel && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
        <input style={{ ...inputStyle, borderBottomColor: isMinor && showErrors && !form.pesel ? '#FF007F' : borderColor }} value={form.pesel || ''} onChange={e => setField('pesel', e.target.value)} />
      </div>

      {/* Rodzaj zabiegu */}
      <div>
        <label style={labelStyle(showErrors && !form.procedure_type)}>{t.procedureType} *</label>
        <div className="flex gap-3">
          {['TATUAŻ', 'PIERCING'].map(p => (
            <button type="button" key={p} onClick={() => setField('procedure_type', p)}
              style={{
                fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '10px 20px',
                border: `0.5px solid ${form.procedure_type === p ? '#FF007F' : showErrors && !form.procedure_type ? '#FF007F' : borderColor}`,
                color: form.procedure_type === p ? '#FF007F' : showErrors && !form.procedure_type ? '#FF007F' : textMuted,
                background: form.procedure_type === p ? 'rgba(255,0,127,0.08)' : showErrors && !form.procedure_type ? 'rgba(255,0,127,0.08)' : 'transparent',
                cursor: 'pointer'
              }}>
              {p === 'TATUAŻ' ? t.tattoo : t.piercing}
            </button>
          ))}
        </div>
      </div>

      {/* Miejsce zabiegu */}
      <div>
        <label style={labelStyle(showErrors && !form.body_placement)}>{t.bodyPlacement} * {showErrors && !form.body_placement && `(${t.required?.toLowerCase() || 'wymagane'})`}</label>
        <input style={inp('body_placement', true)} value={form.body_placement || ''} onChange={e => setField('body_placement', e.target.value)} />
      </div>
    </div>
  );
}