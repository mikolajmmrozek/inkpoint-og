// Podpis zapisujemy w polu encji jako data URL — system odrzuca ciągi powyżej ~20 000 znaków.
// Te funkcje zmniejszają podpis (kadrują do samego "atramentu" i kompresują), aby zapis
// zawsze przechodził, oraz generują unikalny numer ankiety.

const MAX_CHARS = 18000; // bezpieczny margines poniżej limitu 20 000

export function generateFormNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AF-${date}-${rand}`;
}

// Zmniejsza data URL podpisu, aż zmieści się w limicie. Krótkie podpisy zwraca bez zmian.
export async function compressSignatureDataUrl(dataUrl, maxChars = MAX_CHARS) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image') || dataUrl.length <= maxChars) {
    return dataUrl;
  }

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d');
  sctx.drawImage(img, 0, 0);

  // Znajdź obszar podpisu: piksele różniące się od koloru tła (próbka z rogu)
  const data = sctx.getImageData(0, 0, w, h).data;
  const bg = [data[0], data[1], data[2]];
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (Math.abs(data[k] - bg[0]) > 12 || Math.abs(data[k + 1] - bg[1]) > 12 || Math.abs(data[k + 2] - bg[2]) > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    // Pusty obraz — zwróć minimalny obrazek w kolorze tła
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, 4, 4);
    return c.toDataURL('image/jpeg', 0.5);
  }

  const pad = 6;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + 1 + pad) - cx;
  const ch = Math.min(h, maxY + 1 + pad) - cy;

  let targetW = Math.min(cw, 420);
  let quality = 0.8;
  let out = dataUrl;
  for (let attempt = 0; attempt < 10 && out.length > maxChars; attempt++) {
    const scale = targetW / cw;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cw * scale));
    c.height = Math.max(1, Math.round(ch * scale));
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, cx, cy, cw, ch, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', quality);
    if (quality > 0.45) quality -= 0.15;
    else targetW = Math.max(60, Math.round(targetW * 0.6));
  }
  return out;
}

// Kopiuje obiekt formularza ze zmniejszonymi podpisami (client_signature, guardian_signature,
// także zagnieżdżony draft_guardian.guardian_signature), aby zapis encji zawsze przechodził.
export async function compactSignatures(data) {
  const out = { ...data };
  const compact = (value) => compressSignatureDataUrl(value);
  if (out.client_signature) out.client_signature = await compact(out.client_signature);
  if (out.guardian_signature) out.guardian_signature = await compact(out.guardian_signature);
  if (out.draft_guardian?.guardian_signature) {
    out.draft_guardian = { ...out.draft_guardian, guardian_signature: await compact(out.draft_guardian.guardian_signature) };
  }
  return out;
}