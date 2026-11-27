import { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { tileCatalog } from '@/lib/pinnedTiles';
import usePinnedTileOrder from '@/hooks/usePinnedTileOrder';
import PinnedTilesGrid from '@/components/dashboard/PinnedTilesGrid';
import PinnedTilesSettings from './PinnedTilesSettings';

// Przypięte kafle pulpitu (maks. 8): wartości, trendy i krótkie opisy pod nimi.
// values: { [klucz]: { value, trend, sub } }
export default function PinnedTiles({ role, userEmail, values = {}, t, theme, onKeysChange }) {
  const catalog = tileCatalog(role);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const { keys, loading, saving, error, save, retry } = usePinnedTileOrder(role, userEmail, version);

  useEffect(() => { onKeysChange?.(keys); }, [keys, onKeysChange]);
  const tiles = keys.map(key => catalog.find(tile => tile.key === key)).filter(Boolean);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          PRZYPIĘTE
        </p>
        <button
          onClick={() => setEditing(true)}
          disabled={loading || saving || Boolean(error)}
          title="Edytuj przypięte kafle"
          className="flex items-center gap-1.5 disabled:opacity-50"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <Pencil size={11} /> EDYTUJ
        </button>
      </div>

      {saving && <p role="status" className="font-mono text-[10px] mb-2" style={{ color: t.muted }}>Zapisywanie kolejności…</p>}
      {error && (
        <p role="alert" className="font-mono text-[10px] mb-3 text-oxblood">
          {error.message} <button type="button" onClick={retry} className="underline">Spróbuj ponownie</button>
        </p>
      )}
      {loading ? (
        <div role="status" aria-label="Wczytywanie kafli" className="flex justify-center py-10"><div className="w-8 h-px bg-oxblood animate-pulse" /></div>
      ) : error?.kind === 'load' ? null : tiles.length === 0 ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full py-6 text-center"
          style={{ border: `0.5px dashed ${t.border}`, background: 'transparent', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          + PRZYPNIJ KAFLE
        </button>
      ) : (
        <PinnedTilesGrid tiles={tiles} values={values} t={t} onReorder={save} />
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