export const fieldStyle = (t) => ({
  background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.border}`,
  color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none',
  fontFamily: 'var(--font-body)', lineHeight: 1.5,
});

export const labelStyle = (t) => ({
  fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.16em',
  textTransform: 'uppercase', color: t.muted, marginBottom: '4px', display: 'block',
});

export const selectStyle = (t) => ({
  background: t.card, border: `0.5px solid ${t.border}`, color: t.text,
  padding: '9px 10px', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
  borderRadius: 'var(--radius)', outline: 'none', width: '100%',
});

export const chipStyle = (active, t) => ({
  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
  padding: '7px 12px', cursor: 'pointer', borderRadius: 'var(--radius)',
  border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
  background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
  color: active ? 'var(--brand)' : t.muted,
});

export const marketingTheme = (theme) => theme === 'light'
  ? { border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.45)', card: '#F8F8F8', notice: '#FFF7E6' }
  : { border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.45)', card: 'rgba(38,38,38,0.2)', notice: 'rgba(245,158,11,0.07)' };