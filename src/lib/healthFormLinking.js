import { base44 } from '@/api/base44Client';

const norm = (v) => (v || '').toString().toLowerCase().trim();
const digits = (v) => (v || '').toString().replace(/\D/g, '');
const dayOnly = (v) => (v ? String(v).slice(0, 10) : '');
const diffDays = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// Szuka sesji, do której należy wypełniana ankieta.
// Reguła: pewne dopasowanie (e-mail lub telefon) albo imię i nazwisko
// w dniu sesji. Ankiety starsze niż 30 dni od sesji nie są podpinane.
export async function findMatchingBooking(form) {
  if (!form || form.booking_id) return null;

  const email = norm(form.client_email);
  const phone = digits(form.client_phone);
  const name = norm(`${form.client_first_name || ''} ${form.client_last_name || ''}`);
  if (!email && !phone && !name) return null;

  const bookings = await base44.entities.Booking.list('-session_date', 300).catch(() => []);
  const filled = dayOnly(form.form_filled_date) || dayOnly(new Date().toISOString());
  const today = dayOnly(new Date().toISOString());

  let best = null;
  bookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const bDate = dayOnly(b.session_date);
    if (bDate && diffDays(bDate, today) > 30) return;

    const bEmail = norm(b.client_email);
    const bPhone = digits(b.client_phone);
    const bName = norm(b.client_name);

    let score = 0;
    const strong = (email && bEmail && email === bEmail) || (phone.length >= 6 && bPhone && phone === bPhone);
    if (strong) score += 5;
    if (name && bName && name === bName) score += 2;
    if (score === 0) return;

    // Ta sama data sesji co data wypełnienia = mocny sygnał
    if (bDate && bDate === filled) score += 3;
    if (b.health_form_completed) score -= 1;

    if (!best || score > best.score) best = { booking: b, score };
  });

  return best && best.score >= 5 ? best.booking : null;
}

// Podpina zapisaną ankietę do sesji (i tym samym domyka flagę ankiety w rezerwacji).
// Zwraca id powiązanej sesji albo pusty string.
export async function autoLinkHealthForm(formId, form) {
  if (!formId || !form) return '';
  if (form.booking_id) return form.booking_id;

  const booking = await findMatchingBooking(form).catch(() => null);
  if (!booking?.id) return '';

  await base44.entities.HealthForm.update(formId, { booking_id: booking.id }).catch(() => {});
  await base44.entities.Booking.update(booking.id, { health_form_completed: true, last_editor: 'client' }).catch(() => {});
  return booking.id;
}