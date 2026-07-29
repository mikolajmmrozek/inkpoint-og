// Shared booking conflict detection utilities

export function timeToMin(t) {
  if (!t) return null;
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts[0] * 60 + (parts[1] || 0);
}

function matchesRepeatOnDate(ex, dateStr) {
  if (!ex.date || ex.date > dateStr) return false;
  if (ex.repeat_until && ex.repeat_until !== 'indefinite' && ex.repeat_until < dateStr) return false;
  const start = new Date(ex.date + 'T12:00:00');
  const target = new Date(dateStr + 'T12:00:00');
  const diffDays = Math.round((target - start) / 86400000);
  if (diffDays < 0) return false;
  if (ex.repeat === 'weekly') return diffDays % 7 === 0;
  if (ex.repeat === 'biweekly') return diffDays % 14 === 0;
  if (ex.repeat === 'monthly') return start.getDate() === target.getDate();
  return false;
}

export function getExceptionForDate(records, dateStr) {
  const exceptions = (records || []).filter(r => r.type === 'exception');
  const exact = exceptions.find(r => r.date === dateStr && (!r.repeat || r.repeat === 'none'));
  if (exact) return exact;
  return exceptions.find(r => r.repeat && r.repeat !== 'none' && matchesRepeatOnDate(r, dateStr)) || null;
}

// Determine whether an artist is off (unavailable) on a given date.
// Returns { off: boolean, note, timeRange, isException }.
export function isArtistOffOnDate(records, artistId, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const artistRecords = (records || []).filter(r => r.artist_id === artistId);
  const ex = getExceptionForDate(artistRecords, dateStr);
  if (ex) {
    return {
      off: ex.is_available === false,
      note: ex.note || '',
      timeRange: ex.start_time ? `${ex.start_time}–${ex.end_time}` : null,
      isException: true,
    };
  }
  const recurringOff = artistRecords.find(r => r.type === 'recurring' && r.day_of_week === dow && r.is_available === false);
  if (recurringOff) {
    return {
      off: true,
      note: recurringOff.note || 'Cykliczne wolne',
      timeRange: recurringOff.start_time ? `${recurringOff.start_time}–${recurringOff.end_time}` : null,
      isException: false,
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

function minToLabel(min) {
  if (min == null) return '';
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Check if session overlaps a time-off block (is_available: false) — recurring or exception.
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

  // Exception block
  const ex = getExceptionForDate(records, dateStr);
  if (ex && ex.is_available === false) {
    const blockStart = ex.start_time ? timeToMin(ex.start_time) : 0;
    const blockEnd = ex.end_time ? timeToMin(ex.end_time) : 24 * 60;
    if (sessionStart < blockEnd && sessionEnd > blockStart) {
      return {
        type: 'time_off',
        timeRange: ex.start_time ? `${ex.start_time}–${ex.end_time}` : 'cały dzień',
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