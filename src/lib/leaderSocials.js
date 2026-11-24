// Social media prowadzących: przyjmujemy pełny link albo samą nazwę profilu.
const HOSTS = {
  instagram: (v) => `https://www.instagram.com/${v}`,
  facebook: (v) => `https://www.facebook.com/${v}`,
  tiktok: (v) => `https://www.tiktok.com/@${v}`,
  website: (v) => `https://${v}`,
};

const clean = (v) => String(v || '').trim().replace(/^@+/, '');

export function socialUrl(kind, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const build = HOSTS[kind];
  if (!build) return '';
  return build(kind === 'website' ? raw.replace(/^\/+/, '') : clean(raw));
}

// Lista linków do pokazania — tylko podane wartości, w stałej kolejności.
export function leaderSocials(source) {
  if (!source) return [];
  return ['instagram', 'facebook', 'tiktok', 'website']
    .map(kind => ({ kind, url: socialUrl(kind, source[kind]) }))
    .filter(link => link.url);
}

// Social media prowadzącego spoza organizacji — dopasowane po nazwisku.
export function externalLeaderSocials(event, name) {
  const key = String(name || '').trim().toLowerCase();
  const found = (event?.external_leader_socials || [])
    .find(s => String(s?.name || '').trim().toLowerCase() === key);
  return leaderSocials(found);
}