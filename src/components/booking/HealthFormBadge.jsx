const STATUS_STYLES = {
  none: { color: '#9ca3af' },
  green: { color: '#16a34a' },
  yellow: { color: '#f59e0b' },
  red: { color: '#ef4444' },
};

export default function HealthFormBadge({ status = 'none', style, fontSize = '7px' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.none;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        border: `0.5px solid ${s.color}`,
        color: s.color,
        ...style,
      }}
    >
      ANKIETA
    </span>
  );
}