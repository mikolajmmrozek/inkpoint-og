import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

// Formaty kodów obsługiwane przez przeglądarkowy BarcodeDetector.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code'];

// Czytnik kodów kreskowych przez kamerę. Po odczytaniu kodu zamyka się i
// przekazuje surową wartość do onDetected.
export default function BarcodeScanner({ t, onDetected, onClose }) {
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const stoppedRef = useRef(false);

  const stop = () => {
    stoppedRef.current = true;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tk) => tk.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    const run = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('Ta przeglądarka nie obsługuje czytnika kodów — wpisz SKU ręcznie.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Brak dostępu do kamery.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stoppedRef.current) { stream.getTracks().forEach((tk) => tk.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        let detector = null;
        try { detector = new window.BarcodeDetector({ formats: FORMATS }); } catch (_) { detector = new window.BarcodeDetector(); }
        setReady(true);
        const tick = async () => {
          if (stoppedRef.current || !streamRef.current) return;
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length > 0) {
              const raw = codes[0].rawValue;
              stop();
              onDetected(String(raw));
              return;
            }
          } catch (_) { /* pomijamy błędne klatki */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (_) {
        setError('Brak dostępu do kamery.');
      }
    };
    run();
    return () => stop();
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative" style={{ border: `0.5px solid ${t.border}`, overflow: 'hidden', borderRadius: 'var(--radius)' }}>
          <video ref={videoRef} playsInline muted style={{ width: '320px', maxWidth: '84vw', height: '240px', maxHeight: '50vh', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: '22% 12%', border: '2px solid var(--brand)', borderRadius: '4px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '16px', textAlign: 'center' }}>
          {error ? '' : ready ? 'Nakieruj kamerę na kod produktu' : <span className="flex items-center gap-2"><Loader2 size={11} className="animate-spin" /> URUCHAMIANIE KAMERY...</span>}
        </p>
        {error && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#ef4444', letterSpacing: '0.05em', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'center', maxWidth: '300px' }}>
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <button onClick={onClose} className="btn-ghost-parchment mt-4 flex items-center gap-2" style={{ fontSize: '9px', padding: '8px 20px' }}>
          <X size={11} /> ZAMKNIJ
        </button>
      </div>
    </div>
  );
}