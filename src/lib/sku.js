// Numeryczne SKU produktu — ten sam numer jest kodem kreskowym.
// Unikalne w czasie: kolejne wywołania w tej samej milisekundzie dostają kolejny numer.
let lastIssued = 0;

export const newSku = () => {
  const now = Date.now();
  lastIssued = now > lastIssued ? now : lastIssued + 1;
  return String(lastIssued);
};

// Porównywanie zeskanowanego kodu z SKU — bez spacji i znaków spoza cyfr.
export const normalizeSku = (raw) => String(raw || '').trim().replace(/\s/g, '');