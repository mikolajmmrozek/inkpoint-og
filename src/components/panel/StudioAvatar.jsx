export default function StudioAvatar({ studio, theme, size = 36 }) {
  const bg = theme === 'light' ? 'rgb(var(--brand-rgb) /0.08)' : 'rgb(var(--brand-rgb) /0.12)';
  if (studio?.photo_url) {
    return (
      <img
        src={studio.photo_url}
        alt="Romans Tattoo"
        style={{ width: size, height: size, borderRadius: 'var(--radius)', objectFit: 'cover', border: '0.5px solid rgb(var(--brand-rgb) /0.4)', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, borderRadius: 'var(--radius)', background: bg, border: '0.5px solid rgb(var(--brand-rgb) /0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.42), color: 'var(--brand)', letterSpacing: '0.05em', lineHeight: 1 }}>RT</span>
    </div>
  );
}