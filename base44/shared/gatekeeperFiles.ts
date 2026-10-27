// Zamienia prywatne identyfikatory plików (file_uri z prywatnego magazynu)
// na krótkotrwałe podpisane adresy https — potrzebne modelowi do odczytu treści.
// Publiczne adresy http przechodzą bez zmian.
export async function resolveFileUrls(base44: any, raw: any[], max: number): Promise<string[]> {
  const unique = [...new Set(raw.map(String))].filter(Boolean).slice(0, max);
  const out: string[] = [];
  for (const u of unique) {
    if (/^https?:\/\//i.test(u)) { out.push(u); continue; }
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: u, expires_in: 900 });
    if (res?.signed_url) out.push(res.signed_url);
  }
  return out;
}