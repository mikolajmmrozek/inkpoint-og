// Opens a full-screen branded QR page for the health-form survey.
// Now opens the persistent /health-form-qr route (in a new tab) so the
// page is navigable and can be returned to after the form is submitted.
export function openHealthFormQRPage(url, studioName = 'ROMANS TATTOO') {
  let bookingId = '';
  try {
    const u = new URL(url, window.location.origin);
    bookingId = u.searchParams.get('booking_id') || '';
  } catch (_) {}
  const qrUrl = `${window.location.origin}/health-form-qr${bookingId ? `?booking_id=${encodeURIComponent(bookingId)}` : ''}`;
  window.open(qrUrl, '_blank');
}