import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const MM_TO_PX = 96 / 25.4;

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

// Render the on-screen voucher sheet to a high-res canvas, exactly as it looks.
// We clone the DOM node, neutralize the mobile scale transform, and swap the QR
// image for a same-origin data URL so the canvas isn't tainted.
const renderSheetToCanvas = async (sheetEl, promo) => {
  const clone = sheetEl.cloneNode(true);
  const qrImg = clone.querySelector('img[alt="QR"]');
  if (qrImg && promo?.qr_code_url) {
    const data = await loadImageDataUrl(promo.qr_code_url);
    if (data) qrImg.src = data;
  }
  clone.style.transform = 'none';
  clone.style.position = 'static';
  clone.style.boxShadow = 'none';
  clone.style.width = '210mm';
  clone.style.height = '297mm';

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.width = '210mm';
  holder.style.background = '#FFFFFF';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    const wPx = Math.round(210 * MM_TO_PX);
    const hPx = Math.round(297 * MM_TO_PX);
    return await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      width: wPx,
      height: hPx,
      windowWidth: wPx,
      windowHeight: hPx,
    });
  } finally {
    document.body.removeChild(holder);
  }
};

const buildDoc = async (sheetEl, promo) => {
  const canvas = await renderSheetToCanvas(sheetEl, promo);
  const img = canvas.toDataURL('image/jpeg', 0.95);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(img, 'JPEG', 0, 0, 210, 297);
  return doc;
};

export const downloadVoucherPDF = async (sheetEl, promo) => {
  const doc = await buildDoc(sheetEl, promo);
  doc.save(`Voucher-${promo.code || 'voucher'}.pdf`);
};

export const printVoucherPDF = async (sheetEl, promo) => {
  const doc = await buildDoc(sheetEl, promo);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};