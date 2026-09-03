import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FONT_PACKAGES, CORNER_RADIUS_OPTIONS, BORDER_THICKNESS_OPTIONS, IMAGE_BORDER_OPTIONS, hexToHsl, hexToRgb, isLightColor, DEFAULT_THEME } from '@/lib/themeConfig';

const ThemeSettingsContext = createContext({ theme: DEFAULT_THEME, refreshTheme: () => {} });
export const useThemeSettings = () => useContext(ThemeSettingsContext);

export function applyTheme(theme) {
  const root = document.documentElement;
  const primary = theme.primary_color || '#FF007F';
  const hsl = hexToHsl(primary);
  const rgb = hexToRgb(primary);

  // Primary color CSS variables
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--accent', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--destructive', hsl);
  root.style.setProperty('--brand', primary);
  root.style.setProperty('--brand-rgb', rgb);
  // Button text: dark color → light text, light color → dark text
  root.style.setProperty('--btn-text', isLightColor(primary) ? '#0A0A0A' : '#F5F0EB');

  // Font package
  const pkg = FONT_PACKAGES[theme.font_package] || FONT_PACKAGES.original;
  root.style.setProperty('--font-display', pkg.display);
  root.style.setProperty('--font-body', pkg.body);
  root.style.setProperty('--font-mono', pkg.mono);

  // Corner radius
  const cr = CORNER_RADIUS_OPTIONS[theme.corner_radius] || CORNER_RADIUS_OPTIONS.sharp;
  root.style.setProperty('--radius', cr.radius);

  // Border thickness
  const bt = BORDER_THICKNESS_OPTIONS[theme.border_thickness] || BORDER_THICKNESS_OPTIONS.needle;
  root.style.setProperty('--border-width', bt.width);

  // Image border style
  const ib = IMAGE_BORDER_OPTIONS[theme.image_border_style] || IMAGE_BORDER_OPTIONS.none;
  root.style.setProperty('--media-border-width', ib.width);
  root.style.setProperty('--media-border-color', ib.color);

  // Dark/Light mode for public site
  root.setAttribute('data-theme', theme.theme_mode || 'dark');
}

// Apply cached theme immediately (before React renders) to prevent flash
const cachedTheme = (() => {
  try { return JSON.parse(localStorage.getItem('themeSettings') || 'null'); } catch { return null; }
})();
if (cachedTheme) applyTheme(cachedTheme);
else applyTheme(DEFAULT_THEME);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(cachedTheme || DEFAULT_THEME);

  const loadTheme = useCallback(async () => {
    try {
      const records = await base44.entities.SiteSettings.filter({ key: 'theme' });
      if (records.length > 0) {
        const t = {
          theme_mode: records[0].theme_mode || 'dark',
          primary_color: records[0].primary_color || '#FF007F',
          font_package: records[0].font_package || 'original',
          corner_radius: records[0].corner_radius || 'sharp',
          border_thickness: records[0].border_thickness || 'needle',
          image_border_style: records[0].image_border_style || 'none',
        };
        setTheme(t);
        localStorage.setItem('themeSettings', JSON.stringify(t));
        applyTheme(t);
      } else {
        applyTheme(DEFAULT_THEME);
      }
    } catch {
      applyTheme(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const refreshTheme = useCallback(() => { loadTheme(); }, [loadTheme]);

  return (
    <ThemeSettingsContext.Provider value={{ theme, refreshTheme }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}