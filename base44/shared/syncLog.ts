// Wspólny log techniczny z identyfikatorem korelacji — używany przez funkcje
// synchronizacji Google Calendar i audytu rezerwacji.
// Jedna linia JSON na krok: corr (identyfikator korelacji wywołania),
// ms (czas od początku wywołania), step i dane kroku.
// Bez danych osobowych — wyłącznie identyfikatory rekordów i statusy HTTP.

export function makeSyncLogger(tag: string, base: Record<string, any> = {}) {
  const corr: string = crypto.randomUUID().slice(0, 8);
  const t0: number = Date.now();
  const log = (step: string, extra: Record<string, any> = {}) => {
    try {
      console.log(`${tag} ${JSON.stringify({ corr, ms: Date.now() - t0, step, ...base, ...extra })}`);
    } catch (_) { /* logowanie nie może przerwać synchronizacji */ }
  };
  return { corr, log };
}