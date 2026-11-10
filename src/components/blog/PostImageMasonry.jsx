// Mozaika zdjęć po treści wpisu — układ inspirowany Pinterestem.
// Pierwsze zdjęcie zachowuje swój naturalny kadr (pionowe/kwadratowe lub dwa poziome obok siebie).
export default function PostImageMasonry({ images = [], onOpen }) {
  if (!images.length) return null;

  const src = (img) => img?.url || img;

  return (
    <div className="mt-12 columns-2 md:columns-3 gap-3 [column-fill:_balance]">
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen?.(i)}
          className="group block w-full mb-3 overflow-hidden break-inside-avoid"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <img
            src={src(img)}
            alt={img?.caption || ''}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 media-border"
            style={{ filter: 'brightness(0.9) contrast(1.05)', display: 'block' }}
          />
          {img?.caption && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.08em', marginTop: '4px' }}>
              {img.caption}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}