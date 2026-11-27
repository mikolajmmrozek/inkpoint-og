import { FILTER_ROWS, SERVICE_CATEGORIES } from '@/lib/marketing';
import { labelStyle, chipStyle } from '@/lib/marketingUi';

export default function AudienceFilters({ filters, onChange, t }) {
  const toggleCategory = (key) => {
    const current = filters.service_categories || [];
    onChange({
      ...filters,
      service_categories: current.includes(key) ? current.filter(item => item !== key) : [...current, key],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <span style={labelStyle(t)}>Kategoria usługi — z ankiety lub rezerwacji</span>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_CATEGORIES.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => toggleCategory(key)} style={chipStyle((filters.service_categories || []).includes(key), t)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {FILTER_ROWS.map(row => (
        <div key={row.key}>
          <span style={labelStyle(t)}>{row.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {row.options.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange({ ...filters, [row.key]: option.key })}
                style={chipStyle((filters[row.key] || 'any') === option.key, t)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1.8, color: t.muted, letterSpacing: '0.05em' }}>
        Wybrane wymiary łączą się (klient musi spełnić wszystkie). Kategorie usług w jednym wymiarze sumują się.
      </p>
    </div>
  );
}