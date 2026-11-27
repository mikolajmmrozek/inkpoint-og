// Frozen, grid-relative slots keep the destination stable while cards reflow.
export function moveTile(keys, key, index) {
  const next = keys.filter(item => item !== key);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, key);
  return next;
}

export function tileSlotAt(slots, x, y) {
  const rows = [];
  slots.forEach((slot, index) => {
    let row = rows.find(item => Math.abs(item.top - slot.top) < 2);
    if (!row) { row = { top: slot.top, center: slot.top + slot.height / 2, slots: [] }; rows.push(row); }
    row.slots.push({ index, center: slot.left + slot.width / 2 });
  });
  const row = rows.reduce((best, item) => Math.abs(item.center - y) < Math.abs(best.center - y) ? item : best);
  return row.slots.reduce((best, item) => Math.abs(item.center - x) < Math.abs(best.center - x) ? item : best).index;
}

export function tileScrollContainer(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement;
}