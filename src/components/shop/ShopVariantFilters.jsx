export default function ShopVariantFilters({ facets, selected, onToggle, onClear }) {
  if (!facets || facets.length === 0) return null;
  const activeCount = Object.values(selected || {}).reduce((n, vals) => n + (vals?.length || 0), 0);

  return (
    <div className="py-5 space-y-3" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
      {facets.map(facet => (
        <div key={facet.name} className="flex flex-wrap items-center gap-2">
          <span className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.16em', minWidth: '92px' }}>
            {(facet.name || '').toUpperCase()}
          </span>
          {facet.values.map(value => {
            const active = (selected?.[facet.name] || []).includes(value);
            return (
              <button
                key={value}
                onClick={() => onToggle(facet.name, value)}
                className="text-micro"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  padding: '5px 11px',
                  border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`,
                  color: active ? 'var(--brand)' : 'hsl(var(--muted-foreground))',
                  background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                  borderRadius: 'var(--radius)',
                }}
              >
                {value}
              </button>
            );
          })}
        </div>
      ))}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="text-micro"
          style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          WYCZYŚĆ FILTRY ({activeCount})
        </button>
      )}
    </div>
  );
}