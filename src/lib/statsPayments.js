import { sessionAmount } from '@/lib/settlement';

export const PAYMENT_METHODS = ['cash', 'card', 'voucher'];
export const PAYMENT_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
export const PAYMENT_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };

// Kwota danej metody płatności w sesji. Starsze sesje bez podziału liczymy jako gotówkę.
export const sumMethod = (b, method) => {
  if (b?.payment_breakdown?.length) {
    return b.payment_breakdown.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  return method === 'cash' ? sessionAmount(b) : 0;
};

// Udział metody płatności w kwocie sesji — do przypisania przychodu usług i produktów.
export const methodShare = (b, method) => {
  const total = PAYMENT_METHODS.reduce((s, m) => s + sumMethod(b, m), 0);
  if (total <= 0) return 0;
  return sumMethod(b, method) / total;
};