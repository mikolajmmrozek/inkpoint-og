export const MAIN_ADMIN_EMAIL = 'tattoo.wolsztyn@gmail.com';

/**
 * Zwraca email, pod którym zapisywane/odczytywane są powiadomienia.
 * Wszyscy admini współdzielą jedną skrzynkę (MAIN_ADMIN_EMAIL).
 */
export function getNotificationEmail(role, userEmail) {
  if (role === 'admin') return MAIN_ADMIN_EMAIL;
  return userEmail;
}