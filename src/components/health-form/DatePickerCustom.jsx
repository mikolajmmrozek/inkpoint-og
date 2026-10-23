export default function DatePickerCustom({ value, onChange, showErrors, t, textPrimary, textMuted, borderColor, theme }) {
  const isLight = theme === 'light';
  const tc = textPrimary || '#F5F0EB';
  const tm = textMuted || 'rgba(245,240,235,0.5)';
  const bc = borderColor || '#262626';
  const hasValue = !!value;

  // Dzisiejsza data w czasie lokalnym (bez toISOString, które przez UTC
  // mogło dać wczorajszą/jutrzejszą datę przy zmianie strefy lub o północy)
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Ramkę i odstępy rysuje zwykły kontener: natywne pole daty na iOS
  // nie może powiększyć widocznego pola o własne odstępy. Kalendarz zostaje natywny.
  const fieldStyle = {
    background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.09)',
    border: `0.5px solid ${showErrors && !value ? 'var(--brand)' : bc}`,
    borderRadius: '4px',
    color: hasValue ? tc : 'transparent',
    padding: '12px 14px',
    fontSize: '16px',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    display: 'block',
    boxSizing: 'border-box',
    overflow: 'hidden',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    colorScheme: isLight ? 'light' : 'dark',
  };

  return (
    <div>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: showErrors && !value ? 'var(--brand)' : tm, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
        {t.dateOfBirth} * {showErrors && !value && '(wymagane)'}
      </label>
      <div style={{ ...fieldStyle, position: 'relative' }}>
        <input
          type="date"
          value={value || ''}
          max={localToday}
          onChange={e => onChange(e.target.value || '')}
          className="block h-[1.6em] w-full min-w-0 max-w-full box-border border-0 bg-transparent p-0 m-0 font-body text-base leading-[1.6] text-inherit outline-none"
        />
        {!hasValue && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#A9A9A9',
              fontSize: '16px',
              fontFamily: 'var(--font-body)',
              pointerEvents: 'none',
            }}
          >
            1 sty 2000
          </span>
        )}
      </div>
    </div>
  );
}