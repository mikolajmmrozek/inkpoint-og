export const shopTheme = (theme) => (theme === 'light'
  ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.45)', fuchsia: 'var(--brand)', panel: '#FAFAFA' }
  : { bg: 'rgba(10,10,10,0.85)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.45)', fuchsia: 'var(--brand)', panel: 'rgba(255,255,255,0.03)' });

export const mono = { fontFamily: 'var(--font-mono)' };
export const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

export const inputStyle = (t) => ({
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `0.5px solid ${t.border}`,
  color: t.text,
  padding: '9px 0',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
});

export const labelStyle = (t) => ({
  fontFamily: 'var(--font-mono)',
  fontSize: '8px',
  color: t.muted,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '4px',
});