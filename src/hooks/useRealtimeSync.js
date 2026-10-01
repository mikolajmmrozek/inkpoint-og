import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Subscribes to realtime create/update/delete events on an entity and invokes
 * `onEvent` (debounced) so the caller can re-fetch its list and keep sorting /
 * filters intact. Re-subscribes whenever `deps` change. Cleanup runs on unmount.
 *
 * @param {string} entityName - e.g. 'Booking', 'ArtistAvailability'
 * @param {(event) => void} onEvent - debounced handler (event shape: { id, type, data })
 * @param {Array} deps - extra deps that should re-trigger the subscription
 */
export function useRealtimeSync(entityName, onEvent, deps = []) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const entity = base44.entities[entityName];
    if (!entity?.subscribe) return;

    let timer = null;
    const unsubscribe = entity.subscribe((event) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        try { cbRef.current(event); } catch (e) { /* swallow — never break the stream */ }
      }, 400);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityName, ...deps]);
}