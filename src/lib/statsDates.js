export const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
export const MONTHS_FULL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

// Miesiąc (0–11) z daty ISO / yyyy-MM-dd; -1 gdy brak daty.
export const monthIndex = (dateStr) => {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? -1 : d.getMonth();
};

// Dzień miesiąca z daty yyyy-MM-dd lub ISO.
export const dayOfMonth = (dateStr) => (dateStr ? Number(String(dateStr).slice(8, 10)) : 0);

export const dayLabel = (day, month) => `${day}.${String(month + 1).padStart(2, '0')}`;