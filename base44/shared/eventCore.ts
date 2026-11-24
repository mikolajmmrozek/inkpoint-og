// Wspólna logika modułu wydarzeń: zajętość miejsc, kalendarz Google i e-maile.
// Używana przez funkcje createEventBooking, manageEventBooking, manageEventCalendar.

import { sendViaGmail, getStudioName, withStudioName, buildAppUrl } from './bookingEmail.ts';

export const ACTIVE_STATUSES = ['pending', 'confirmed'];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje na potwierdzenie',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  rejected: 'Odrzucona',
};

export function spotsTaken(bookings: any[], sessionId: string): number {
  return bookings
    .filter(b => b.session_id === sessionId && ACTIVE_STATUSES.includes(b.status))
    .reduce((sum, b) => sum + (Number(b.participants) || 1), 0);
}

export function normEmail(value: any): string {
  return String(value || '').trim().toLowerCase();
}

export function clean(value: any): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Google Calendar ─────────────────────────────────────────────────────────

export async function calendarHeaders(base44: any): Promise<any | null> {
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!conn?.accessToken) return null;
    return { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' };
  } catch (_) {
    return null;
  }
}

// Dedykowany kalendarz artysty — tworzony raz i zapisywany na profilu artysty.
export async function ensureArtistCalendar(base44: any, artist: any, headers: any): Promise<string> {
  if (artist?.gcal_calendar_id) return artist.gcal_calendar_id;
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers,
    body: JSON.stringify({ summary: `Romans Tattoo — ${artist.name}`, timeZone: 'Europe/Warsaw' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Nie udało się utworzyć kalendarza (${res.status})`);
  const data: any = await res.json();
  await base44.asServiceRole.entities.Artist.update(artist.id, { gcal_calendar_id: data.id });
  return data.id;
}

export async function deterministicId(seed: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(seed)));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return 'b44e' + hex.slice(0, 28);
}

export function buildSessionEventBody(event: any, session: any) {
  const start = `${session.date}T${session.start_time || '10:00'}:00`;
  let end = session.end_time ? `${session.date}T${session.end_time}:00` : '';
  if (!end) {
    const [h, m] = String(session.start_time || '10:00').split(':').map(Number);
    const total = h * 60 + m + 120;
    end = `${session.date}T${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
  }
  const description = [
    `Warsztat: ${event.title}`,
    event.price ? `Cena za osobę: ${event.price} zł` : '',
    session.location || event.location ? `Miejsce: ${session.location || event.location}` : '',
    `Liczba miejsc: ${session.capacity || 0}`,
    event.short_description ? `Opis: ${event.short_description}` : '',
  ].filter(Boolean).join('\n');

  return {
    summary: `Warsztat: ${event.title}`,
    description,
    start: { dateTime: start, timeZone: 'Europe/Warsaw' },
    end: { dateTime: end, timeZone: 'Europe/Warsaw' },
  };
}

// ── E-maile ─────────────────────────────────────────────────────────────────

export function eventMailHtml({ heading, intro, rows = [], note = '', url = '' }: any): string {
  const rowHtml = rows
    .filter((r: any) => r && r.value)
    .map((r: any) => `<tr>
      <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;width:130px;vertical-align:top;">${r.label}</td>
      <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111111;">${String(r.value).replace(/</g, '&lt;')}</td>
    </tr>`)
    .join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;background:#0A0A0A;color:#F5F0EB;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.24em;color:#FF007F;text-transform:uppercase;margin:0 0 20px;">ROMANS TATTOO</p>
    <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;margin:0 0 12px;color:#F5F0EB;">${heading}</h1>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#cfc9c2;margin:0 0 20px;">${intro}</p>
    <table style="width:100%;border-top:1px solid #262626;border-bottom:1px solid #262626;padding:8px 0;">${rowHtml}</table>
    ${note ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#cfc9c2;margin:20px 0 0;">${note}</p>` : ''}
    ${url ? `<p style="margin:26px 0 0;"><a href="${url}" style="display:inline-block;background:#FF007F;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:13px 24px;border-radius:16px;">Zobacz wydarzenie</a></p>` : ''}
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6f6a64;margin:28px 0 0;">Wiadomość wysłana automatycznie po zapisie na wydarzenie.</p>
  </div></body></html>`;
}

export async function sendEventEmail(base44: any, { to, subject, html, text }: any) {
  if (!to) return false;
  try {
    const studioName = await getStudioName(base44);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) return false;
    await sendViaGmail(
      accessToken,
      studioName,
      'tattoo.wolsztyn@gmail.com',
      to,
      withStudioName(subject, studioName),
      withStudioName(text || subject, studioName),
      withStudioName(html, studioName),
    );
    return true;
  } catch (_) {
    return false;
  }
}

export function eventPublicUrl(slug: string) {
  return buildAppUrl(`/wydarzenia/${slug || ''}`);
}