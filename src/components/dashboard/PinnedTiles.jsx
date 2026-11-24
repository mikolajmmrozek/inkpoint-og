import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
import TrendBadge from '@/components/stats/TrendBadge';
import { tileCatalog, defaultTiles, MAX_TILES } from '@/lib/pinnedTiles';
import PinnedTilesSettings from './PinnedTilesSettings';

// Przypięte kafle pulpitu: skróty oraz podstawowe wartości z trendami.
// values: { [klucz]: { value, trend, sub } }
export default function PinnedTiles({ role, userEmail, values = {}, t, theme, onKeysChange }) {
  const catalog = tileCatalog(role);
  const [keys, setKeys] = useState(defaultTiles(role));
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);

  // Rodzic potrzebuje listy przypiętych kluczy, żeby nie powtarzać tych samych
  // wskaźników w sekcji poniżej.
  useEffect(() => { onKeysChange?.(keys); }, [keys]);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.DashboardPinnedTiles.filter({ user_email: userEmail, role })
      .then(list => {
        const rec = list[0];
        if (rec && Array.isArray(rec.tiles) && rec.tiles.length > 0) {
          setKeys(rec.tiles.filter(k => catalog.some(tile => tile.key === k)).slice(0, MAX_TILES));
        }
      })
      .catch(() => {});
  }, [userEmail, role, version]);

  const tiles = keys.map(key => catalog.find(tile => tile.key === key)).filter(Boolean);
  const cols = tiles.length <= 2 ? tiles.length || 1 : tiles.length === 3 ? 3 : 4;

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
        <div className={`grid gap-3 ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {tiles.map(tile => {
            const Icon = tile.icon;
            const data = values[tile.key];
            return (
              <Link
                key={tile.key}
                to={tile.href}
                className="block p-5 transition-colors"
                style={{ border: `0.5px solid ${t.border}`, background: t.cardBg || 'transparent', borderRadius: 'var(--radius)' }}
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
                {data?.sub && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', opacity: 0.85 }}>
                    {data.sub}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
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