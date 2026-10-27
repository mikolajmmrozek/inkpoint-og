// ─────────────────────────────────────────────────────────────────────────
// Zakresowe dyspozycje (ArtistAvailability) — wspólne pomocniki.
//
// Model: rekord jednorazowy (repeat = none) może obejmować zakres dat:
//   date     = pierwszy dzień zakresu
//   end_date = ostatni dzień zakresu (brak lub równa date = pojedynczy dzień)
// Godziny graniczne (start_time / end_time) obowiązują tylko pierwszego dnia
// (start_time) i ostatniego (end_time); dni środkowe są całodniowe.
// Rekordy cykliczne (repeat ≠ none) pozostają jednodniowe — model bez zmian.
// ─────────────────────────────────────────────────────────────────────────

export function timeToMin(t) {
  if (!t) return null;
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts[0] * 60 + (parts[1] || 0);
}

function minToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Następny dzień (YYYY-MM-DD) — arytmetyka UTC, niezależna od strefy.
export function nextDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// Czy rekord jest wielodniowym zakresem (jednorazowy z end_date > date).
export function isRangeRecord(r) {
  return !!(r && r.date && r.end_date && r.end_date > r.date && (!r.repeat || r.repeat === 'none'));
}

// Dopasowanie wystąpienia cyklu (rekordy cykliczne są jednodniowe).
export function matchesRepeatOnDate(ex, dateStr) {
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

// Czy wyjątek (jednorazowy zakres albo wystąpienie cyklu) obejmuje dany dzień.
export function exceptionCoversDate(ex, dateStr) {
  if (!ex || !ex.date || ex.date > dateStr) return false;
  if (ex.repeat && ex.repeat !== 'none') return matchesRepeatOnDate(ex, dateStr);
  if (ex.end_date && ex.end_date < dateStr) return false;
  // Jednorazowy wpis bez end_date to pojedynczy dzień — nie pokrywa kolejnych dat.
  if (!ex.end_date && ex.date !== dateStr) return false;
  return true;
}

// Okno aktywności rekordu w danym dniu, w minutach.
// start/end = null → brzeg otwarty (od początku / do końca dnia).
// Zwraca null, gdy rekord nie obejmuje tego dnia.
export function getDayWindow(ex, dateStr) {
  if (!exceptionCoversDate(ex, dateStr)) return null;
  if (!ex.start_time || !ex.end_time) return { start: null, end: null };
  const isRepeat = !!(ex.repeat && ex.repeat !== 'none');
  if (isRepeat || !ex.end_date || ex.end_date <= ex.date) {
    return { start: timeToMin(ex.start_time), end: timeToMin(ex.end_time) };
  }
  if (ex.date === dateStr) return { start: timeToMin(ex.start_time), end: null };
  if (ex.end_date === dateStr) return { start: null, end: timeToMin(ex.end_time) };
  return { start: null, end: null }; // dzień środkowy — całodniowo
}

// Czytelna etykieta okna czasu w danym dniu
// ('09:00–18:00' / 'od 10:00' / 'do 18:00' / 'Cały dzień').
export function dayWindowLabel(ex, dateStr) {
  const w = getDayWindow(ex, dateStr);
  if (!w) return null;
  if (w.start === null && w.end === null) return 'Cały dzień';
  if (w.start === null) return `do ${minToTime(w.end)}`;
  if (w.end === null) return `od ${minToTime(w.start)}`;
  return `${minToTime(w.start)}–${minToTime(w.end)}`;
}

// Daty wystąpień CYKLU (repeat ≠ none) — model cykli bez zmian.
// Dla repeat = none zwraca pojedynczą datę startu (zakres to JEDEN rekord,
// nie lista dni — patrz create z end_date).
export function generateDates(dateFrom, dateTo, repeat, repeatUntil, repeatIndefinite) {
  if (!repeat || repeat === 'none') return [dateFrom];
  const start = new Date(dateFrom + 'T12:00:00');
  const endLimit = repeatIndefinite
    ? new Date(start.getFullYear() + 2, start.getMonth(), start.getDate())
    : (repeatUntil ? new Date(repeatUntil + 'T12:00:00') : (dateTo ? new Date(dateTo + 'T12:00:00') : start));

  const dates = [];
  let cur = new Date(start);
  while (cur <= endLimit) {
    dates.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    if (repeat === 'weekly') cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    else if (repeat === 'biweekly') cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 14);
    else if (repeat === 'monthly') cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    else break;
  }
  return dates;
}