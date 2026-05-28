export default function DatePickerCustom({ value, onChange, showErrors, t }) {
  const parsedDate = value ? new Date(value) : null;
  const day = parsedDate?.getDate() || '';
  const month = parsedDate?.getMonth() + 1 || '';
  const year = parsedDate?.getFullYear() || '';

  const handleChange = (newDay, newMonth, newYear) => {
    if (newDay && newMonth && newYear) {
      const dateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
      onChange(dateStr);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const selectStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: showErrors && !value ? '1px solid #FF007F' : '0.5px solid #262626',
    color: '#F5F0EB',
    padding: '8px 8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    flex: 1,
  };

  return (
    <div>
      <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: showErrors && !value ? '#FF007F' : 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
        {t.dateOfBirth} * {showErrors && !value && '(wymagane)'}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select value={day} onChange={e => handleChange(Number(e.target.value) || 0, month, year)} style={selectStyle}>
          <option value="">Dzień</option>
          {days.map(d => (
            <option key={d} value={d}>
              {String(d).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select value={month} onChange={e => handleChange(day, Number(e.target.value) || 0, year)} style={selectStyle}>
          <option value="">Miesiąc</option>
          {months.map(m => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select value={year} onChange={e => handleChange(day, month, Number(e.target.value) || 0)} style={selectStyle}>
          <option value="">Rok</option>
          {years.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}