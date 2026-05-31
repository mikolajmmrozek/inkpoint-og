import DatePickerCustom from './DatePickerCustom';

export default function StepPersonal({ form, setField, t, inputStyle, showErrors, isFirstVisit, setIsFirstVisit, onEmailBlur }) {
  const isMinor = form.date_of_birth
    ? new Date().getFullYear() - new Date(form.date_of_birth).getFullYear() < 18
    : false;

  const labelStyle = (error) => ({
    fontFamily: 'JetBrains Mono', fontSize: '8px',
    color: error ? '#FF007F' : 'rgba(245,240,235,0.5)',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    display: 'block', marginBottom: '6px'
  });

  return (
    <div className="space-y-6">

      {/* Pierwsza wizyta */}
      <div>
        <label style={labelStyle(showErrors && isFirstVisit === null)}>
          Czy to Twoja pierwsza wizyta w naszym studio? * {showErrors && isFirstVisit === null && '(wymagane)'}
        </label>
        <div className="flex gap-3">
          {[true, false].map(v => (
            <button type="button" key={String(v)} onClick={() => setIsFirstVisit(v)}
              style={{
                fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '10px 20px',
                border: `0.5px solid ${isFirstVisit === v ? '#FF007F' : showErrors && isFirstVisit === null ? '#FF007F' : '#262626'}`,
                color: isFirstVisit === v ? '#FF007F' : showErrors && isFirstVisit === null ? '#FF007F' : 'rgba(245,240,235,0.4)',
                background: isFirstVisit === v ? 'rgba(255,0,127,0.08)' : 'transparent',
                cursor: 'pointer'
              }}>
              {v ? 'TAK' : 'NIE'}
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle(showErrors && !isFirstVisit && !form.client_email)}>
          {t.email}{!isFirstVisit && isFirstVisit !== null ? ' *' : ''} {showErrors && isFirstVisit === false && !form.client_email && '(wymagane)'}
        </label>
        <input
          type="email"
          style={{ ...inputStyle, borderBottomColor: showErrors && isFirstVisit === false && !form.client_email ? '#FF007F' : '#262626' }}
          value={form.client_email || ''}
          onChange={e => setField('client_email', e.target.value)}
          onBlur={onEmailBlur}
          placeholder={isFirstVisit === false ? 'Podaj email z poprzedniej wizyty...' : ''}
        />
      </div>

      {/* Imię / nazwisko */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={labelStyle(showErrors && !form.client_first_name)}>{t.firstName} * {showErrors && !form.client_first_name && '(wymagane)'}</label>
          <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.client_first_name ? '#FF007F' : '#262626' }} value={form.client_first_name || ''} onChange={e => setField('client_first_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle(showErrors && !form.client_last_name)}>{t.lastName} * {showErrors && !form.client_last_name && '(wymagane)'}</label>
          <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.client_last_name ? '#FF007F' : '#262626' }} value={form.client_last_name || ''} onChange={e => setField('client_last_name', e.target.value)} />
        </div>
      </div>

      {/* Data urodzenia */}
      <div>
        <DatePickerCustom value={form.date_of_birth} onChange={v => setField('date_of_birth', v)} showErrors={showErrors} t={t} />
        {isMinor && (
          <div className="mt-2 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.08)', border: '0.5px solid rgba(255,0,127,0.3)' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {t.minorWarning}</p>
          </div>
        )}
      </div>

      {/* Adres */}
      <div>
        <label style={labelStyle(showErrors && !form.address_street)}>{t.street} * {showErrors && !form.address_street && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.address_street ? '#FF007F' : '#262626' }} value={form.address_street || ''} onChange={e => setField('address_street', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label style={labelStyle(showErrors && !form.address_city)}>{t.city} * {showErrors && !form.address_city && '(wymagane)'}</label>
          <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.address_city ? '#FF007F' : '#262626' }} value={form.address_city || ''} onChange={e => setField('address_city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle(showErrors && !form.address_postal_code)}>{t.postalCode} * {showErrors && !form.address_postal_code && '(wymagane)'}</label>
          <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.address_postal_code ? '#FF007F' : '#262626' }} value={form.address_postal_code || ''} onChange={e => setField('address_postal_code', e.target.value)} />
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label style={labelStyle(showErrors && !form.client_phone)}>{t.phone} * {showErrors && !form.client_phone && '(wymagane)'}</label>
        <input type="tel" style={{ ...inputStyle, borderBottomColor: showErrors && !form.client_phone ? '#FF007F' : '#262626' }} value={form.client_phone || ''} onChange={e => setField('client_phone', e.target.value)} />
      </div>

      {/* PESEL */}
      <div>
        <label style={labelStyle(false)}>{t.pesel}</label>
        <input style={inputStyle} value={form.pesel || ''} onChange={e => setField('pesel', e.target.value)} />
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
                border: `0.5px solid ${form.procedure_type === p ? '#FF007F' : showErrors && !form.procedure_type ? '#FF007F' : '#262626'}`,
                color: form.procedure_type === p ? '#FF007F' : showErrors && !form.procedure_type ? '#FF007F' : 'rgba(245,240,235,0.4)',
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
        <label style={labelStyle(showErrors && !form.body_placement)}>{t.bodyPlacement} * {showErrors && !form.body_placement && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderBottomColor: showErrors && !form.body_placement ? '#FF007F' : '#262626' }} value={form.body_placement || ''} onChange={e => setField('body_placement', e.target.value)} />
      </div>
    </div>
  );
}