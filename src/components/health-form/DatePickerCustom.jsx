export default function DatePickerCustom({ value, onChange, showErrors, t, textPrimary, textMuted, borderColor }) {
  const tc = textPrimary || '#F5F0EB';
  const tm = textMuted || 'rgba(245,240,235,0.5)';
  const bc = borderColor || '#262626';

  const inputStyle = {
    background: 'rgba(255,255,255,0.09)',
    border: `0.5px solid ${showErrors && !value ? 'var(--brand)' : bc}`,
    borderRadius: '4px',
    color: tc,
    padding: '12px 14px',
    fontSize: '16px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    appearance: 'none',
    WebkitAppearance: 'none',
    minHeight: '44px',
  };

  return (
    <div>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: showErrors && !value ? 'var(--brand)' : tm, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
        {t.dateOfBirth} * {showErrors && !value && '(wymagane)'}
      </label>
      <input
        type="date"
        value={value || ''}
        max={new Date().toISOString().split('T')[0]}
        onChange={e => onChange(e.target.value || '')}
        style={inputStyle}
      />
    </div>
  );
}