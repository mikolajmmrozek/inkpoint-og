import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const fmt = (s) => {
  if (s == null || !isFinite(s)) return '0:00';
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Zapasowa długość zapisana w treści wiadomości (znacznik [m:ss] z momentu nagrywania)
const parseDuration = (d) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(d || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// Player wiadomości głosowej w motywie aplikacji (magenta/biały).
// Nagrania żyją w prywatnym magazynie — bez publicznego adresu; player sam generuje
// świeży, podpisany link do odsłuchu (stare wiadomości z http nadal działają bez zmian).
// Nagrania webm z MediaRecorder często nie mają metadanych długości (duration = Infinity,
// stąd "0:00") — wtedy długość wyznaczamy skokiem na koniec strumienia, a zapasowo
// używamy długości zapisanej przy nagrywaniu.
export default function VoicePlayer({ src, t, fallbackDuration }) {
  const fallback = parseDuration(fallbackDuration);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const finishDuration = (d) => {
      if (isFinite(d) && d > 0) setDuration(d);
      setLoading(false);
    };
    const onLoaded = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        finishDuration(audio.duration);
        return;
      }
      // webm bez długości: skok na koniec wymusza odczyt duration przez przeglądarkę
      const onSeekTime = () => {
        audio.removeEventListener('timeupdate', onSeekTime);
        finishDuration(audio.duration);
        audio.currentTime = 0;
        setTime(0);
      };
      audio.addEventListener('timeupdate', onSeekTime);
      audio.currentTime = 1e7;
    };
    const onTime = () => setTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setTime(0); };
    const onError = () => { setLoading(false); setError(true); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    const attach = (url) => {
      if (cancelled) return;
      audio.src = url;
      audio.load();
    };
    const fail = () => {
      if (cancelled) return;
      setLoading(false);
      setError(true);
    };

    // Bezpiecznik: gdy dane nie nadejdą, odblokuj player (długość zapasowa)
    const safety = setTimeout(() => setLoading(false), 4000);

    if (/^https?:\/\//.test(src)) {
      attach(src);
    } else {
      // Nagranie z prywatnego magazynu — podpisany link tylko do odsłuchu
      base44.integrations.Core.CreateFileSignedUrl({ file_uri: src, expires_in: 3600 })
        .then((res) => (res?.signed_url ? attach(res.signed_url) : fail()))
        .catch(fail);
    }

    return () => {
      cancelled = true;
      clearTimeout(safety);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [src]);

  const total = duration ?? fallback;
  const pct = total ? Math.min(100, (time / total) * 100) : 0;
  const textColor = t?.text || '#F5F0EB';

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.play()
      .then(() => { setPlaying(true); setError(false); })
      .catch(() => setError(true));
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !total || error) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = p * total;
    setTime(p * total);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minWidth: '210px' }}>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={playing ? 'Pauza' : 'Odtwórz nagranie'}
        title={playing ? 'Pauza' : 'Odtwórz nagranie'}
        style={{
          width: '34px', height: '34px', flexShrink: 0, borderRadius: '50%',
          background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)',
          border: 'none', cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
      </button>
      <div onClick={seek} style={{ flex: 1, height: '24px', display: 'flex', alignItems: 'center', cursor: total && !error ? 'pointer' : 'default' }}>
        <div style={{ width: '100%', height: '3px', background: 'rgba(128,128,128,0.25)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)', borderRadius: '2px' }} />
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em', color: error ? '#ef4444' : textColor, flexShrink: 0 }}>
        {error ? 'Nagranie niedostępne' : `${fmt(time)} / ${total ? fmt(total) : '--:--'}`}
      </span>
    </div>
  );
}