import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Pull-to-refresh wrapper for touch devices (mobile/tablet).
 * Wraps the scrollable content area; when the user is at the top and pulls
 * down past `threshold`, `onRefresh` fires (defaults to a full page reload).
 * No-op on desktop / non-touch devices.
 */
export default function PullToRefresh({ onRefresh, className, style, children, threshold = 75 }) {
  const scrollRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    // The panel layouts scroll on the window/document, not always on `el`
    // itself — so detect the real scroll position whichever element scrolls.
    const getScrollTop = () => {
      if (el.scrollHeight > el.clientHeight) return el.scrollTop;
      return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };
    const onStart = (e) => {
      if (refreshingRef.current) return;
      if (getScrollTop() <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
        pullRef.current = 0;
      } else {
        pulling.current = false;
      }
    };
    const onMove = (e) => {
      if (!pulling.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && getScrollTop() <= 0) {
        const resisted = Math.min(dy * 0.5, threshold * 1.6);
        pullRef.current = resisted;
        setPull(resisted);
        if (dy > 4) e.preventDefault();
      } else if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        pulling.current = false;
      }
    };
    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullRef.current >= threshold) {
        setRefreshing(true);
        refreshingRef.current = true;
        setPull(threshold);
        const fn = cbRef.current || (() => window.location.reload());
        Promise.resolve(fn())
          .then(() => { setRefreshing(false); refreshingRef.current = false; setPull(0); pullRef.current = 0; })
          .catch(() => { setRefreshing(false); refreshingRef.current = false; setPull(0); pullRef.current = 0; });
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [threshold]);

  return (
    <div ref={scrollRef} className={className} style={style}>
      <div
        style={{
          height: pull,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          transition: pulling.current ? 'none' : 'height 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <Loader2
          size={22}
          className={refreshing ? 'animate-spin' : ''}
          style={{
            color: 'var(--brand)',
            marginBottom: 10,
            opacity: pull > 0 ? Math.min(pull / threshold, 1) : 0,
            transform: `rotate(${pull * 4}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}