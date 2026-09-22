import { jsPDF } from 'jspdf';

// Vector voucher PDF generator.
// Tracks the studio's active font package (display font) and leading color,
// embedding the display .ttf plus Inter (unicode body font for Polish diacritics).
// jsPDF built-in helvetica can't render ą/ę/ł/ń/ś/ź/ż, so all text uses embedded
// unicode fonts with Identity-H encoding.

const PT = 2.8346456692913386; // points per mm
const PAGE_W = 210;
const PAGE_H = 297;
const SIDEBAR_W = 16;
const LX = 30;       // frame left (16 sidebar + 14 inset)
const RX = 198;      // frame right (210 - 12 inset)
const FW = RX - LX;  // frame width
const INK = '#1A1A1A';
const MUTED = '#8A8A8A';

// Display font per package (static .ttf at the weight used on screen).
const DISPLAY_FONTS = {
  original: { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/bebas-neue@0.4.1/400Regular/BebasNeue_400Regular.ttf', family: 'BebasNeue', file: 'BebasNeue.ttf' },
  classic:  { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/montserrat@0.4.1/700Bold/Montserrat_700Bold.ttf', family: 'Montserrat', file: 'Montserrat.ttf' },
  elegant:  { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/playfair-display@0.4.1/700Bold/PlayfairDisplay_700Bold.ttf', family: 'PlayfairDisplay', file: 'PlayfairDisplay.ttf' },
  modern:   { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/space-grotesk@0.4.1/700Bold/SpaceGrotesk_700Bold.ttf', family: 'SpaceGrotesk', file: 'SpaceGrotesk.ttf' },
  fraunces: { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/fraunces@0.4.1/700Bold/Fraunces_700Bold.ttf', family: 'Fraunces', file: 'Fraunces.ttf' },
};
const INTER = { url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.4.1/400Regular/Inter_400Regular.ttf', family: 'Inter', file: 'Inter.ttf' };

const fontCache = {};

async function fetchFontBase64(key, url) {
  if (fontCache[key]) return fontCache[key];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('bad response');
    const ab = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(ab);
    fontCache[key] = b64;
    return b64;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function loadImageDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function hexToRgb(hex) {
  hex = (hex || '#FF007F').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * t);
  const g = Math.round(A[1] + (B[1] - A[1]) * t);
  const bl = Math.round(A[2] + (B[2] - A[2]) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const setFill = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); };
const setStroke = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); };
const setText = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); };

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// letter-spacing helper: charSpace is in mm (current unit)
const tracking = (emMm, factor) => emMm * factor;

function lineGapMm(sizePt, factor) {
  return (sizePt * factor) / PT;
}

async function buildDoc(promo, settings) {
  const brand = settings?.primary_color || '#FF007F';
  const pkgKey = settings?.font_package || 'original';
  const dispSrc = DISPLAY_FONTS[pkgKey] || DISPLAY_FONTS.original;

  const [dispB64, interB64] = await Promise.all([
    fetchFontBase64(pkgKey, dispSrc.url).then((b) => b || fetchFontBase64('original', DISPLAY_FONTS.original.url)),
    fetchFontBase64('inter', INTER.url),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Voucher ${promo?.code || ''}` });

  // Register fonts (Identity-H for unicode / Polish diacritics)
  let displayFamily = 'helvetica';
  let bodyFamily = 'helvetica';
  if (dispB64) {
    doc.addFileToVFS(dispSrc.file, dispB64);
    doc.addFont(dispSrc.file, dispSrc.family, 'normal', 'Identity-H');
    displayFamily = dispSrc.family;
  }
  if (interB64) {
    doc.addFileToVFS(INTER.file, interB64);
    doc.addFont(INTER.file, INTER.family, 'normal', 'Identity-H');
    bodyFamily = INTER.family;
  }
  // Fallbacks so Polish still renders if one font failed to load
  if (!dispB64 && interB64) displayFamily = INTER.family;
  if (!interB64 && dispB64) bodyFamily = dispSrc.family;

  // --- Page base ---
  setFill(doc, '#FFFFFF');
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // --- Background arcs (drawn before sidebar so the sidebar masks any bleed) ---
  doc.setLineWidth(0.15);
  const arcs = [
    [186, 40, 70, 0.93], [186, 40, 100, 0.95], [186, 40, 130, 0.97],
    [36, 260, 60, 0.94], [36, 260, 90, 0.96], [36, 260, 120, 0.98],
  ];
  arcs.forEach(([cx, cy, r, white]) => {
    setStroke(doc, mix(brand, '#FFFFFF', white));
    doc.circle(cx, cy, r, 'S');
  });

  // --- Left sidebar ---
  setFill(doc, brand);
  doc.rect(0, 0, SIDEBAR_W, PAGE_H, 'F');
  const studioName = (settings?.app_description || 'ROMANS TATTOO').toUpperCase();
  doc.setFont(displayFamily, 'normal');
  doc.setFontSize(7.5 * PT);
  setText(doc, '#FFFFFF');
  const nameW = doc.getTextWidth(studioName);
  // angle 90 = CCW; text extends upward from the start point. Pin the block to the top margin (matches on-screen).
  doc.text(studioName, 10.5, 10 + nameW, { angle: 90, baseline: 'alphabetic' });
  // decorative tick — 12mm bar, 10mm from the sidebar bottom (matches on-screen bottom:10mm)
  setFill(doc, mix(brand, '#FFFFFF', 0.5));
  doc.rect(7.4, 275, 1.2, 12, 'F');

  // --- Status (mirrors Voucher.jsx) ---
  const isDisabled = promo.is_active === false;
  const isRevoked = promo.revoked === true;
  const expired = promo.expires_at ? new Date(promo.expires_at).getTime() < Date.now() : false;
  const isGrace = promo.is_grace === true && promo.grace_expires_at ? new Date(promo.grace_expires_at).getTime() >= Date.now() : false;
  const inactive = isDisabled || isRevoked || expired;
  const amount = isGrace ? (promo.balance || promo.grace_value || promo.value || 0) : (promo.value || 0);
  const statusLabel = isRevoked ? 'Voucher odwołany' : isDisabled ? 'Voucher wyłączony' : expired ? (isGrace ? 'Tryb ostatniej szansy' : 'Voucher wygasł') : '';
  const statusDesc = isRevoked
    ? 'Ten voucher został odwołany przez studio i nie może zostać zrealizowany.'
    : isDisabled
      ? 'Ten voucher został tymczasowo wyłączony przez studio.'
      : expired
        ? isGrace
          ? 'Voucher wygasł, ale został przedłużony w trybie ostatniej szansy z obniżoną wartością.'
          : 'Upłynęła data ważności tego vouchera.'
        : '';

  let y = 10;

  // --- Inactive banner ---
  if (statusLabel) {
    const bH = 20;
    setFill(doc, mix(brand, '#FFFFFF', 0.95));
    setStroke(doc, brand);
    doc.setLineWidth(0.3);
    doc.roundedRect(LX, y, FW, bH, 1.5, 1.5, 'FD');
    doc.setFont(bodyFamily, 'normal');
    doc.setFontSize(8.5);
    setText(doc, brand);
    doc.text(statusLabel.toUpperCase(), LX + 5, y + 4.5, { baseline: 'top', charSpace: tracking(3, 0.12) });
    doc.setFontSize(8);
    setText(doc, MUTED);
    const descLines = doc.splitTextToSize(statusDesc, FW - 10);
    doc.text(descLines, LX + 5, y + 10, { baseline: 'top', lineHeightFactor: 1.5 });
    y += bH + 6;
  }

  // --- Header: VOUCHER / rule / PODARUKOWY ---
  doc.setFont(displayFamily, 'normal');
  doc.setFontSize(26 * PT);
  setText(doc, brand);
  doc.text('VOUCHER', LX, y, { baseline: 'top' });
  y += 26 * 0.82 + 3;           // VOUCHER line height + rule margin-top (larger interline to match preview)
  setFill(doc, brand);
  doc.rect(LX, y, FW, 0.9, 'F');
  y += 0.9 + 1.5;               // rule + margin-bottom
  doc.setFont(displayFamily, 'normal');
  doc.setFontSize(5.5 * PT);
  setText(doc, brand);
  doc.text('PODARUKOWY', LX, y, { baseline: 'top', charSpace: tracking(5.5, 0.22) });
  y += 5.5 + 16;                 // PODARUKOWY + header marginBottom

  // --- Recipient ---
  const recipientName = settings?._recipientName || '';
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(3.2 * PT);
  setText(doc, INK);
  doc.text(recipientName ? 'DLA' : 'NA OKAZICIELA', LX, y, { baseline: 'top', charSpace: tracking(3.2, 0.25) });
  y += 3.2 + 2.5;                // label + margin
  if (recipientName) {
    doc.setFont(displayFamily, 'normal');
    doc.setFontSize(11 * PT);
    setText(doc, brand);
    doc.text(recipientName, LX, y, { baseline: 'top', charSpace: tracking(11, 0.03) });
    y += 11 * 0.95;              // name line height
  }
  y += 14;                       // recipient marginBottom

  // --- Amount ---
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(3.2 * PT);
  setText(doc, INK);
  doc.text('O WARTOŚCI', LX, y, { baseline: 'top', charSpace: tracking(3.2, 0.25) });
  y += 3.2 + 2;                  // label + margin
  const amountMm = amount >= 1000 ? 30 : 34;
  doc.setFont(displayFamily, 'normal');
  doc.setFontSize(amountMm * PT);
  setText(doc, brand);
  const numStr = String(amount);
  doc.text(numStr, LX, y, { baseline: 'top' });
  const numW = doc.getTextWidth(numStr);
  // Align PLN baseline with the number baseline (same line box, as on screen).
  const baselineY = y + 0.73 * amountMm;
  const plnMm = 12;
  doc.setFontSize(plnMm * PT);
  setText(doc, brand);
  doc.text('PLN', LX + numW + 3, baselineY, { baseline: 'alphabetic', charSpace: tracking(12, 0.1) });
  y += amountMm * 0.82 + 12;     // amount line height + marginBottom

  // --- Windows row: code+date (left), QR (right) ---
  const winH = 46;
  const qrW = 44;
  const gap = 4;
  const codeW = FW - qrW - gap;
  const winFill = mix('#000000', '#FFFFFF', 0.96);
  const winStroke = mix('#000000', '#FFFFFF', 0.94);
  setFill(doc, winFill);
  setStroke(doc, winStroke);
  doc.setLineWidth(0.25);
  doc.roundedRect(LX, y, codeW, winH, 2, 2, 'FD');
  const qrX = LX + codeW + gap;
  doc.roundedRect(qrX, y, qrW, winH, 2, 2, 'FD');

  // code + date content (matches on-screen mm: labels 2.8, code 7, date 5)
  const padX = 5;
  let cy = y + 5;
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(2.8 * PT);
  setText(doc, brand);
  doc.text('KOD VOUCHERA', LX + padX, cy, { baseline: 'top', charSpace: tracking(2.8, 0.2) });
  cy += 2.8 + 3;
  doc.setFontSize(7 * PT);
  setText(doc, INK);
  doc.text(promo.code || '', LX + padX, cy, { baseline: 'top', charSpace: tracking(7, 0.3) });
  cy += 7 + 4;
  doc.setFontSize(2.8 * PT);
  setText(doc, brand);
  doc.text('WAŻNY DO', LX + padX, cy, { baseline: 'top', charSpace: tracking(2.8, 0.2) });
  cy += 2.8 + 3;
  doc.setFontSize(5 * PT);
  setText(doc, INK);
  doc.text(formatDate(promo.expires_at), LX + padX, cy, { baseline: 'top' });
  if (isGrace) {
    cy += 5 + 1.5;
    doc.setFontSize(2.6 * PT);
    setText(doc, brand);
    doc.text(`Ostatnia szansa: ${formatDate(promo.grace_expires_at)}`, LX + padX, cy, { baseline: 'top' });
  }

  // QR content
  const qrImgSize = 32;
  const qrImgX = qrX + (qrW - qrImgSize) / 2;
  const qrImgY = y + 5;
  if (promo.qr_code_url) {
    const dataUrl = await loadImageDataUrl(promo.qr_code_url);
    if (dataUrl) {
      setFill(doc, '#FFFFFF');
      setStroke(doc, mix('#000000', '#FFFFFF', 0.9));
      doc.setLineWidth(0.2);
      doc.rect(qrImgX - 1.5, qrImgY - 1.5, qrImgSize + 3, qrImgSize + 3, 'FD');
      doc.addImage(dataUrl, 'PNG', qrImgX, qrImgY, qrImgSize, qrImgSize);
    } else {
      drawQrPlaceholder(doc, qrImgX, qrImgY, qrImgSize, brand);
    }
  } else {
    drawQrPlaceholder(doc, qrImgX, qrImgY, qrImgSize, brand);
  }
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(2.4 * PT);
  setText(doc, MUTED);
  const scanLabelLines = ['ZESKAJ ABY', 'ZREALIZOWAĆ'];
  let scanY = qrImgY + qrImgSize + 2;
  scanLabelLines.forEach((ln) => {
    doc.text(ln, qrX + qrW / 2, scanY, { baseline: 'top', align: 'center', charSpace: tracking(2.4, 0.15) });
    scanY += 2.4 * 1.25;
  });

  y += winH + 6;

  // --- Contact block (right aligned) ---
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(2.8 * PT);
  setText(doc, brand);
  const headerCs = tracking(2.8, 0.2);
  const headerText = 'DANE KONTAKTOWE';
  const headerW = doc.getTextWidth(headerText) + headerCs * (headerText.length - 1);
  doc.text(headerText, RX - headerW, y, { baseline: 'top', charSpace: headerCs });
  y += 2.8 + 2.5;
  doc.setFontSize(3.4 * PT);
  setText(doc, INK);
  const lines = [];
  if (settings?.contact_address_street) lines.push(settings.contact_address_street);
  if (settings?.contact_address_city) lines.push(settings.contact_address_city);
  if (settings?.contact_phone) lines.push(`Tel. ${settings.contact_phone}`);
  if (settings?.contact_email) lines.push(settings.contact_email);
  lines.forEach((ln) => {
    const lw = doc.getTextWidth(ln);
    doc.text(ln, RX - lw, y, { baseline: 'top' });
    y += 3.4 * 1.8;
  });

  // --- Clause pinned to bottom ---
  const clause = 'Voucher do zrealizowania na usługi w studio, nie podlega wymianę na gotówkę. Zachowaj go i pamiętaj o okazaniu na sesji.';
  doc.setFont(bodyFamily, 'normal');
  doc.setFontSize(8.5);
  const clauseLines = doc.splitTextToSize(clause, FW);
  const clauseLh = 3 * 1.6;
  const clauseBottom = 281;          // 297 - 10 (frame bottom) - 6 (bottom inset)
  const clauseTop = clauseBottom - clauseLines.length * clauseLh;
  setStroke(doc, mix('#000000', '#FFFFFF', 0.92));
  doc.setLineWidth(0.2);
  doc.line(LX, clauseTop - 4, RX, clauseTop - 4);
  setText(doc, MUTED);
  doc.setFontSize(3 * PT);
  doc.text(clauseLines, LX, clauseTop, { baseline: 'top', lineHeightFactor: 1.6 });

  return doc;
}

function drawQrPlaceholder(doc, x, y, size, brand) {
  setFill(doc, '#FFFFFF');
  setStroke(doc, brand);
  doc.setLineWidth(0.3);
  doc.rect(x, y, size, size, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  setText(doc, brand);
  doc.text('QR', x + size / 2, y + size / 2, { baseline: 'middle', align: 'center' });
}

export async function downloadVoucherPDF(promo, settings) {
  const doc = await buildDoc(promo, settings || {});
  doc.save(`Voucher-${promo?.code || 'voucher'}.pdf`);
}

export async function printVoucherPDF(promo, settings) {
  const doc = await buildDoc(promo, settings || {});
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}