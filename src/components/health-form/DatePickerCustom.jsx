export default function DatePickerCustom({ value, onChange, showErrors, t, textPrimary, textMuted, borderColor, theme }) {
  const tc = textPrimary || '#F5F0EB';
  const tm = textMuted || 'rgba(245,240,235,0.5)';
  const bc = borderColor || '#262626';

  // Dzisiejsza data w czasie lokalnym (bez toISOString, które przez UTC
  // mogło dać wczorajszą/jutrzejszą datę przy zmianie strefy lub o północy)
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Bez appearance: none — na mobile psuje ono natywny kalendarz systemowy
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
    minHeight: '44px',
    colorScheme: theme === 'light' ? 'light' : 'dark',
  };

  return (
    <div>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: showErrors && !value ? 'var(--brand)' : tm, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
        {t.dateOfBirth} * {showErrors && !value && '(wymagane)'}
      </label>
      <input
        type="date"
        value={value || ''}
        max={localToday}
        onChange={e => onChange(e.target.value || '')}
        style={inputStyle}
      />
    </div>
  );
}