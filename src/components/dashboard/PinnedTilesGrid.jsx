import { createPortal } from 'react-dom';
import useTileReorder from '@/hooks/useTileReorder';
import PinnedTileCard from '@/components/dashboard/PinnedTileCard';
import PinnedTileContent from '@/components/dashboard/PinnedTileContent';

export default function PinnedTilesGrid({ tiles, values, t, onReorder }) {
  const { gridRef, drag, message, start, onPointerMove, onPointerUp, cancel, onKeyDown } = useTileReorder(tiles.map(tile => tile.key), onReorder);
  const ordered = drag ? drag.order.map(key => tiles.find(tile => tile.key === key)) : tiles;
  const active = drag && tiles.find(tile => tile.key === drag.key);
  const columns = tiles.length === 1 ? 'grid-cols-1' : tiles.length === 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';
  return (
    <>
      <div ref={gridRef} className={`grid auto-rows-fr gap-3 ${columns}`} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={cancel} onLostPointerCapture={cancel} style={{ userSelect: drag ? 'none' : undefined }}>
        {ordered.map(tile => (
          <PinnedTileCard key={tile.key} tile={tile} data={values[tile.key]} t={t} movable={tiles.length > 1} placeholder={drag?.key === tile.key} position={drag ? drag.index + 1 : undefined}
            onStart={event => start(event, tile.key)} onKeyDown={event => onKeyDown(event, tile.key)} />
        ))}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{message}</p>
      {active && createPortal(
        <div aria-hidden="true" className="fixed z-[100] p-5 pointer-events-none select-none border text-foreground" style={{ left: drag.left, top: drag.top, width: drag.width, height: drag.height, borderColor: 'var(--brand)', background: t.cardBg || 'hsl(var(--card))', borderRadius: 'var(--radius)', opacity: drag.inside ? 1 : 0.6, boxShadow: '0 12px 32px hsl(var(--background) / 0.35)' }}>
          <PinnedTileContent tile={active} data={values[active.key]} t={t} />
        </div>, document.body
      )}
    </>
  );
}