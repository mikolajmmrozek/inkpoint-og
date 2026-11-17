import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Wskaźnik zmiany: zielony wzrost, magenta spadek, neutralny brak porównania.
export default function TrendBadge({ change, note = 'zeszły miesiąc', t, size = '10px', align }) {
  if (!change) return null;

  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: size,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: '6px',
    lineHeight: 1.4,
    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    flexWrap: 'wrap',
  };

  if (change.pct == null && !change.isNew) {
    return (
      <p className="flex items-center gap-1" style={{ ...style, color: t.muted, fontWeight: 500 }}>
        {note ? 'brak danych z zeszłego miesiąca' : 'brak danych'}
      </p>
    );
  }

  const up = change.isNew || change.dir === 'up';
  const Icon = up ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus;
  const color = up ? '#16a34a' : change.dir === 'down' ? 'var(--brand)' : t.muted;

  return (
    <p className="flex items-center gap-1" style={{ ...style, color }}>
      <Icon size={13} />
      <span>{change.isNew ? 'nowe' : `${change.pct > 0 ? '+' : ''}${change.pct}%`}</span>
      {note && <span style={{ color: t.muted, fontWeight: 500 }}>· {note}</span>}
    </p>
  );
}