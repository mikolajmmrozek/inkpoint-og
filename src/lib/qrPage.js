// Opens a new browser tab showing a full-screen black page with the studio name
// and a QR code encoding the given URL. The client scans it with their phone
// to jump straight to the health form.
export function openHealthFormQRPage(url, studioName = 'ROMANS TATTOO') {
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(url)}`;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QR — ${studioName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    height: 100%;
    background: #0A0A0A;
    color: #F5F0EB;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
  }
  .brand {
    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    font-size: 38px;
    letter-spacing: 0.14em;
    color: var(--brand, #FF007F);
    margin-bottom: 4px;
  }
  .brand .dot { color: #F5F0EB; }
  .subtitle {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(245,240,235,0.5);
    margin-bottom: 28px;
  }
  .qr-wrap {
    background: #F5F0EB;
    padding: 16px;
    border-radius: 4px;
    box-shadow: 0 0 60px rgba(255,0,127,0.25);
  }
  .qr-wrap img { display: block; width: 320px; height: 320px; }
  .hint {
    margin-top: 24px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(245,240,235,0.55);
  }
  .link {
    margin-top: 14px;
    font-size: 9px;
    color: rgba(245,240,235,0.35);
    word-break: break-all;
    max-width: 420px;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="brand">ROMANS<span class="dot">.</span> TATTOO</div>
  <div class="subtitle">Skanuj, aby wypełnić ankietę</div>
  <div class="qr-wrap">
    <img src="${qrImg}" alt="QR kod ankiety" />
  </div>
  <p class="hint">Nakieruj aparat telefonu na kod</p>
  <p class="link">${url}</p>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}