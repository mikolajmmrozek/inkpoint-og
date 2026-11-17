import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Wskaźnik zmiany: zielony wzrost, magenta spadek. Brak danych = brak wskaźnika.
export default function TrendBadge({ change, note = 'zeszły miesiąc', t, align }) {
  if (!change) return null;
  if (change.pct == null && !change.isNew) return null;

  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    fontWeight: 400,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '5px',
    lineHeight: 1.4,
    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    flexWrap: 'wrap',
  };

  const up = change.isNew || change.dir === 'up';
  const Icon = up ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus;
  const color = up ? '#16a34a' : change.dir === 'down' ? 'var(--brand)' : t.muted;

  return (
    <p className="flex items-center gap-1" style={{ ...style, color }}>
      <Icon size={10} />
      <span>{change.isNew ? 'nowe' : `${change.pct > 0 ? '+' : ''}${change.pct}%`}</span>
      {note && <span style={{ color: t.muted }}>· {note}</span>}
    </p>
  );
}