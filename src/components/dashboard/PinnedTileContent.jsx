import TrendBadge from '@/components/stats/TrendBadge';

export default function PinnedTileContent({ tile, data, t }) {
  const Icon = tile.icon;
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <Icon size={15} className="text-oxblood shrink-0" />
        {data?.trend && <TrendBadge change={data.trend} t={t} />}
      </div>
      {data?.value !== undefined && (
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: t.value || t.text, lineHeight: 1, letterSpacing: '0.04em' }}>{data.value}</p>
      )}
      <p className="pr-5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: data?.value !== undefined ? '6px' : 0 }}>{tile.label}</p>
      {data?.value === undefined && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '4px', opacity: 0.7 }}>PRZEJDŹ →</p>
      )}
      {data?.sub && (
        <p className="pr-5" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', opacity: 0.85 }}>{data.sub}</p>
      )}
    </>
  );
}