import { base44 } from '@/api/base44Client';

// Dyskretny tracker diagnostyczny (bez encji, bez UI).
// Buforuje NAZWANE akcje i przejścia między stronami, a przy nieobsłużonym błędzie,
// pełnym przeładowaniu strony albo powrocie do pulpitu panelu wysyła zredagowany
// opis do logów funkcji reportClientError.
// Nie zbiera treści formularzy, wiadomości, query stringów ani danych osobowych.

const MAX_ACTIONS = 20;
const MAX_ERRORS_PER_SESSION = 5;
const MIN_ERROR_INTERVAL_MS = 10000;
const MAX_MSG = 300;
const MAX_STACK = 1200;
const MAX_TRAIL = 8;
const MAX_NAV_EVENTS = 5;
const STORE_KEY = 'diag_session';

let sessionId = null;
let actions = [];
let errorsSent = 0;
let lastErrorAt = 0;
let lastMessage = '';
let initialized = false;
let previousPath = '';
let trail = [];
let navEventsSent = 0;

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

// Stan sesji przetrwa przeładowanie strony — dzięki temu wiemy, że strona
// została wczytana ponownie, i z jakiej ścieżki na jaką.
const readStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return null;
  }
};

const writeStore = () => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ session_id: sessionId, path: cleanPath(), trail: trail.slice(-MAX_TRAIL) }));
  } catch {}
};

// Typ wejścia na stronę: reload / navigate / back_forward — odróżnia odświeżenie od zwykłego wejścia.
const navigationType = () => {
  try {
    const entry = performance.getEntriesByType('navigation')[0];
    return entry?.type || 'unknown';
  } catch {
    return 'unknown';
  }
};

const newSessionId = () => {
  try {
    return crypto.randomUUID() || ('sid-' + Date.now().toString(36));
  } catch {
    return 'sid-' + Date.now().toString(36);
  }
};

function send(kind, message, extra = {}) {
  if (!initialized) return;
  const msg = redact(String(message || '')).slice(0, MAX_MSG);
  if (!msg) return;
  base44.functions.invoke('reportClientError', {
    session_id: sessionId,
    kind,
    message: msg,
    stack: redact(String(extra.stack || '')).slice(0, MAX_STACK),
    path: cleanPath(),
    previous_path: previousPath,
    nav_type: extra.nav_type || '',
    trail: trail.slice(),
    actions: actions.slice(),
  }).catch(() => {});
}

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
  send(kind, msg, { stack });
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

function recordTransition(from, to) {
  if (!to || to === from) return;
  trail.push({ from, to, time: new Date().toISOString() });
  if (trail.length > MAX_TRAIL) trail = trail.slice(-MAX_TRAIL);
  writeStore();
  // Powrót do pulpitu panelu — dokładnie ten objaw, który zgłasza studio.
  if (to === '/dashboard' && from !== '/dashboard' && navEventsSent < MAX_NAV_EVENTS) {
    navEventsSent += 1;
    send('nav', `Powrót do pulpitu panelu: ${from} → ${to}`);
  }
}

function installNavTracking() {
  try {
    const wrap = (method) => {
      const original = history[method];
      history[method] = function (...args) {
        const from = cleanPath();
        const result = original.apply(this, args);
        trackAction('nav');
        recordTransition(from, cleanPath());
        return result;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => {
      trackAction('nav');
      recordTransition(previousPath || '/', cleanPath());
    });
  } catch {}
}

export function initDiagnosticTracker() {
  if (initialized) return;
  initialized = true;

  const saved = readStore();
  sessionId = saved?.session_id || newSessionId();
  previousPath = saved?.path || '';
  trail = Array.isArray(saved?.trail) ? saved.trail.slice(-MAX_TRAIL) : [];

  installNavTracking();
  installGlobalHandlers();
  trackAction('app_load');
  writeStore();

  // Pełne wczytanie strony przy istniejącej sesji = przeładowanie (lub twarde wejście),
  // a nie zwykła zmiana zakładki w aplikacji.
  if (saved?.session_id && previousPath) {
    send('reload', `Przeładowanie strony: ${previousPath} → ${cleanPath()}`, { nav_type: navigationType() });
  }
}