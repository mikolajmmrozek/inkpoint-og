export default function StudioAvatar({ studio, theme, size = 36 }) {
  const bg = theme === 'light' ? 'rgba(255,0,127,0.08)' : 'rgba(255,0,127,0.12)';
  if (studio?.photo_url) {
    return (
      <img
        src={studio.photo_url}
        alt="Romans Tattoo"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '0.5px solid rgba(255,0,127,0.4)', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, borderRadius: '50%', background: bg, border: '0.5px solid rgba(255,0,127,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <span style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: Math.round(size * 0.42), color: '#FF007F', letterSpacing: '0.05em', lineHeight: 1 }}>RT</span>
    </div>
  );
}