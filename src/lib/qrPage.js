// Opens a new browser tab showing a full-screen black page with the studio logo
// and a QR code encoding the given URL. Matches the site's typography & branding.
export function openHealthFormQRPage(url, studioName = 'ROMANS TATTOO') {
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(url)}`;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QR — ${studioName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    min-height: 100%;
    background: #0A0A0A;
    color: #F5F0EB;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
    background-image:
      radial-gradient(ellipse 55% 45% at -5% 0%, rgba(255,0,127,0.45) 0%, rgba(255,0,127,0.12) 40%, transparent 70%),
      radial-gradient(ellipse 45% 40% at 105% 100%, rgba(255,0,127,0.4) 0%, rgba(255,0,127,0.10) 40%, transparent 65%);
    background-attachment: fixed;
  }
  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    margin-bottom: 8px;
  }
  .logo .name {
    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    font-size: 44px;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: #F5F0EB;
  }
  .logo .tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.2em;
    color: #FF007F;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .subtitle {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(245,240,235,0.5);
    margin: 28px 0;
  }
  .qr-wrap {
    background: #F5F0EB;
    padding: 18px;
    border-radius: var(--radius, 2px);
    box-shadow: 0 0 80px rgba(255,0,127,0.28);
  }
  .qr-wrap img { display: block; width: 320px; height: 320px; }
  .hint {
    margin-top: 28px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(245,240,235,0.6);
  }
  .link {
    margin-top: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: rgba(245,240,235,0.32);
    word-break: break-all;
    max-width: 440px;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <div class="logo">
    <span class="name">ROMANS</span>
    <span class="tag">TATTOO</span>
  </div>
  <p class="subtitle">Skanuj, aby wypełnić ankietę</p>
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