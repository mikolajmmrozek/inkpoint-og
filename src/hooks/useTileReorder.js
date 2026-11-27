import { useCallback, useEffect, useRef, useState } from 'react';
import { moveTile, tileScrollContainer, tileSlotAt } from '@/lib/tileReorder';

export default function useTileReorder(keys, onReorder) {
  const gridRef = useRef(null);
  const session = useRef(null);
  const [drag, setDrag] = useState(null);
  const [message, setMessage] = useState('');

  const cancel = useCallback(() => {
    const current = session.current;
    session.current = null;
    setDrag(null);
    if (current && gridRef.current?.hasPointerCapture(current.pointerId)) gridRef.current.releasePointerCapture(current.pointerId);
  }, []);

  const update = useCallback((x, y) => {
    const current = session.current;
    if (!current || !gridRef.current) return;
    current.x = x; current.y = y;
    if (!current.active && Math.hypot(x - current.startX, y - current.startY) < 5) return;
    current.active = true;
    const bounds = gridRef.current.getBoundingClientRect();
    const left = x - current.offsetX, top = y - current.offsetY;
    const centerX = left + current.width / 2 - bounds.left;
    const centerY = top + current.height / 2 - bounds.top;
    current.inside = centerX >= -12 && centerX <= bounds.width + 12 && centerY >= -12 && centerY <= bounds.height + 12;
    current.index = tileSlotAt(current.slots, centerX, centerY);
    current.next = moveTile(current.original, current.key, current.index);
    setDrag({ key: current.key, left, top, width: current.width, height: current.height, order: current.next, index: current.index, inside: current.inside });
  }, []);

  const start = (event, key) => {
    if (keys.length < 2 || session.current || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    const grid = gridRef.current;
    const bounds = grid.getBoundingClientRect();
    const elements = [...grid.querySelectorAll('[data-tile-key]')];
    const rect = elements.find(element => element.dataset.tileKey === key).getBoundingClientRect();
    session.current = {
      key, pointerId: event.pointerId, original: [...keys], next: [...keys], active: false,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, width: rect.width, height: rect.height,
      scroll: tileScrollContainer(grid),
      slots: elements.map(element => { const item = element.getBoundingClientRect(); return { left: item.left - bounds.left, top: item.top - bounds.top, width: item.width, height: item.height }; }),
    };
    // Capture on the stable grid, not a handle that moves between grid cells.
    grid.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== session.current?.pointerId) return;
    event.preventDefault(); update(event.clientX, event.clientY);
  };
  const onPointerUp = (event) => {
    if (event.pointerId !== session.current?.pointerId) return;
    update(event.clientX, event.clientY);
    const current = session.current;
    if (current.active && current.inside && current.next.some((key, index) => key !== current.original[index])) {
      onReorder(current.next);
      setMessage(`Zmieniono kolejność. Pozycja ${current.index + 1} z ${keys.length}.`);
    }
    cancel();
  };

  const onKeyDown = (event, key) => {
    const columns = getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').filter(Boolean).length;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (!(event.key in steps)) return;
    event.preventDefault(); event.stopPropagation();
    if (session.current) return;
    const index = keys.indexOf(key) + steps[event.key];
    if (index < 0 || index >= keys.length) return;
    onReorder(moveTile(keys, key, index));
    setMessage(`Zmieniono kolejność. Pozycja ${index + 1} z ${keys.length}.`);
    requestAnimationFrame(() => [...(gridRef.current?.querySelectorAll('[data-tile-key]') || [])].find(element => element.dataset.tileKey === key)?.querySelector('button')?.focus({ preventScroll: true }));
  };

  const dragging = Boolean(drag);
  useEffect(() => {
    if (!dragging) return;
    let frame;
    const onEscape = event => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } };
    const onScroll = () => { const current = session.current; if (current) update(current.x, current.y); };
    const tick = () => {
      const current = session.current;
      if (!current) return;
      const scroll = current.scroll;
      const bounds = scroll === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroll.getBoundingClientRect();
      const top = Math.max(0, bounds.top), bottom = Math.min(window.innerHeight, bounds.bottom);
      const speed = current.y < top + 48 ? -Math.min(14, (top + 48 - current.y) / 4) : current.y > bottom - 48 ? Math.min(14, (current.y - bottom + 48) / 4) : 0;
      if (speed) { const before = scroll.scrollTop; scroll.scrollTop += speed; if (scroll.scrollTop !== before) update(current.x, current.y); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [dragging, cancel, update]);

  useEffect(() => () => { session.current = null; }, []);
  return { gridRef, drag, message, start, onPointerMove, onPointerUp, cancel, onKeyDown };
}