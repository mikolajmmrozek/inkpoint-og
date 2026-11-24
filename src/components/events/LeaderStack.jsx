import { getThumbnailUrl } from '@/lib/thumbnail';

const initials = (name) => String(name || '')
  .split(' ')
  .filter(Boolean)
  .map(w => w[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

/**
 * Stos avatary prowadzących — kolejne zdjęcia zachodzą lekko na poprzednie.
 * Osoby bez zdjęcia pokazujemy jako inicjały. Używany w kalendarzu i na kartach oferty.
 */
export default function LeaderStack({ people = [], size = 26, max = 3, ring = 'hsl(var(--background))', color = 'var(--brand)' }) {
  const list = (people || []).filter(Boolean);
  if (list.length === 0) return null;

  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  const overlap = Math.round(size * 0.34);

  return (
    <div className="flex items-center" style={{ flexShrink: 0 }}>
      {shown.map((p, i) => (
        <div
          key={p.id || `${p.name}-${i}`}
          title={p.name || ''}
          style={{
            width: size,
            height: size,
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: i + 1,
            position: 'relative',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `1.5px solid ${ring}`,
            background: 'rgb(var(--brand-rgb) /0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {p.photo_url ? (
            <img
              src={getThumbnailUrl(p.photo_url, size * 3, 80)}
              alt={p.name || ''}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: Math.max(8, Math.round(size * 0.34)), color, letterSpacing: '0.04em' }}>
              {initials(p.name)}
            </span>
          )}
        </div>
      ))}
      {rest > 0 && (
        <div
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            zIndex: shown.length + 1,
            position: 'relative',
            borderRadius: '50%',
            border: `1.5px solid ${ring}`,
            background: 'rgb(var(--brand-rgb) /0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: Math.max(7, Math.round(size * 0.3)), color }}>+{rest}</span>
        </div>
      )}
    </div>
  );
}