import { base44 } from '@/api/base44Client';

// Dyskretny tracker diagnostyczny (bez encji, bez UI).
// Buforuje NAZWANE akcje ze ścieżką i czasem, a przy nieobsłużonym błędzie
// wysyła zredagowany opis + ostatnie akcje do logów funkcji reportClientError.
// Nie zbiera treści formularzy, wiadomości, query stringów ani danych osobowych.

const MAX_ACTIONS = 20;
const MAX_ERRORS_PER_SESSION = 5;
const MIN_ERROR_INTERVAL_MS = 10000;
const MAX_MSG = 300;
const MAX_STACK = 1200;

let sessionId = null;
let actions = [];
let errorsSent = 0;
let lastErrorAt = 0;
let lastMessage = '';
let initialized = false;

const cleanPath = () => {
  try {
    return String(window.location.pathname || '/').slice(0, 200);
  } catch {
    return '/';
  }
};

const redact = (text) =>
  String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[number]')
    .replace(/(token|password|secret|key)[^\s&]*/gi, '[redacted]');

// Zapamiętaj nazwaną akcję (nazwa + ścieżka + czas) — bez wartości wpisywanych przez użytkownika
export function trackAction(name) {
  if (!initialized || typeof name !== 'string') return;
  try {
    actions.push({
      name: name.slice(0, 60),
      path: cleanPath(),
      time: new Date().toISOString(),
    });
    if (actions.length > MAX_ACTIONS) actions = actions.slice(-MAX_ACTIONS);
  } catch {}
}

function reportError(kind, message, stack) {
  if (!initialized) return;
  const msg = redact(String(message || '')).slice(0, MAX_MSG);
  if (!msg) return;
  const now = Date.now();
  if (errorsSent >= MAX_ERRORS_PER_SESSION) return;
  if (now - lastErrorAt < MIN_ERROR_INTERVAL_MS && msg === lastMessage) return;
  errorsSent += 1;
  lastErrorAt = now;
  lastMessage = msg;
  const payload = {
    session_id: sessionId,
    kind,
    message: msg,
    stack: redact(String(stack || '')).slice(0, MAX_STACK),
    actions: actions.slice(),
  };
  // Zapis asynchroniczny, cichy — błąd logowania nie może obciążyć aplikacji
  base44.functions.invoke('reportClientError', payload).catch(() => {});
}

function installGlobalHandlers() {
  window.addEventListener('error', (e) => {
    reportError('error', e.message || 'Script error', e.error?.stack || '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection');
    const stack = reason instanceof Error ? reason.stack : '';
    reportError('promise', message, stack);
  });
}

function installNavTracking() {
  try {
    const wrap = (method) => {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        trackAction('nav');
        return result;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => trackAction('nav'));
  } catch {}
}

export function initDiagnosticTracker() {
  if (initialized) return;
  initialized = true;
  try {
    sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
      ('sid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  } catch {
    sessionId = 'sid-' + Date.now().toString(36);
  }
  installNavTracking();
  installGlobalHandlers();
  trackAction('app_load');
}