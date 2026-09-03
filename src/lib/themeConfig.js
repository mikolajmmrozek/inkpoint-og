// Font packages — each defines display, body, mono font stacks + Google Fonts import query
export const FONT_PACKAGES = {
  original: {
    label: 'Oryginalny',
    description: 'Bebas Neue · Inter · Inter',
    display: "'Bebas Neue', 'Barlow Condensed', system-ui",
    body: "'Inter', sans-serif",
    mono: "'Inter', sans-serif",
    import: 'Bebas+Neue&family=Inter:wght@300;400;500;600;700',
  },
  classic: {
    label: 'Czytelny',
    description: 'Montserrat · Inter · Source Code Pro',
    display: "'Montserrat', system-ui",
    body: "'Inter', sans-serif",
    mono: "'Source Code Pro', monospace",
    import: 'Montserrat:wght@600;700;800&family=Inter:wght@300;400;500;600;700&family=Source+Code+Pro:wght@400;500;600',
  },
  elegant: {
    label: 'Elegancki',
    description: 'Playfair Display · Source Sans 3 · Cormorant Garamond',
    display: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', sans-serif",
    mono: "'Cormorant Garamond', Georgia, serif",
    import: 'Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@500;600;700',
  },
  modern: {
    label: 'Nowoczesny',
    description: 'Space Grotesk · Inter · Space Mono',
    display: "'Space Grotesk', system-ui",
    body: "'Inter', sans-serif",
    mono: "'Space Mono', monospace",
    import: 'Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700',
  },
  fraunces: {
    label: 'Klasyczny',
    description: 'Fraunces (serif) · Inter · Inter — czyste, eleganckie',
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', sans-serif",
    mono: "'Inter', sans-serif",
    import: 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600;700',
  },
};

// 12 preset primary colors
export const PRESET_COLORS = [
  '#FF007F', // Magenta
  '#E11D48', // Rose/Róż
  '#DC2626', // Red/Czerwony
  '#EA580C', // Orange/Pomarańcz
  '#D97706', // Amber/Bursztyn
  '#CA8A04', // Yellow/Żółty
  '#16A34A', // Green/Zielony
  '#059669', // Emerald/Szmaragd
  '#0891B2', // Cyan/Turkus
  '#2563EB', // Blue/Niebieski
  '#7C3AED', // Violet/Fiolet
  '#C026D3', // Orchid/Orchidea
];

// Convert hex (#RGB or #RRGGBB) to HSL channels string "H S% L%"
export function hexToHsl(hex) {
  hex = (hex || '#FF007F').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert hex to "R G B" space-separated for rgba() usage
export function hexToRgb(hex) {
  hex = (hex || '#FF007F').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `${r} ${g} ${b}`;
}

// Determine if a color is "light" (for button text contrast)
export function isLightColor(hex) {
  hex = (hex || '#FF007F').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export const CORNER_RADIUS_OPTIONS = {
  sharp: { label: 'Ostre', radius: '0px' },
  soft: { label: 'Delikatnie', radius: '6px' },
  rounded: { label: 'Zaokrąglone', radius: '16px' },
};

export const BORDER_THICKNESS_OPTIONS = {
  needle: { label: 'Iglaste', width: '0.5px' },
  thin: { label: 'Cienkie', width: '1px' },
  bold: { label: 'Wyraźne', width: '2px' },
};

export const IMAGE_BORDER_OPTIONS = {
  none: { label: 'Brak', width: '0', color: 'transparent' },
  subtle: { label: 'Subtelna', width: '1px', color: 'hsl(var(--foreground) / 0.15)' },
  solid: { label: 'Solidna', width: '2px', color: 'hsl(var(--foreground) / 0.4)' },
};

export const DEFAULT_THEME = {
  theme_mode: 'dark',
  primary_color: '#FF007F',
  font_package: 'original',
  corner_radius: 'sharp',
  border_thickness: 'needle',
  image_border_style: 'none',
};