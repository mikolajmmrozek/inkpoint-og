// Compact number formatting: 1000 → "1k", 1100 → "1,1k", 1500 → "1,5k", 10000 → "10k"
export function formatCompact(n) {
  if (n === null || n === undefined) return '0';
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (k < 10) {
    const s = k.toFixed(1).replace('.', ',');
    return s.endsWith(',0') ? s.slice(0, -2) + 'k' : s + 'k';
  }
  return Math.floor(k) + 'k';
}