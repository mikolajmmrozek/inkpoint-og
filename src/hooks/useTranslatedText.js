import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Global cache: { "text__lang": "translated text" }
const globalCache = {};
// In-flight promise dedup
const inFlight = {};

// ── localStorage persistence (survives page reloads → avoids repeated LLM calls) ──
const STORAGE_KEY = 'b44_translations_v1';

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') Object.assign(globalCache, parsed);
  }
} catch (_) {}

let saveTimer = null;
function persistCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const entries = Object.entries(globalCache);
      const toStore = entries.length > 500 ? Object.fromEntries(entries.slice(-500)) : globalCache;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (_) {}
  }, 1000);
}

const LANG_NAMES = {
  en: 'English', de: 'German', uk: 'Ukrainian', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian'
};

export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'pl') return text;
  const key = `${text}__${targetLang}`;
  if (globalCache[key]) return globalCache[key];
  if (inFlight[key]) return inFlight[key];

  const langName = LANG_NAMES[targetLang] || targetLang;

  inFlight[key] = base44.integrations.Core.InvokeLLM({
    prompt: `Translate the following text to ${langName}. Return ONLY the translated text, no explanations, no quotes.\n\nText: ${text}`,
  }).then(result => {
    const translated = typeof result === 'string' ? result.trim() : text;
    globalCache[key] = translated;
    persistCache();
    delete inFlight[key];
    return translated;
  }).catch(() => {
    delete inFlight[key];
    return text;
  });

  return inFlight[key];
}

// Pre-warm: translate all texts from a template at once (batched LLM call)
export async function prewarmTranslations(template, targetLang) {
  if (!template || !targetLang || targetLang === 'pl') return;

  // Collect all unique translatable texts from the template
  const texts = new Set();
  const addText = (t) => { if (t && typeof t === 'string' && t.trim()) texts.add(t.trim()); };

  Object.values(template.section_intros || {}).forEach(addText);
  (template.medical_fields || []).forEach(f => addText(f.label));
  (template.procedure_questions || []).forEach(q => addText(q.label));
  if (template.declaration_of_will) {
    addText(template.declaration_of_will.label);
    (template.declaration_of_will.content || '').split(/\n+/).filter(p => p.trim()).forEach(p => addText(p.trim()));
  }
  (template.declaration_fields || []).forEach(f => { addText(f.label); addText(f.placeholder); });
  (template.consent_fields || []).forEach(f => { addText(f.label); addText(f.description); });

  // Filter out already cached texts
  const toTranslate = [...texts].filter(t => !globalCache[`${t}__${targetLang}`]);
  if (toTranslate.length === 0) return;

  const langName = LANG_NAMES[targetLang] || targetLang;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following texts to ${langName}. 
Return a JSON object where each key is the original text (EXACTLY as provided) and value is the translation.
Do NOT change the keys. Translate only the values.
Texts:
${JSON.stringify(toTranslate)}`,
      response_json_schema: { type: 'object', additionalProperties: { type: 'string' } },
    });
    if (result && typeof result === 'object') {
      Object.entries(result).forEach(([original, translated]) => {
        if (translated && typeof translated === 'string') {
          globalCache[`${original}__${targetLang}`] = translated.trim();
        }
      });
      persistCache();
    }
  } catch (_) {
    // fallback: individual hooks will handle their own translation
  }
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