// Prywatny endpoint diagnostyczny (PRD: Dyskretny tracker aktywności i błędów).
// Przyjmuje anonimowe, zredagowane raporty błędów z przeglądarki (w tym niezalogowanych
// klientów) i zapisuje je do logów funkcji — bez encji i bez dashboardu.
// Zapisuje WYŁĄCZNIE: losowy ID sesji, typ błędu, zredagowany komunikat i stack,
// ścieżkę (bez query string), ostatnie nazwane akcje i User-Agent.
// Brak zapisu nie wpływa na działanie aplikacji.

const MAX_SESSION_ERRORS = 10; // limity per instancja
const MAX_ACTIONS = 20;

let rateMap = null;

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

const redact = (s) =>
  String(s || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[number]')
    .replace(/(token|password|secret|key)[^\s&]*/gi, '[redacted]');

const cleanPath = (p) => str(p, 200).replace(/[?#].*$/, '');

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));

    const sessionId = str(body.session_id, 64).trim();
    if (sessionId.length < 8) return Response.json({ error: 'Bad request' }, { status: 400 });
    const kind = body.kind === 'promise' ? 'promise' : 'error';

    // Limit częstotliwości per sesja (1 h, pamięć instancji)
    rateMap = rateMap || new Map();
    const now = Date.now();
    const entry = rateMap.get(sessionId);
    if (entry && now - entry.ts < 3600000) {
      if (entry.count >= MAX_SESSION_ERRORS) return Response.json({ ok: true, skipped: 'rate_limit' });
      entry.count += 1;
    } else {
      rateMap.set(sessionId, { ts: now, count: 1 });
    }
    if (rateMap.size > 5000) rateMap.clear();

    const actions = Array.isArray(body.actions)
      ? body.actions
          .slice(-MAX_ACTIONS)
          .map((a) =>
            a && typeof a === 'object'
              ? { name: str(a.name, 60), path: cleanPath(a.path), time: str(a.time, 30) }
              : null
          )
          .filter(Boolean)
      : [];

    const record = {
      session_id: sessionId,
      kind,
      message: redact(str(body.message, 300)),
      stack: redact(str(body.stack, 1200)),
      path: cleanPath(body.path),
      actions,
      ua: str(req.headers.get('user-agent') || '', 200),
    };

    // Jednolinijkowy, filtrowalny wpis w logach funkcji
    console.log('[CLIENT_ERROR] ' + JSON.stringify(record));

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}