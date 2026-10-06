export default function DatePickerCustom({ value, onChange, showErrors, t, textPrimary, textMuted, borderColor }) {
  const currentYear = new Date().getFullYear();
  const parsedDate = value ? new Date(value) : null;
  const day = parsedDate ? parsedDate.getDate() : '';
  const month = parsedDate ? parsedDate.getMonth() + 1 : '';
  const year = parsedDate ? parsedDate.getFullYear() : '';

  const handleChange = (newDay, newMonth, newYear) => {
    const d = newDay || day || 1;
    const m = newMonth || month || 1;
    const y = newYear || year || currentYear;
    if (d && m && y) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      onChange(dateStr);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const tc = textPrimary || '#F5F0EB';
  const tm = textMuted || 'rgba(245,240,235,0.5)';
  const bc = borderColor || '#262626';

  const selectStyle = {
    background: 'rgba(255,255,255,0.09)',
    border: `0.5px solid ${showErrors && !value ? 'var(--brand)' : bc}`,
    borderRadius: '4px',
    color: tc,
    padding: '10px 10px',
    fontSize: '16px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    flex: 1,
  };

  return (
    <div>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: showErrors && !value ? 'var(--brand)' : tm, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
        {t.dateOfBirth} * {showErrors && !value && '(wymagane)'}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select value={String(day)} onChange={e => handleChange(Number(e.target.value), month, year)} style={selectStyle}>
          <option value="0">Dzień</option>
          {days.map(d => (
            <option key={d} value={String(d)}>
              {String(d).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select value={String(month)} onChange={e => handleChange(day, Number(e.target.value), year)} style={selectStyle}>
          <option value="0">Miesiąc</option>
          {months.map(m => (
            <option key={m} value={String(m)}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select value={String(year)} onChange={e => handleChange(day, month, Number(e.target.value))} style={selectStyle}>
          <option value="0">Rok</option>
          {years.map(y => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}