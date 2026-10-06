// Local CSS-variable overrides for components that read the global theme tokens
// (--foreground-rgb, --foreground, --background, --card, --border) but are rendered
// inside the dashboard, whose light/dark switch is independent of the global theme.
// Spread the result into a wrapper's `style` so every child inherits matching colors.
const LIGHT = {
  '--foreground-rgb': '0 0 0',
  '--foreground': '0 0% 10%',
  '--background': '0 0% 100%',
  '--card': '0 0% 100%',
  '--border': '0 0% 85%',
};

const DARK = {
  '--foreground-rgb': '245 240 235',
  '--foreground': '36 33% 94%',
  '--background': '0 0% 4%',
  '--card': '0 0% 6%',
  '--border': '0 0% 15%',
};

export const getThemeVars = (theme) => (theme === 'light' ? LIGHT : DARK);