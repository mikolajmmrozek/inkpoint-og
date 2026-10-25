// Wspólne reguły zapisu pamięci Gatekeeperów (admin + artysta).

export const CATEGORIES = ['style', 'preference'];
export const KEY_RE = /^[a-z0-9_]{3,40}$/;
export const MAX_CONTENT = 600;

export const sanitize = (str: any) => typeof str === 'string' ? str.trim() : '';

// Pamięć Gatekeepera może zawierać wyłącznie preferencje i styl pracy —
// blokujemy wzorce danych klientów (e-mail, długie ciągi cyfr: telefon/PESEL)
export function contentHasClientData(content: string) {
  if (content.includes('@')) return true;
  if (/\d{7,}/.test(content)) return true;
  return false;
}