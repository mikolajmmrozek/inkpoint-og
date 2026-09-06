// Generuje małe miniatury dla URL-i Unsplash (paręset KB lub mniej).
// Dla innych URL-i (np. własne wgrane pliki) zwraca oryginał bez zmian.
export function getThumbnailUrl(url, size = 80, quality = 60) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(size));
    u.searchParams.set('q', String(quality));
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    u.searchParams.delete('h');
    return u.toString();
  } catch {
    return url;
  }
}