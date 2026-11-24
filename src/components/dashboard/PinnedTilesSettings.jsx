import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Pin, Loader2 } from 'lucide-react';
import { tileCatalog, defaultTiles, MAX_TILES } from '@/lib/pinnedTiles';

// Wybór przypiętych kafli (maks. 6) — używany w ustawieniach i w oknie edycji z pulpitu.
export default function PinnedTilesSettings({ role, userEmail, t }) {
  const catalog = tileCatalog(role);
  const [keys, setKeys] = useState(defaultTiles(role));
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail, role]);

  const persist = async (next) => {
    setSaving(true);
    try {
      if (recordId) await base44.entities.DashboardPinnedTiles.update(recordId, { tiles: next });
      else {
        const created = await base44.entities.DashboardPinnedTiles.create({ user_email: userEmail, role, tiles: next });
        setRecordId(created.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    setLimitHit(false);
    if (keys.includes(key)) {
      const next = keys.filter(k => k !== key);
      setKeys(next);
      persist(next);
      return;
    }
    if (keys.length >= MAX_TILES) { setLimitHit(true); return; }
    const next = [...keys, key];
    setKeys(next);
    persist(next);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', lineHeight: 1.8 }}>
          Wybierz do {MAX_TILES} kafli — przypięte pojawią się na górze pulpitu. Kliknij, aby przypiąć lub odpiąć.
        </p>
        <span className="flex items-center gap-1.5 shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: keys.length >= MAX_TILES ? 'var(--brand)' : t.muted, letterSpacing: '0.08em' }}>
          {saving ? <Loader2 size={10} className="animate-spin" /> : null}
          {keys.length}/{MAX_TILES}
        </span>
      </div>

      {limitHit && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Limit {MAX_TILES} kafli — odpnij jeden, aby dodać kolejny.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {catalog.map(tile => {
          const Icon = tile.icon;
          const pinned = keys.includes(tile.key);
          return (
            <button
              key={tile.key}
              onClick={() => toggle(tile.key)}
              className="flex items-center gap-3 px-3 py-3 text-left transition-colors"
              style={{
                border: `0.5px solid ${pinned ? 'var(--brand)' : t.border}`,
                background: pinned ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              <Icon size={13} color={pinned ? 'var(--brand)' : t.muted} />
              <span className="flex-1 min-w-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: pinned ? t.text : t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tile.label}
              </span>
              {pinned ? <Check size={12} color="var(--brand)" /> : <Pin size={11} color={t.muted} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}