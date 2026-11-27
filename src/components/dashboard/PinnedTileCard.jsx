import { Link } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import PinnedTileContent from '@/components/dashboard/PinnedTileContent';

export default function PinnedTileCard({ tile, data, t, placeholder, position, movable, onStart, onKeyDown }) {
  return (
    <div data-tile-key={tile.key} className="relative min-w-0 h-full">
      <Link to={tile.href} draggable={false} className="block p-5 transition-colors h-full" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg || 'transparent', borderRadius: 'var(--radius)', visibility: placeholder ? 'hidden' : undefined }}>
        <PinnedTileContent tile={tile} data={data} t={t} />
      </Link>
      {placeholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed text-oxblood" style={{ borderColor: 'var(--brand)', background: 'rgb(var(--brand-rgb) / 0.06)', borderRadius: 'var(--radius)' }}>
          <span className="font-mono text-[10px] tracking-widest">UPUŚĆ TUTAJ</span>
          <span className="font-mono text-[9px]">Pozycja {position}</span>
        </div>
      )}
      {movable && (
        <button type="button" aria-label={`Zmień kolejność: ${tile.label}. Przeciągnij lub użyj strzałek.`} title="Przeciągnij lub użyj strzałek, aby zmienić kolejność" onPointerDown={onStart} onKeyDown={onKeyDown} onClick={event => { event.preventDefault(); event.stopPropagation(); }}
          className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing text-oxblood bg-transparent border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
          style={{ visibility: placeholder ? 'hidden' : undefined, borderRadius: 'var(--radius)' }}>
          <GripVertical size={18} />
        </button>
      )}
    </div>
  );
}