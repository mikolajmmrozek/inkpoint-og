import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Pause, Play, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Sprawdzenie stanu uprawnienia mikrofonu (granted / denied / prompt; null = brak API)
const micPermission = async () => {
  try {
    const p = await navigator.permissions?.query({ name: 'microphone' });
    return p?.state || null;
  } catch { return null; }
};

// Wiadomość głosowa jak na WhatsApp: nagraj → kończysz → analiza (rozpoznanie mowy)
// odbywa się automatycznie i nagranie z transkrypcją leci prosto do rozmowy —
// bez wklejania tekstu i ręcznego wysyłania. Transkrypcję czyta Gatekeeper,
// a w czacie widać bąbelek z odtwarzaczem.
// Uprawnienie mikrofonu sprawdzamy PRZED nagrywaniem; problemy pokazuje
// lokalny pasek podpowiedzi z przyciskiem ponownej próby (nie blokuje czatu).
export default function VoiceRecorder({ t, disabled, onStateChange, onVoice }) {
  const [state, setState] = useState('idle'); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(null);
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

  // Po zakończeniu nagrania: upload + automatyczne rozpoznanie mowy + wysyłka
  const handleStop = async () => {
    const cancelled = cancelledRef.current;
    cleanup();
    setSeconds(0);
    if (cancelled) return setPhase('idle');
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!chunks.length) {
      setHint('Nie udało się nagrać dźwięku. Spróbuj ponownie.');
      return setPhase('idle');
    }
    const type = chunks[0].type || 'audio/webm';
    const blob = new Blob(chunks, { type });
    try {
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: new File([blob], `wiadomosc-glosowa.${ext}`, { type }) });
      const res = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
      const transcript = String(typeof res === 'string' ? res : (res?.transcript || res?.text || '')).trim();
      if (!transcript) {
        setHint('Nie rozpoznano mowy w nagraniu. Spróbuj ponownie.');
        return setPhase('idle');
      }
      onVoice?.({ url: file_url, transcript });
    } catch {
      setHint('Nie udało się przetworzyć nagrania. Spróbuj ponownie.');
    }
    setPhase('idle');
  };

  const start = async () => {
    if (disabled || state !== 'idle') return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return setHint('Ta przeglądarka nie obsługuje nagrań głosowych. Użyj Chrome, Safari lub aktualnej przeglądarki mobilnej.');
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return setHint('Mikrofon działa tylko na stronie otwartej po HTTPS (np. w opublikowanej aplikacji, nie w podglądzie edytora).');
    }
    setHint(null);
    const perm = await micPermission();
    if (perm === 'denied') {
      return setHint('Mikrofon jest zablokowany dla tej strony. Kliknij ikonę zamka / ustawień obok adresu, zezwól na mikrofon, odśwież stronę i spróbuj ponownie.');
    }
    try {
      // Zwykłe audio bez filtrów DSP (echo/noise/AGC) — te filtry nieustannie
      // obciążały procesor i muliły podgląd nagrania, a do wiadomości głosowej nie są potrzebne
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Weryfikacja: mikrofon musi zwracać aktywną ścieżkę audio, inaczej nagranie byłoby puste
      const track = stream.getAudioTracks?.()[0];
      if (!track || track.readyState !== 'live' || track.enabled === false) {
        cleanup();
        return setHint('Mikrofon nie odpowiada (brak aktywnej ścieżki audio). Sprawdź, czy nie jest zajęty przez inną aplikację, i spróbuj ponownie.');
      }
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported?.(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = handleStop;
      rec.start(500);
      recRef.current = rec;
      setSeconds(0);
      setPaused(false);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setPhase('recording');
    } catch (e) {
      cleanup();
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError' || e?.name === 'PermissionDeniedError') {
        setHint('Nie udzielono dostępu do mikrofonu. Zezwól na mikrofon w pytaniu przeglądarki (lub w ustawieniach strony) i spróbuj ponownie.');
      } else if (e?.name === 'NotReadableError' || e?.name === 'TrackStartError' || e?.name === 'AbortError') {
        setHint('Mikrofon jest zajęty przez inną aplikację albo nie działa. Zamknij inne programy używające mikrofonu i spróbuj ponownie.');
      } else {
        setHint('Nie udało się uruchomić mikrofonu. Spróbuj ponownie.');
      }
    }
  };

  const stop = () => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') return;
    clearInterval(timerRef.current);
    setPhase('processing');
    try { rec.stop(); } catch { cleanup(); setPhase('idle'); }
  };

  // Pauza jak na WhatsApp: wstrzymuje i wznawia nagrywanie (timer też stoi)
  const togglePause = () => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      if (rec.state === 'paused') {
        rec.resume();
        setPaused(false);
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      } else if (rec.state === 'recording') {
        rec.pause();
        clearInterval(timerRef.current);
        setPaused(true);
      }
    } catch { /* przeglądarka bez wsparcia pauzy — nagrywanie trwa dalej */ }
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

  // Problem z mikrofonem: pasek podpowiedzi z ponowną próbą (nie blokuje reszty czatu)
  if (state === 'idle' && hint) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', border: '0.5px solid #ef444455', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius)' }}>
        <MicOff size={13} color="#ef4444" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: t.text, flex: 1, lineHeight: 1.4 }}>{hint}</span>
        <button onClick={() => { setHint(null); start(); }} title="Spróbuj ponownie" aria-label="Spróbuj ponownie" style={{ background: 'transparent', color: 'var(--brand)', border: '0.5px solid var(--brand)', borderRadius: 'var(--radius)', padding: '6px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <RotateCcw size={12} />
        </button>
      </div>
    );
  }

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
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, opacity: paused ? 0.35 : 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text, flexShrink: 0 }}>{fmt(seconds)}</span>
          <span style={{ fontSize: '11px', color: t.muted, flex: 1 }}>{paused ? 'Pauza' : 'Rejestruję...'}</span>
          <button onClick={cancel} title="Usuń nagranie" aria-label="Usuń nagranie" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
            <Trash2 size={14} />
          </button>
          <button onClick={togglePause} title={paused ? 'Wznów' : 'Pauza'} aria-label={paused ? 'Wznów nagrywanie' : 'Wstrzymaj nagrywanie'} style={{ background: 'transparent', color: t.text, border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button onClick={stop} title="Wyślij" aria-label="Wyślij nagranie" style={{ background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', border: 'none', borderRadius: '50%', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={12} />
          </button>
        </>
      ) : (
        <>
          <Loader2 size={13} className="animate-spin" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: t.muted, flex: 1 }}>Analizuję nagranie...</span>
        </>
      )}
    </div>
  );
}