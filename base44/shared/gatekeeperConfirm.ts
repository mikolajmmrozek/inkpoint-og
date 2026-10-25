import { secrets } from 'base44:runtime';

// Wspólne narzędzenia potwierdzeń dwuetapowych Gatekeeperów (admin + artysta).
// Token jest HMAC-iem powiązanym z dokładną treścią operacji i wygasa po 15 min.

export const TOKEN_TTL_MS = 15 * 60 * 1000;

async function hmacHex(keyMaterial: string, str: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(keyMaterial), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(str));
  let hex = '';
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

// Kanoniczna serializacja (posortowane klucze) — token nie zależy od kolejności pól w obiekcie,
// dzięki czemu asystent może przekazać te same dane w innej kolejności klucz:wartość.
export function stableStringify(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

export function tokenPayload(userId: string, action: string, entity: string, dat: any) {
  return stableStringify({ uid: userId, act: action, ent: entity, dat });
}

function keyMaterialFor(keySuffix: string) {
  return (secrets.get('BASE44_APP_ID') || 'gatekeeper-ops') + '|' + keySuffix;
}

export async function signToken(userId: string, action: string, entity: string, dat: any, keySuffix: string) {
  const ts = Date.now();
  const sig = await hmacHex(keyMaterialFor(keySuffix), ts + '|' + tokenPayload(userId, action, entity, dat));
  return `${ts}.${sig}`;
}

export async function verifyToken(token: string, userId: string, action: string, entity: string, dat: any, keySuffix: string) {
  if (typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const ts = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!ts || !Number.isFinite(ts) || Date.now() - ts > TOKEN_TTL_MS) return false;
  const expect = await hmacHex(keyMaterialFor(keySuffix), ts + '|' + tokenPayload(userId, action, entity, dat));
  return expect === sig;
}