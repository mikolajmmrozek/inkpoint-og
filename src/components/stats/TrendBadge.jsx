import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Wskaźnik zmiany: zielony wzrost, magenta spadek, neutralny brak porównania.
export default function TrendBadge({ change, note = 'vs poprzedni miesiąc', t, size = '8px', align }) {
  if (!change) return null;

  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: size,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginTop: '4px',
    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
  };

  if (change.pct == null) {
    return (
      <p className="flex items-center gap-1" style={{ ...style, color: t.muted, opacity: 0.8 }}>
        {note ? 'brak danych za poprzedni okres' : 'brak danych'}
      </p>
    );
  }

  const Icon = change.dir === 'up' ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus;
  const color = change.dir === 'up' ? '#16a34a' : change.dir === 'down' ? 'var(--brand)' : t.muted;

  return (
    <p className="flex items-center gap-1" style={{ ...style, color }}>
      <Icon size={9} />
      {change.pct > 0 ? '+' : ''}{change.pct}%
      {note && <span style={{ color: t.muted, letterSpacing: '0.06em' }}>{note}</span>}
    </p>
  );
}