import { RefreshCw } from 'lucide-react';

// Ramka magenta wokół banerów dyspozycji — u artysty pojedynczo, u admina zbiorczo.
// Zaokrąglona zgodnie z motywem, lekkie tło magenta.
export function AvailabilityBannerFrame({ children }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--brand)',
        background: 'rgb(var(--brand-rgb) /0.06)',
        borderRadius: 'var(--radius)',
        padding: '2px',
      }}
    >
      {children}
    </div>
  );
}

// Wspólny baner dyspozycji/blokady pod kalendarzem — identyczny wygląd dla admina i artysty.
// Bez znacznika graficznego przed tekstem; kliknięcie otwiera edycję wpisu.
// inFrame = wiersz bez własnej ramki (renderowany wewnątrz AvailabilityBannerFrame).
export default function AvailabilityDayBanner({ color = 'var(--brand)', label, note, recurring = false, onClick, inFrame = false }) {
  const interactive = typeof onClick === 'function';
  const style = inFrame
    ? { background: 'transparent', border: 'none', cursor: interactive ? 'pointer' : 'default' }
    : {
        border: `0.5px solid ${color}40`,
        background: `${color}08`,
        cursor: interactive ? 'pointer' : 'default',
        borderRadius: 'var(--radius)',
      };
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      className="flex items-center gap-2 w-full px-3 py-2 text-left"
      style={style}
      onMouseEnter={e => { if (interactive && inFrame) e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.08)'; }}
      onMouseLeave={e => { if (inFrame) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}{note ? ` · ${note}` : ''}
      </span>
      {recurring && <RefreshCw size={9} color={color} style={{ opacity: 0.7, flexShrink: 0 }} />}
      {interactive && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, opacity: 0.6, flexShrink: 0 }}>KLIKNIJ ABY EDYTOWAĆ →</span>
      )}
    </button>
  );
}