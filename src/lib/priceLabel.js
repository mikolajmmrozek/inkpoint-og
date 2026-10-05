const fmt = (n) => Number(n).toLocaleString('pl-PL');

// Orientacyjna cena sesji: najpierw cena z rezerwacji, potem cena usługi (stała lub zakres).
export function getPriceLabel(booking, service) {
  if (booking?.estimated_price > 0) return `${fmt(booking.estimated_price)} PLN`;
  if (!service) return null;
  if (service.price_type === 'range' && service.price_max > 0) {
    return `${fmt(service.price_min || 0)} – ${fmt(service.price_max)} PLN`;
  }
  if (service.price_fixed > 0) return `${fmt(service.price_fixed)} PLN`;
  return null;
}