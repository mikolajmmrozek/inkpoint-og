// Shared booking conflict detection utilities
import { exceptionCoversDate, getDayWindow, dayWindowLabel, timeToMin } from './availability';

export { timeToMin };

export function getExceptionForDate(records, dateStr) {
  const exceptions = (records || []).filter(r => r.type === 'exception');
  // First: exact single-day match (no repeat, no range) — dzień ma własny wpis
  const exact = exceptions.find(r => r.date === dateStr && (!r.repeat || r.repeat === 'none') && (!r.end_date || r.end_date <= r.date));
  if (exact) return exact;
  // Then: any record covering this day — zakres (date..end_date) albo wystąpienie cyklu
  return exceptions.find(r => exceptionCoversDate(r, dateStr)) || null;
}

// Determine whether an artist is off (unavailable) on a given date.
// Returns { off: boolean, note, timeRange, isException, record }.
export function isArtistOffOnDate(records, artistId, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const artistRecords = (records || []).filter(r => r.artist_id === artistId);
  const ex = getExceptionForDate(artistRecords, dateStr);
  if (ex) {
    return {
      off: ex.is_available === false,
      note: ex.note || '',
      timeRange: ex.start_time && ex.end_time ? (dayWindowLabel(ex, dateStr) || `${ex.start_time}–${ex.end_time}`) : null,
      isException: true,
      record: ex,
    };
  }
  const recurringOff = artistRecords.find(r => r.type === 'recurring' && r.day_of_week === dow && r.is_available === false);
  if (recurringOff) {
    return {
      off: true,
      note: recurringOff.note || 'Cykliczne wolne',
      timeRange: recurringOff.start_time ? `${recurringOff.start_time}–${recurringOff.end_time}` : null,
      isException: false,
      record: recurringOff,
    };
  }
  return { off: false, note: '', timeRange: null, isException: false };
}

// List of artists who are off on a given date, respecting an optional artist filter.
// artistFilter may be: an array of artist IDs (empty = all active artists),
// a single ID string, or 'all'. Empty array/string 'all' = no filter.
export function getArtistsOffForDate(records, artists, artistFilter, dateStr) {
  const arr = Array.isArray(artistFilter)
    ? artistFilter
    : (artistFilter && artistFilter !== 'all' ? [artistFilter] : []);
  const list = arr.length > 0
    ? (artists || []).filter(a => arr.includes(a.id))
    : (artists || []).filter(a => a.is_active !== false);
  return list
    .map(a => ({ artist: a, ...isArtistOffOnDate(records, a.id, dateStr) }))
    .filter(x => x.off);
}

// Check if session overlaps a time-off block (is_available: false) — recurring, single-day or range.
// Zakresowa blokada: pierwszego dnia blokuje od start_time do końca dnia,
// ostatniego — od początku dnia do end_time, dni środkowe — całodniowo.
export function findTimeOffConflict(records, dateStr, startTime, endTime) {
  const sessionStart = timeToMin(startTime);
  if (sessionStart === null) return null;
  let sessionEnd = timeToMin(endTime);
  if (sessionEnd === null) sessionEnd = sessionStart + 60;

  // Recurring day-off
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const recurringBlock = (records || []).find(r =>
    r.type === 'recurring' && r.day_of_week === dow && r.is_available === false
  );
  if (recurringBlock) {
    const blockStart = recurringBlock.start_time ? timeToMin(recurringBlock.start_time) : 0;
    const blockEnd = recurringBlock.end_time ? timeToMin(recurringBlock.end_time) : 24 * 60;
    if (sessionStart < blockEnd && sessionEnd > blockStart) {
      return {
        type: 'time_off',
        timeRange: recurringBlock.start_time ? `${recurringBlock.start_time}–${recurringBlock.end_time}` : 'cały dzień',
        note: recurringBlock.note || 'Cykliczne wolne',
      };
    }
  }

  // Exception block (single-day or range)
  const ex = getExceptionForDate(records, dateStr);
  if (ex && ex.is_available === false) {
    const w = getDayWindow(ex, dateStr);
    const blockStart = w && w.start !== null ? w.start : 0;
    const blockEnd = w && w.end !== null ? w.end : 24 * 60;
    if (sessionStart < blockEnd && sessionEnd > blockStart) {
      return {
        type: 'time_off',
        timeRange: w && w.start !== null && w.end !== null ? dayWindowLabel(ex, dateStr) : 'cały dzień',
        note: ex.note || 'Wolne w tym dniu',
      };
    }
  }
  return null;
}

// Check if session overlaps an existing (non-cancelled) booking for the same artist/date.
export function findDoubleBookingConflict(existingBookings, dateStr, startTime, endTime, excludeId) {
  const sessionStart = timeToMin(startTime);
  if (sessionStart === null) return null;
  let sessionEnd = timeToMin(endTime);
  if (sessionEnd === null) sessionEnd = sessionStart + 60;

  for (const b of (existingBookings || [])) {
    if (b.id === excludeId) continue;
    if (b.session_date !== dateStr) continue;
    if (b.status === 'cancelled') continue;
    const bStart = timeToMin(b.session_time);
    if (bStart === null) continue;
    let bEnd = timeToMin(b.session_end_time);
    if (bEnd === null) bEnd = bStart + (b.session_duration || 60);
    if (sessionStart < bEnd && sessionEnd > bStart) {
      return {
        type: 'double_booking',
        clientName: b.client_name || '—',
        timeRange: `${b.session_time}${b.session_end_time ? `–${b.session_end_time}` : ''}`,
        status: b.status,
      };
    }
  }
  return null;
}