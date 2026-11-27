import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { defaultTiles, MAX_TILES, tileCatalog } from '@/lib/pinnedTiles';

export default function usePinnedTileOrder(role, userEmail, version) {
  const [keys, setKeys] = useState(() => defaultTiles(role));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const recordId = useRef(null);
  const queue = useRef(Promise.resolve());
  const sequence = useRef(0);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    base44.entities.DashboardPinnedTiles.filter({ user_email: userEmail, role }, { limit: 1 })
      .then(({ items }) => {
        if (cancelled) return;
        const record = items[0];
        recordId.current = record?.id || null;
        const catalog = tileCatalog(role);
        setKeys(Array.isArray(record?.tiles)
          ? record.tiles.filter(key => catalog.some(tile => tile.key === key)).slice(0, MAX_TILES)
          : defaultTiles(role));
      })
      .catch(() => { if (!cancelled) setError({ kind: 'load', message: 'Nie udało się wczytać układu kafli.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userEmail, role, version, reload]);

  const save = (next) => {
    setKeys(next);
    if (!userEmail) return;
    const request = ++sequence.current;
    setSaving(true);
    setError(null);
    // Serial writes prevent stale saves and duplicate first-time records.
    const job = queue.current.catch(() => {}).then(async () => {
      if (recordId.current) await base44.entities.DashboardPinnedTiles.update(recordId.current, { tiles: next });
      else {
        const record = await base44.entities.DashboardPinnedTiles.create({ user_email: userEmail, role, tiles: next });
        recordId.current = record.id;
      }
    });
    queue.current = job;
    job.then(() => {
      if (request === sequence.current) { setSaving(false); setError(null); }
    }, () => {
      if (request === sequence.current) {
        setSaving(false);
        setError({ kind: 'save', message: 'Nie udało się zapisać kolejności kafli.' });
      }
    });
  };

  const retry = () => error?.kind === 'load' ? setReload(value => value + 1) : save(keys);
  return { keys, loading, saving, error, save, retry };
}