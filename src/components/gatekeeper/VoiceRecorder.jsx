import { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Wiadomość głosowa: nagrywanie → prywatny magazyn → rozpoznanie mowy (Whisper)
// → transkrypcja trafia do pola czatu, można ją doprecyzować przed wysłaniem.
export default function VoiceRecorder({ t, disabled, onStateChange, onTranscript, onError }) {
  const [state, setState] = useState('idle'); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const setPhase = (phase) => { setState(phase); onStateChange?.(phase); };

  const cleanup = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    recRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const handleStop = async () => {
    const cancelled = cancelledRef.current;
    cleanup();
    setSeconds(0);
    if (cancelled) return setPhase('idle');
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!chunks.length) {
      onError?.('Nie udało się nagrać dźwięku. Spróbuj ponownie.');
      return setPhase('idle');
    }
    const type = chunks[0].type || 'audio/webm';
    const blob = new Blob(chunks, { type });
    try {
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], `wiadomosc-glosowa.${ext}`, { type }) });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      const res = await base44.integrations.Core.TranscribeAudio({ audio_url: signed_url });
      const text = String(typeof res === 'string' ? res : (res?.transcript || res?.text || '')).trim();
      if (!text) {
        onError?.('Nie rozpoznano mowy w nagraniu. Spróbuj ponownie.');
        return setPhase('idle');
      }
      onTranscript?.(text);
    } catch {
      onError?.('Nie udało się przetworzyć nagrania. Spróbuj ponownie.');
    }
    setPhase('idle');
  };

  const start = async () => {
    if (disabled || state !== 'idle') return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError?.('Ta przeglądarka nie obsługuje nagrań głosowych.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported?.(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = handleStop;
      rec.start(250);
      recRef.current = rec;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setPhase('recording');
    } catch {
      cleanup();
      onError?.('Brak dostępu do mikrofonu.');
    }
  };

  const stop = () => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') return;
    clearInterval(timerRef.current);
    setPhase('processing');
    try { rec.stop(); } catch { cleanup(); setPhase('idle'); }
  };

  const cancel = () => {
    cancelledRef.current = true;
    clearInterval(timerRef.current);
    const rec = recRef.current;
    try {
      if (rec && rec.state !== 'inactive') rec.stop();
      else cleanup();
    } catch { cleanup(); }
    setSeconds(0);
    setPhase('idle');
  };

  if (state === 'idle') {
    return (
      <button
        onClick={start}
        disabled={disabled}
        title="Wiadomość głosowa"
        aria-label="Nagraj wiadomość głosową"
        style={{ width: '40px', height: '40px', flexShrink: 0, background: 'transparent', color: disabled ? 'var(--brand)' : t.muted, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
      >
        <Mic size={15} />
      </button>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', border: '0.5px solid var(--brand)', background: 'rgb(var(--brand-rgb) / 0.08)', borderRadius: 'var(--radius)' }}>
      {state === 'recording' ? (
        <>
          <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text, flexShrink: 0 }}>{fmt(seconds)}</span>
          <span style={{ fontSize: '11px', color: t.muted, flex: 1 }}>Rejestruję...</span>
          <button onClick={stop} title="Zakończ i rozpoznaj" aria-label="Zakończ nagranie" style={{ background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', border: 'none', borderRadius: 'var(--radius)', padding: '6px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
            <Square size={11} />
          </button>
          <button onClick={cancel} title="Anuluj nagranie" aria-label="Anuluj nagranie" style={{ background: 'transparent', color: t.muted, border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <Loader2 size={13} className="animate-spin" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: t.muted, flex: 1 }}>Rozpoznaję mowę...</span>
        </>
      )}
    </div>
  );
}