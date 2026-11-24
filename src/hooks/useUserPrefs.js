import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Ustawienia panelu zapamiętane na koncie (nie tylko w przeglądarce),
// dzięki czemu ten sam układ działa na każdym urządzeniu użytkownika.
const cacheKey = (email) => `userUiPrefs:${email || 'guest'}`;

const readCache = (email) => {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(email)) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (email, prefs) => {
  try {
    localStorage.setItem(cacheKey(email), JSON.stringify(prefs));
  } catch { /* brak dostępu do localStorage — zostaje tylko zapis na koncie */ }
};

export default function useUserPrefs(userEmail) {
  const [prefs, setPrefs] = useState(() => readCache(userEmail));
  const prefsRef = useRef(prefs);
  const recordIdRef = useRef(null);
  const pendingCreateRef = useRef(null);
  const loadedForRef = useRef(null);

  // Jednorazowe pobranie zapisanych ustawień z konta (cache daje natychmiastowy render).
  useEffect(() => {
    if (!userEmail || loadedForRef.current === userEmail) return;
    loadedForRef.current = userEmail;
    prefsRef.current = readCache(userEmail);
    setPrefs(prefsRef.current);
    base44.entities.UserUiPref.filter({ user_email: userEmail }, '-updated_date', 1)
      .then(rows => {
        const record = rows[0];
        if (!record) return;
        recordIdRef.current = record.id;
        const merged = { ...readCache(userEmail), ...(record.prefs || {}) };
        prefsRef.current = merged;
        setPrefs(merged);
        writeCache(userEmail, merged);
      })
      .catch(() => {});
  }, [userEmail]);

  const persist = (next) => {
    if (recordIdRef.current) {
      base44.entities.UserUiPref.update(recordIdRef.current, { prefs: next }).catch(() => {});
      return;
    }
    if (pendingCreateRef.current) {
      pendingCreateRef.current = pendingCreateRef.current.then(() => (
        recordIdRef.current
          ? base44.entities.UserUiPref.update(recordIdRef.current, { prefs: next }).catch(() => {})
          : null
      ));
      return;
    }
    pendingCreateRef.current = base44.entities.UserUiPref
      .create({ user_email: userEmail, prefs: next })
      .then(record => {
        if (record?.id) recordIdRef.current = record.id;
        pendingCreateRef.current = null;
      })
      .catch(() => { pendingCreateRef.current = null; });
  };

  const setPref = (key, value) => {
    if (!userEmail) return;
    const next = { ...prefsRef.current, [key]: value };
    prefsRef.current = next;
    setPrefs(next);
    writeCache(userEmail, next);
    persist(next);
  };

  return { prefs, setPref };
}