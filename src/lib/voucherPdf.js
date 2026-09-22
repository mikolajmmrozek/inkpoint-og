import { jsPDF } from 'jspdf';

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#FF007F');
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 0, b: 127 };
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const loadImageDataUrl = (url) =>
  new Promise((resolve) => {
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

export const buildVoucherPDF = async (promo, settings, recipientName) => {
  const brand = hexToRgb(settings?.primary_color || '#FF007F');
  const ink = { r: 26, g: 26, b: 26 };
  const muted = { r: 138, g: 138, b: 138 };
  const studioName = (settings?.app_description || 'ROMANS TATTOO').toUpperCase();
  const street = settings?.contact_address_street;
  const city = settings?.contact_address_city;
  const phone = settings?.contact_phone;
  const emailAddr = settings?.contact_email;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const H = 297;
  const x0 = 30, x1 = 198, cw = x1 - x0;

  const isDisabled = promo.is_active === false;
  const isRevoked = promo.revoked === true;
  const expired = promo.expires_at ? new Date(promo.expires_at).getTime() < Date.now() : false;
  const isGrace = promo.is_grace === true && promo.grace_expires_at ? new Date(promo.grace_expires_at).getTime() >= Date.now() : false;
  const amount = isGrace ? (promo.balance || promo.grace_value || promo.value || 0) : (promo.value || 0);

  // Brand sidebar
  doc.setFillColor(brand.r, brand.g, brand.b);
  doc.rect(0, 0, 16, H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const tw = doc.getTextWidth(studioName);
  doc.text(studioName, 8, (H + tw) / 2, { angle: 90, align: 'left' });
  doc.setFillColor(255, 255, 255);
  doc.rect(7.4, 10, 1.2, 12, 'F');

  let y = 20;

  // Inactive / grace banner
  if (isRevoked || isDisabled || (expired && !isGrace)) {
    const label = isRevoked ? 'VOUCHER ODWOŁANY' : isDisabled ? 'VOUCHER WYŁĄCZONY' : 'VOUCHER WYGASŁ';
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(brand.r, brand.g, brand.b);
    doc.setLineWidth(0.4);
    doc.roundedRect(x0, y, cw, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(brand.r, brand.g, brand.b);
    doc.text(label, x0 + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(muted.r, muted.g, muted.b);
    const desc = isRevoked ? 'Voucher odwołany przez studio.' : isDisabled ? 'Voucher tymczasowo wyłączony.' : 'Upłynęła data ważności.';
    doc.text(desc, x0 + 4, y + 11);
    y += 20;
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(78);
  doc.setTextColor(brand.r, brand.g, brand.b);
  doc.text('VOUCHER', x0, y + 18);
  doc.setDrawColor(brand.r, brand.g, brand.b);
  doc.setLineWidth(0.9);
  doc.line(x0, y + 21, x1, y + 21);
  doc.setFontSize(15);
  doc.text('PODARUNKOWY', x0, y + 27);
  y += 46;

  // Recipient
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(ink.r, ink.g, ink.b);
  doc.text(recipientName ? 'DLA' : 'NA OKAZICIELA', x0, y);
  if (recipientName) {
    doc.setFontSize(28);
    doc.setTextColor(brand.r, brand.g, brand.b);
    doc.text(recipientName, x0, y + 12);
    y += 10;
  }
  y += 16;

  // Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(ink.r, ink.g, ink.b);
  doc.text('O WARTOŚCI', x0, y);
  doc.setFontSize(54);
  doc.setTextColor(brand.r, brand.g, brand.b);
  const amtStr = String(amount);
  doc.text(amtStr, x0, y + 18);
  const amtW = doc.getTextWidth(amtStr);
  doc.setFontSize(20);
  doc.text('PLN', x0 + amtW + 4, y + 18);
  y += 30;

  // Info windows
  const winY = y;
  const winH = 46;
  doc.setDrawColor(210, 210, 210);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(x0, winY, 118, winH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brand.r, brand.g, brand.b);
  doc.text('KOD VOUCHERA', x0 + 6, winY + 8);
  doc.setFontSize(22);
  doc.setTextColor(ink.r, ink.g, ink.b);
  doc.text(promo.code || '', x0 + 6, winY + 19);
  doc.setFontSize(8);
  doc.setTextColor(brand.r, brand.g, brand.b);
  doc.text('WAŻNY DO', x0 + 6, winY + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(ink.r, ink.g, ink.b);
  doc.text(formatDate(promo.expires_at), x0 + 6, winY + 37);
  if (isGrace) {
    doc.setFontSize(7);
    doc.setTextColor(brand.r, brand.g, brand.b);
    doc.text('Ostatnia szansa: ' + formatDate(promo.grace_expires_at), x0 + 6, winY + 43);
  }

  // QR window
  const qrX = x0 + 124, qrW = 44;
  doc.setDrawColor(210, 210, 210);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(qrX, winY, qrW, winH, 2, 2, 'FD');
  let qrData = null;
  if (promo.qr_code_url) qrData = await loadImageDataUrl(promo.qr_code_url);
  if (qrData) {
    try { doc.addImage(qrData, 'PNG', qrX + 6, winY + 6, 32, 32); } catch { /* ignore */ }
  } else {
    doc.setDrawColor(brand.r, brand.g, brand.b);
    doc.setLineWidth(0.4);
    doc.rect(qrX + 8, winY + 6, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(brand.r, brand.g, brand.b);
    doc.text('QR', qrX + 19, winY + 21, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(muted.r, muted.g, muted.b);
  doc.text('ZESKAJ ABY ZREALIZOWAĆ', qrX + qrW / 2, winY + 40, { align: 'center' });

  y = winY + winH + 10;

  // Contact block (right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brand.r, brand.g, brand.b);
  const contactLabel = 'DANE KONTAKTOWE';
  doc.text(contactLabel, x1 - doc.getTextWidth(contactLabel), y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(ink.r, ink.g, ink.b);
  let cy = y + 6;
  [street, city, phone ? 'Tel. ' + phone : null, emailAddr].filter(Boolean).forEach((line) => {
    doc.text(line, x1 - doc.getTextWidth(line), cy);
    cy += 6;
  });

  // Clause at bottom
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(x0, 283, x1, 283);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted.r, muted.g, muted.b);
  const clause = 'Voucher do zrealizowania na usługi w studio, nie podlega wymianie na gotówkę. Zachowaj go i pamiętaj o okazaniu na sesji.';
  doc.text(doc.splitTextToSize(clause, cw), x0, 287);

  return doc;
};

export const downloadVoucherPDF = async (promo, settings, recipientName) => {
  const doc = await buildVoucherPDF(promo, settings, recipientName);
  doc.save(`Voucher-${promo.code || 'voucher'}.pdf`);
};

export const printVoucherPDF = async (promo, settings, recipientName) => {
  const doc = await buildVoucherPDF(promo, settings, recipientName);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};