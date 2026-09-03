export default function StatsTile({ label, value, active = false, onClick, t }) {
  const clickable = typeof onClick === 'function';
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={clickable ? 'text-left transition-all' : ''}
      style={{
        border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
        background: active ? 'rgb(var(--brand-rgb) /0.05)' : t.bg,
        padding: '16px 20px',
        cursor: clickable ? 'pointer' : 'default',
        minWidth: '120px',
        borderRadius: 'var(--radius)',
      }}
    >
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'var(--brand)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: active ? 'var(--brand)' : t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{label}</p>
    </Tag>
  );
}