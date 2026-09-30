import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { base44 } from '@/api/base44Client';
import { ScanLine, X, Check, Loader2, AlertCircle } from 'lucide-react';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
};

// Extract code from a scanned QR value — supports the current home-page format
// (?voucher=CODE / ?v=CODE / #voucher=CODE), the legacy /voucher/CODE path, or a bare code.
const extractCode = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  // legacy format: /voucher/CODE
  const m = s.match(/\/voucher\/([^/?#]+)/);
  if (m) return m[1];
  // current format: ?voucher=CODE, ?v=CODE, #voucher=CODE (or &voucher=CODE in a longer query)
  const qm = s.match(/[?&#](?:voucher|v)=([^&#]+)/);
  if (qm) return qm[1];
  // bare code: take last path-like token or whole string
  const parts = s.split(/[\/\s]/);
  return (parts[parts.length - 1] || s).toUpperCase();
};

export default function VoucherPicker({ t, onApplied, applied }) {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [cameraUnsupported, setCameraUnsupported] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectRef = useRef(null);
  const [scanHint, setScanHint] = useState('');

  const stopCamera = () => {
    if (detectRef.current) { cancelAnimationFrame(detectRef.current); detectRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(tk => tk.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
    setScanHint('');
  };

  useEffect(() => () => stopCamera(), []);

  const lookupAndApply = async (rawCode) => {
    const c = extractCode(rawCode);
    if (!c) { setError('Podaj kod'); return; }
    setError(''); setChecking(true);
    try {
      const res = await base44.functions.invoke('managePromotion', { action: 'lookup', code: c });
      const data = res.data || {};
      onApplied({ ...data.voucher, _appliedAmount: data.appliedAmount, _isGrace: data.isGrace });
      setCode('');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Błąd';
      setError(msg === 'Voucher nie istnieje' ? `Nie znaleziono vouchera: ${c}` : msg);
    } finally {
      setChecking(false);
    }
  };

  const startScan = async () => {
    setError('');
    setCameraUnsupported(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraUnsupported(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const hasNative = 'BarcodeDetector' in window;
        let detector = null;
        if (hasNative) {
          try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (_) { detector = null; }
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true }) || null;
        const tick = async () => {
          if (!streamRef.current) return;
          try {
            let raw = null;
            if (detector) {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0) raw = codes[0].rawValue;
            } else if (ctx && canvas) {
              const w = video.videoWidth, h = video.videoHeight;
              if (w && h) {
                canvas.width = w; canvas.height = h;
                ctx.drawImage(video, 0, 0, w, h);
                const img = ctx.getImageData(0, 0, w, h);
                const res = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
                if (res && res.data) raw = res.data;
              }
            }
            if (raw) {
              stopCamera();
              await lookupAndApply(raw);
              return;
            }
          } catch (_) { /* ignore frame errors */ }
          detectRef.current = requestAnimationFrame(tick);
        };
        if (!detector && !ctx) setScanHint('Inicjalizacja dekodera...');
        tick();
      });
    } catch (e) {
      setError('Brak dostępu do kamery');
      setCameraUnsupported(true);
      setScanning(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); lookupAndApply(code); }
  };

  if (applied) {
    const amt = applied._appliedAmount || applied.value || 0;
    return (
      <div className="flex items-center gap-3 p-2" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.05)' }}>
        <Check size={14} color="#16a34a" />
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.12em', color: t.title, fontWeight: 600 }}>{applied.code}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em' }}>
            {amt} PLN{applied._isGrace ? ' · ostatnia szansa' : ''}{applied.balance !== undefined && applied.balance !== applied.value ? ` · saldo ${applied.balance}` : ''}
          </p>
        </div>
        <button onClick={() => onApplied(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }} title="Usuń voucher"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={onKey}
          placeholder="KOD VOUCHERA"
          style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }}
          onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
          onBlur={e => e.target.style.borderBottomColor = t.border}
        />
        <button onClick={() => lookupAndApply(code)} disabled={checking} style={{ background: 'none', border: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {checking ? <Loader2 size={13} className="animate-spin" /> : 'OK'}
        </button>
        <button onClick={startScan} title="Skanuj QR" style={{ background: 'none', border: `0.5px solid ${t.border}`, cursor: 'pointer', color: 'var(--brand)', padding: '8px', display: 'inline-flex', alignItems: 'center' }}>
          <ScanLine size={15} />
        </button>
      </div>

      {scanning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="relative" style={{ border: `0.5px solid ${t.border}`, overflow: 'hidden' }}>
              <video ref={videoRef} playsInline muted style={{ width: '300px', maxWidth: '80vw', height: '300px', maxHeight: '60vh', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: '20%', border: '2px solid var(--brand)', borderRadius: '4px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '16px' }}>{scanHint || 'Nakieruj kamerę na kod QR'}</p>
            <button onClick={stopCamera} className="btn-ghost-parchment mt-3" style={{ fontSize: '9px', padding: '8px 20px' }}>ANULUJ</button>
          </div>
        </div>
      )}

      {cameraUnsupported && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={11} /> Skaner niedostępny — wpisz kod ręcznie.
        </p>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#ef4444', letterSpacing: '0.05em', marginTop: '6px' }}>{error}</p>
      )}
    </div>
  );
}