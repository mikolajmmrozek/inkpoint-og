export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

/**
 * Polish pluralization for "sesja" (session).
 * 0 sesji, 1 sesja, 2-4 sesje, 5-21 sesji, 22-24 sesje, etc.
 */
export function pluralSesji(n: number): string {
    if (n === 1) return 'sesja';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'sesje';
    return 'sesji';
}