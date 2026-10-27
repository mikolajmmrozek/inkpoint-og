import { RefreshCw } from 'lucide-react';

// Wspólny baner dyspozycji/blokady pod kalendarzem — identyczny wygląd dla admina i artysty.
// Bez znacznika graficznego przed tekstem; kliknięcie otwiera edycję wpisu.
export default function AvailabilityDayBanner({ color = 'var(--brand)', label, note, recurring = false, onClick }) {
  const interactive = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      className="flex items-center gap-2 w-full px-3 py-2 text-left"
      style={{
        border: `0.5px solid ${color}40`,
        background: `${color}08`,
        cursor: interactive ? 'pointer' : 'default',
        borderRadius: 'var(--radius)',
      }}
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