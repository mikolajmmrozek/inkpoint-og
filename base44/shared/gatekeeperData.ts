// Wspólne pomocniki danych Gatekeeperów (admin + artysta).

export const builtinFields = ['id', 'created_date', 'updated_date', 'created_by_id'];

export const asList = (res: any) => Array.isArray(res) ? res : (res?.items || []);

export function pick(record: any, keys: string[]) {
  const out: any = {};
  for (const k of keys) if (record && record[k] !== undefined) out[k] = record[k];
  return out;
}

export function genSessionId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SES-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Maska pól wrażliwych ankiet (HealthForm / GuardianConsentForm) — wspólna lista dla obu Gatekeeperów
export const HEALTH_FORM_MASK = ['pesel', 'id_document', 'address_street', 'address_city', 'address_postal_code', 'date_of_birth', 'client_signature', 'guardian_phone', 'guardian_signature', 'minor_date_of_birth'];
export const HEALTH_FORM_MASK_PATTERN = /(_desc|description)$/;

export function maskRecord(record: any, cfg: any, includeSensitive: boolean) {
  if (includeSensitive || !cfg || (!cfg.mask && !cfg.maskPattern)) return record;
  const out: any = {};
  for (const k of Object.keys(record)) {
    if (cfg.mask && cfg.mask.includes(k)) { out[k] = '[ukryte — dane wrażliwe]'; continue; }
    if (cfg.maskPattern && cfg.maskPattern.test(k)) { out[k] = '[ukryte — dane wrażliwe]'; continue; }
    out[k] = record[k];
  }
  return out;
}