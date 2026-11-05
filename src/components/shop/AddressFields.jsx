export const shopFieldStyle = (t) => ({
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `0.5px solid ${t.border}`,
  color: t.text,
  padding: '10px 0',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
});

export default function AddressFields({ value, onChange, t, fields = 'shipping', showCompany = false }) {
  const set = (k, v) => onChange({ ...value, [k]: v });

  const label = (txt) => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const input = (key, type = 'text', placeholder = '') => (
    <input
      type={type}
      value={value?.[key] ?? ''}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
      style={shopFieldStyle(t)}
      onFocus={e => { e.target.style.borderBottomColor = 'var(--brand)'; }}
      onBlur={e => { e.target.style.borderBottomColor = t.border; }}
    />
  );

  return (
    <div className="space-y-5">
      {showCompany && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>{label('Nazwa firmy')}{input('company', 'text', 'np. Studio Sp. z o.o.')}</div>
          <div>{label('NIP')}{input('nip', 'text', 'np. 1234567890')}</div>
        </div>
      )}
      {fields !== 'invoice' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>{label('Imię *')}{input('first_name')}</div>
          <div>{label('Nazwisko')}{input('last_name')}</div>
        </div>
      )}
      <div>{label('Ulica i numer *')}{input('street')}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>{label('Kod pocztowy *')}{input('postal_code', 'text', '00-000')}</div>
        <div>{label('Miasto *')}{input('city')}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>{label('Kraj')}{input('country', 'text', 'Polska')}</div>
        {fields === 'shipping' && <div>{label('Telefon')}{input('phone', 'tel')}</div>}
      </div>
    </div>
  );
}