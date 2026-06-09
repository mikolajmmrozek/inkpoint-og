import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Global cache: { "text__lang": "translated text" }
const globalCache = {};
// In-flight promise dedup
const inFlight = {};

export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'pl') return text;
  const key = `${text}__${targetLang}`;
  if (globalCache[key]) return globalCache[key];
  if (inFlight[key]) return inFlight[key];

  inFlight[key] = base44.integrations.Core.InvokeLLM({
    prompt: `Detect the language of the following text, then translate it to ${targetLang}. Return ONLY the translated text, no explanations, no quotes.\n\nText: ${text}`,
  }).then(result => {
    const translated = typeof result === 'string' ? result.trim() : text;
    globalCache[key] = translated;
    delete inFlight[key];
    return translated;
  }).catch(() => {
    delete inFlight[key];
    return text;
  });

  return inFlight[key];
}

// React hook for a single translated string
export function useTranslatedText(text, targetLang) {
  const [translated, setTranslated] = useState(text);
  const prevRef = useRef({ text, targetLang });

  useEffect(() => {
    if (!text) { setTranslated(text); return; }
    if (targetLang === 'pl') { setTranslated(text); return; }

    const key = `${text}__${targetLang}`;
    if (globalCache[key]) {
      setTranslated(globalCache[key]);
      return;
    }

    setTranslated(text); // show original while loading
    translateText(text, targetLang).then(result => {
      setTranslated(result);
    });
  }, [text, targetLang]);

  return translated;
}