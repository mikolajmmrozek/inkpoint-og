export default function StatsTile({ label, value, active = false, onClick, t }) {
  const clickable = typeof onClick === 'function';
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={clickable ? 'text-left transition-all' : ''}
      style={{
        border: `0.5px solid ${active ? '#FF007F' : t.border}`,
        background: active ? 'rgba(255,0,127,0.05)' : t.bg,
        padding: '16px 20px',
        cursor: clickable ? 'pointer' : 'default',
        minWidth: '120px',
      }}
    >
      <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2rem', fontWeight: 400, color: '#FF007F', lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: active ? '#FF007F' : t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{label}</p>
    </Tag>
  );
}