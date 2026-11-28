// Podgląd wiadomości w barwach strony: czarne tło, magenta pasek marki.
const BRAND = {
  logo: 'https://media.base44.com/images/public/69e2125172f072e02d3dd03b/7a6e59d93_logo.png',
  name: 'ROMANS TATTOO',
  primary: '#FF007F',
  headerText: '#000000',
  page: '#0a0a0a',
  surface: '#111111',
  text: '#f5f1eb',
  muted: '#ff007f',
  border: '#e5e7eb',
};

// Zestawy czcionek — te same pakiety, których używa strona studia (SiteSettings.font_package).
export const FONT_SCHEMES = [
  {
    key: 'original', label: 'Original — Bebas Neue + Inter',
    heading: "'Bebas Neue', 'Barlow Condensed', Arial, sans-serif",
    body: 'Inter, Arial, sans-serif',
    google: 'Bebas+Neue&family=Inter:wght@400;600;700',
  },
  {
    key: 'classic', label: 'Classic — Montserrat + Source Sans',
    heading: 'Montserrat, Arial, sans-serif',
    body: "'Source Sans 3', Arial, sans-serif",
    google: 'Montserrat:wght@700;800&family=Source+Sans+3:wght@400;600',
  },
  {
    key: 'elegant', label: 'Elegant — Playfair + Cormorant',
    heading: "'Playfair Display', Georgia, serif",
    body: "'Cormorant Garamond', Georgia, serif",
    google: 'Playfair+Display:wght@600;700&family=Cormorant+Garamond:wght@500;600',
  },
  {
    key: 'modern', label: 'Modern — Space Grotesk + Inter',
    heading: "'Space Grotesk', Arial, sans-serif",
    body: 'Inter, Arial, sans-serif',
    google: 'Space+Grotesk:wght@600;700&family=Inter:wght@400;600',
  },
  {
    key: 'fraunces', label: 'Fraunces — Fraunces + Source Sans',
    heading: 'Fraunces, Georgia, serif',
    body: "'Source Sans 3', Arial, sans-serif",
    google: 'Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:wght@400;600',
  },
];

export const fontScheme = (key) => FONT_SCHEMES.find(item => item.key === key) || FONT_SCHEMES[0];

const escape = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildSample = (firstName) => (value = '') => String(value)
  .replace(/\{\{\s*first_name\s*\}\}/g, firstName || 'Ania')
  .replace(/\{\{\s*app_url\s*\}\}/g, 'https://romanstattoo.base44.app')
  .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, 'https://romanstattoo.base44.app/rezygnacja?t=podglad');

const renderBlock = (block, typo, withSample) => {
  if (!block) return '';
  if (block.type === 'heading') {
    return `<h1 style="margin:0 0 16px;font-family:${typo.heading};font-size:${typo.headingSize}px;line-height:1.05;letter-spacing:0.03em;color:${BRAND.text};text-align:${block.align || 'left'}">${escape(withSample(block.text))}</h1>`;
  }
  if (block.type === 'text') {
    const content = escape(withSample(block.text)).replace(/\n/g, '<br />');
    if (!content) return '';
    return `<p style="margin:0 0 18px;font-family:${typo.body};font-size:${typo.bodySize}px;line-height:1.7;color:${BRAND.text}">${content}</p>`;
  }
  if (block.type === 'button') {
    return `<div style="margin:6px 0 22px;text-align:${block.align || 'left'}"><a href="${escape(withSample(block.url || '#'))}" style="display:inline-block;padding:14px 28px;background:${BRAND.primary};color:${BRAND.headerText};font-family:${typo.body};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:16px">${escape(withSample(block.text) || 'Zarezerwuj termin')}</a></div>`;
  }
  if (block.type === 'image') {
    if (!block.image_url) {
      return `<div style="margin:0 0 20px;padding:34px 16px;border:1px dashed #333;border-radius:16px;text-align:center;font-family:${typo.body};font-size:12px;color:#888">Miejsce na zdjęcie</div>`;
    }
    return `<div style="margin:0 0 20px;text-align:center"><img src="${escape(block.image_url)}" alt="${escape(block.text || '')}" style="max-width:100%;border-radius:16px" /></div>`;
  }
  if (block.type === 'divider') return `<div style="margin:8px 0 22px;border-top:1px solid #2a2a2a"></div>`;
  if (block.type === 'spacer') return `<div style="height:26px"></div>`;
  return '';
};

export function buildEmailHtml({
  subject = '',
  preheader = '',
  blocks = [],
  layout = 'classic',
  heroImageUrl = '',
  fontScheme: schemeKey = 'original',
  headingSize = 34,
  bodySize = 15,
  sampleFirstName = '',
} = {}) {
  const scheme = fontScheme(schemeKey);
  const typo = {
    heading: scheme.heading,
    body: scheme.body,
    headingSize: Math.min(64, Math.max(20, Number(headingSize) || 34)),
    bodySize: Math.min(22, Math.max(11, Number(bodySize) || 15)),
  };
  const withSample = buildSample(sampleFirstName);

  const header = layout === 'minimal' ? '' : `
    <tr><td style="background:${BRAND.primary};padding:22px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="${BRAND.logo}" alt="${BRAND.name}" height="34" style="display:block;height:34px" /></td>
        <td style="vertical-align:middle;text-align:right;font-family:${typo.heading};font-size:20px;letter-spacing:0.12em;color:${BRAND.headerText}">${BRAND.name}</td>
      </tr></table>
    </td></tr>`;

  const hero = heroImageUrl
    ? `<tr><td style="padding:0;line-height:0"><img src="${escape(heroImageUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto" /></td></tr>`
    : '';

  const intro = layout === 'editorial' && subject
    ? `<p style="margin:0 0 22px;font-family:${typo.body};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted}">${escape(withSample(subject))}</p>`
    : '';

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escape(subject || 'Podgląd')}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${scheme.google}&display=swap" /></head>
  <body style="margin:0;padding:0;background:${BRAND.page}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(withSample(preheader))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:28px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${BRAND.surface};border:1px solid #232323;border-radius:16px;overflow:hidden">
          ${header}
          ${hero}
          <tr><td style="padding:34px 32px 10px">${intro}${blocks.map(block => renderBlock(block, typo, withSample)).join('')}</td></tr>
          <tr><td style="padding:20px 32px 30px;border-top:1px solid #232323;font-family:${typo.body};font-size:11px;line-height:1.7;color:#8a8a8a">
            Romans Tattoo — studio tatuażu i piercingu w Wolsztynie.<br />
            Jeśli nie chcesz otrzymywać od nas więcej aktualizacji, kliknij poniżej.<br />
            <a href="${escape(withSample('{{unsubscribe_url}}'))}" style="display:inline-block;margin-top:12px;font-family:${typo.body};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8a8a;text-decoration:underline">REZYGNUJĘ</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}