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

const escape = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const withSample = (value = '') => String(value)
  .replace(/\{\{\s*first_name\s*\}\}/g, 'Ania')
  .replace(/\{\{\s*app_url\s*\}\}/g, 'https://romanstattoo.base44.app');

const paragraph = (value = '', style = '') => escape(withSample(value)).replace(/\n/g, '<br />')
  ? `<p style="margin:0 0 18px;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.text};${style}">${escape(withSample(value)).replace(/\n/g, '<br />')}</p>`
  : '';

const renderBlock = (block) => {
  if (!block) return '';
  if (block.type === 'heading') {
    return `<h1 style="margin:0 0 16px;font-family:'Bebas Neue',Arial,sans-serif;font-size:34px;line-height:1.05;letter-spacing:0.03em;color:${BRAND.text};text-align:${block.align || 'left'}">${escape(withSample(block.text))}</h1>`;
  }
  if (block.type === 'text') return paragraph(block.text);
  if (block.type === 'button') {
    return `<div style="margin:6px 0 22px;text-align:${block.align || 'left'}"><a href="${escape(withSample(block.url || '#'))}" style="display:inline-block;padding:14px 28px;background:${BRAND.primary};color:${BRAND.headerText};font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:16px">${escape(withSample(block.text) || 'Zarezerwuj termin')}</a></div>`;
  }
  if (block.type === 'image') {
    if (!block.image_url) {
      return `<div style="margin:0 0 20px;padding:34px 16px;border:1px dashed #333;border-radius:16px;text-align:center;font-family:Inter,Arial,sans-serif;font-size:12px;color:#888">Miejsce na zdjęcie</div>`;
    }
    return `<div style="margin:0 0 20px;text-align:center"><img src="${escape(block.image_url)}" alt="${escape(block.text || '')}" style="max-width:100%;border-radius:16px" /></div>`;
  }
  if (block.type === 'divider') return `<div style="margin:8px 0 22px;border-top:1px solid #2a2a2a"></div>`;
  if (block.type === 'spacer') return `<div style="height:26px"></div>`;
  return '';
};

export function buildEmailHtml({ subject = '', preheader = '', blocks = [], layout = 'classic' } = {}) {
  const header = layout === 'minimal' ? '' : `
    <tr><td style="background:${BRAND.primary};padding:22px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="${BRAND.logo}" alt="${BRAND.name}" height="34" style="display:block;height:34px" /></td>
        <td style="vertical-align:middle;text-align:right;font-family:'Bebas Neue',Arial,sans-serif;font-size:20px;letter-spacing:0.12em;color:${BRAND.headerText}">${BRAND.name}</td>
      </tr></table>
    </td></tr>`;

  const intro = layout === 'editorial' && subject
    ? `<p style="margin:0 0 22px;font-family:Inter,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted}">${escape(withSample(subject))}</p>`
    : '';

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escape(subject || 'Podgląd')}</title></head>
  <body style="margin:0;padding:0;background:${BRAND.page}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(withSample(preheader))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:28px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${BRAND.surface};border:1px solid #232323;border-radius:16px;overflow:hidden">
          ${header}
          <tr><td style="padding:34px 32px 10px">${intro}${blocks.map(renderBlock).join('')}</td></tr>
          <tr><td style="padding:20px 32px 30px;border-top:1px solid #232323;font-family:Inter,Arial,sans-serif;font-size:11px;line-height:1.7;color:#8a8a8a">
            Romans Tattoo — studio tatuażu i piercingu w Wolsztynie.<br />
            Otrzymujesz tę wiadomość, ponieważ korzystałeś z usług studia.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}