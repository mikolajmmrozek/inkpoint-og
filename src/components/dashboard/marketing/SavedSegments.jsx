import { Trash2, Users } from 'lucide-react';
import { filterSummary } from '@/lib/marketing';

export default function SavedSegments({ segments, loading, t, onUse, onDelete }) {
  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-px bg-oxblood animate-pulse" /></div>;
  if (segments.length === 0) {
    return (
      <div className="py-16 px-6 text-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
        <Users size={16} color={t.muted} className="mx-auto mb-3" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.03em', color: t.text }}>Brak zapisanych segmentów</p>
        <p className="mx-auto mt-2 max-w-sm" style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', lineHeight: 1.6, color: t.muted }}>
          Ustaw filtry w edytorze kampanii i zapisz je jako segment, żeby użyć ich ponownie przy kolejnej wysyłce.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {segments.map(segment => (
        <div key={segment.id} className="p-4 flex items-center justify-between gap-3" style={{ border: `0.5px solid ${t.border}`, background: t.card, borderRadius: 'var(--radius)' }}>
          <div className="min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1, letterSpacing: '0.03em', color: t.text }}>{segment.name}</p>
            <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1.7, color: t.muted }}>{filterSummary(segment.filters)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => onUse(segment)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>
              Użyj
            </button>
            <button type="button" onClick={() => onDelete(segment)} aria-label="Usuń segment" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}