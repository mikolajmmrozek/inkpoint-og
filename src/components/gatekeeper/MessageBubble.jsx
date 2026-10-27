import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import Lightbox from '@/components/ui/Lightbox';
import FilePreviewModal from '@/components/panel/FilePreviewModal';
import VoicePlayer from './VoicePlayer';

const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg|bmp)(\?[^)\s]*)?$/i;
const PDF_URL_RE = /\.pdf(\?[^)\s]*)?$/i;
const AUTOLINK_RE = /(^|[\s>])(https?:\/\/[^\s<>()\[\]]+)/g;
// Dopasowuje zarówno stare publiczne adresy (http…), jak i nowe prywatne identyfikatory plików
const VOICE_RE = /^\[Wiadomość głosowa\]\(([^\s)]+)\)(?: \[(\d{1,2}:\d{2})\])?([\s\S]*)$/;

// Gołe adresy URL w treści zamieniamy na linki markdown
// (adresy już osadzone w [nazwa](adres) nie są poprzedzone spacją — nie zostaną podwójnie opakowane).
const autolinkUrls = (text) => String(text).replace(AUTOLINK_RE, (m, pre, url) => `${pre}[${url}](${url})`);

// Zdjęcie osadzone w odpowiedzi asystenta — prywatne identyfikatory plików
// (z prywatnego magazynu) rozwiązujemy do podpisanego adresu przed wyświetleniem.
function PrivateImage({ src, style, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (/^https?:\/\//.test(src)) { setUrl(src); return; }
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: src, expires_in: 3600 })
      .then((res) => { if (!cancelled && res?.signed_url) setUrl(res.signed_url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src]);
  if (!url) return null;
  return <img src={url} alt="" style={style} onClick={() => onClick?.(url)} />;
}

function markdownComponents(t, openImage, openPdf) {
  const imgStyle = {
    maxWidth: '100%',
    maxHeight: '260px',
    objectFit: 'contain',
    borderRadius: 'var(--radius)',
    border: `0.5px solid ${t.border}`,
    display: 'block',
    marginTop: '6px',
  };
  return {
    a: ({ href, children }) => {
      if (IMAGE_URL_RE.test(href)) {
        return <PrivateImage src={href} style={{ ...imgStyle, cursor: 'zoom-in' }} onClick={openImage} />;
      }
      if (PDF_URL_RE.test(href)) {
        return <a href={href} onClick={e => { e.preventDefault(); openPdf(href); }} style={{ color: 'var(--brand)', cursor: 'pointer' }}>{children}</a>;
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>{children}</a>;
    },
    img: ({ src, alt }) => <PrivateImage src={src} style={{ ...imgStyle, cursor: 'zoom-in' }} onClick={openImage} />,
  };
}

// Surowe dane narzędzi (argumenty, wyniki, JSON) NIGDY nie są tu renderowane —
// status całej tury pokazuje jeden dymek TurnStatusBubble w ChatThread.
export default function MessageBubble({ message, t }) {
  const isUser = message.role === 'user';
  const [lightbox, setLightbox] = useState({ images: [], index: 0 });
  const [pdfPreview, setPdfPreview] = useState(null);

  // Wszystkie adresy zdjęć w treści wiadomości — galerii podglądu (strzałki, miniaturki)
  const messageImages = (() => {
    const text = String(message.content || '');
    const urls = new Set();
    for (const m of text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)) urls.add(m[1]);
    for (const m of text.matchAll(/https?:\/\/[^\s<>()\[\]]+/g)) {
      const u = m[0].replace(/[.,;!?]+$/, '');
      if (IMAGE_URL_RE.test(u)) urls.add(u);
    }
    return [...urls];
  })();

  // src może być podpisanym adresem (zdjęcie z prywatnego magazynu) — wtedy galeria to jedno zdjęcie
  const openImage = (src) => {
    const idx = messageImages.indexOf(src);
    setLightbox(idx >= 0 ? { images: messageImages, index: idx } : { images: [src], index: 0 });
  };
  const openPdf = (url) => setPdfPreview({
    url,
    type: 'pdf',
    name: (decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Dokument PDF'),
  });

  if (!String(message.content || '').trim()) return null;

  // Wiadomość głosowa (jak na WhatsApp): bąbelek z odtwarzaczem zamiast tekstu.
  // Transkrypcja zostaje w treści wiadomości — czyta ją Gatekeeper, nie użytkownik.
  const voice = isUser ? VOICE_RE.exec(String(message.content).trim()) : null;
  if (voice) {
    return (
      <div className="flex gap-2 mb-3" style={{ justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: '82%' }}>
          <div className="px-3 py-2" style={{ background: 'rgb(var(--brand-rgb) / 0.12)', border: '0.5px solid rgb(var(--brand-rgb) / 0.3)', borderRadius: 'var(--radius)' }}>
            <VoicePlayer src={voice[1]} t={t} fallbackDuration={voice[2] || null} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-3" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <span style={{ width: '26px', height: '26px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}><Bot size={15} /></span>
      )}
      <div style={{ maxWidth: '82%' }}>
        <div
          className="px-3 py-2"
          style={{
            background: isUser ? 'rgb(var(--brand-rgb) / 0.12)' : 'rgba(128,128,128,0.06)',
            border: `0.5px solid ${isUser ? 'rgb(var(--brand-rgb) / 0.3)' : t.border}`,
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            lineHeight: 1.55,
            color: t.text,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {isUser ? message.content : <ReactMarkdown components={markdownComponents(t, openImage, openPdf)}>{autolinkUrls(message.content)}</ReactMarkdown>}
        </div>
      </div>
      {lightbox.images.length > 0 && (
        <div style={{ position: 'relative', zIndex: 90 }}>
          <Lightbox
            images={lightbox.images}
            currentIndex={lightbox.index}
            onClose={() => setLightbox({ images: [], index: 0 })}
            onNext={(i) => setLightbox(lb => ({ images: lb.images, index: typeof i === 'number' ? i : (lb.index + 1) % lb.images.length }))}
            onPrev={() => setLightbox(lb => ({ images: lb.images, index: (lb.index - 1 + lb.images.length) % lb.images.length }))}
          />
        </div>
      )}
      <FilePreviewModal attachment={pdfPreview} onClose={() => setPdfPreview(null)} />
    </div>
  );
}