import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Pencil, X, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TrendBadge from '@/components/stats/TrendBadge';
import { tileCatalog, defaultTiles, MAX_TILES } from '@/lib/pinnedTiles';
import PinnedTilesSettings from './PinnedTilesSettings';

// Przypięte kafle pulpitu (maks. 8): wartości, trendy i krótkie opisy pod nimi.
// values: { [klucz]: { value, trend, sub } }
export default function PinnedTiles({ role, userEmail, values = {}, t, theme, onKeysChange }) {
  const catalog = tileCatalog(role);
  const [keys, setKeys] = useState(defaultTiles(role));
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const [recordId, setRecordId] = useState(null);

  // Rodzic potrzebuje listy przypiętych kluczy, żeby nie powtarzać tych samych
  // wskaźników w sekcji poniżej.
  useEffect(() => { onKeysChange?.(keys); }, [keys]);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.DashboardPinnedTiles.filter({ user_email: userEmail, role })
      .then(list => {
        const rec = list[0];
        if (rec) {
          setRecordId(rec.id);
          if (Array.isArray(rec.tiles) && rec.tiles.length > 0) {
            setKeys(rec.tiles.filter(k => catalog.some(tile => tile.key === k)).slice(0, MAX_TILES));
          }
        }
      })
      .catch(() => {});
  }, [userEmail, role, version]);

  const tiles = keys.map(key => catalog.find(tile => tile.key === key)).filter(Boolean);
  const cols = tiles.length <= 2 ? tiles.length || 1 : tiles.length === 3 ? 3 : 4;

  // Zapis kolejności kafli — po zalogowaniu na innym urządzeniu zostaje ta sama.
  const persistOrder = async (next) => {
    if (!userEmail) return;
    if (recordId) await base44.entities.DashboardPinnedTiles.update(recordId, { tiles: next });
    else {
      const created = await base44.entities.DashboardPinnedTiles.create({ user_email: userEmail, role, tiles: next });
      setRecordId(created.id);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const next = tiles.map(tile => tile.key);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setKeys(next);
    persistOrder(next);
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          PRZYPIĘTE
        </p>
        <button
          onClick={() => setEditing(true)}
          title="Edytuj przypięte kafle"
          className="flex items-center gap-1.5"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <Pencil size={11} /> EDYTUJ
        </button>
      </div>

      {tiles.length === 0 ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full py-6 text-center"
          style={{ border: `0.5px dashed ${t.border}`, background: 'transparent', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          + PRZYPNIJ KAFLE
        </button>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pinned-tiles" direction="horizontal">
            {(dropProvided) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className="flex flex-wrap gap-3"
              >
                {tiles.map((tile, index) => {
                  const Icon = tile.icon;
                  const data = values[tile.key];
                  // Szerokości jak w siatce — zawijanie w wiersze, dzięki czemu
                  // przeciąganie pokazuje właściwe miejsce między kaflami.
                  const itemClass = cols === 1
                    ? 'w-full'
                    : cols === 2
                      ? 'w-[calc(50%-6px)]'
                      : cols === 3
                        ? 'w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)]'
                        : 'w-[calc(50%-6px)] lg:w-[calc(25%-9px)]';
                  return (
                    <Draggable key={tile.key} draggableId={tile.key} index={index} isDragDisabled={tiles.length < 2}>
                      {(dragProvided, snapshot) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className={itemClass} style={{ ...dragProvided.draggableProps.style, position: 'relative', height: 'auto' }}>
                          <Link
                            to={tile.href}
                            className="block p-5 transition-colors h-full"
                            style={{
                              border: `0.5px solid ${snapshot.isDragging ? 'var(--brand)' : t.border}`,
                              background: t.cardBg || 'transparent',
                              borderRadius: 'var(--radius)',
                              boxShadow: snapshot.isDragging ? '0 12px 32px rgba(0,0,0,0.35)' : 'none',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <Icon size={15} color="var(--brand)" />
                              {data?.trend && <TrendBadge change={data.trend} t={t} />}
                            </div>
                            {data?.value !== undefined && (
                              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: t.value || t.text, lineHeight: 1, letterSpacing: '0.04em' }}>
                                {data.value}
                              </p>
                            )}
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: data?.value !== undefined ? '6px' : 0 }}>
                              {tile.label}
                            </p>
                            {data?.value === undefined && (
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '4px', opacity: 0.7 }}>
                                PRZEJDŹ →
                              </p>
                            )}
                            {data?.sub && (
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', opacity: 0.85 }}>
                                {data.sub}
                              </p>
                            )}
                          </Link>
                          {tiles.length > 1 && (
                            <span
                              {...dragProvided.dragHandleProps}
                              title="Przeciągnij, aby zmienić kolejność"
                              style={{ position: 'absolute', bottom: '2px', right: '2px', padding: '6px', display: 'flex', cursor: 'grab', color: t.muted, opacity: 0.45, borderRadius: 'var(--radius)', touchAction: 'none' }}
                            >
                              <GripVertical size={14} />
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditing(false)}>
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
            style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, padding: '28px', borderRadius: 'var(--radius)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>PULPIT</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.text, letterSpacing: '0.04em', lineHeight: 1 }}>Przypięte kafle</h3>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
            </div>
            <PinnedTilesSettings role={role} userEmail={userEmail} t={t} />
            <div className="pt-5 mt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button
                onClick={() => { setEditing(false); setVersion(v => v + 1); }}
                className="btn-oxblood w-full"
                style={{ fontSize: '10px' }}
              >
                GOTOWE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}