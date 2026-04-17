import type { LayoutDirection, StickyNote } from './types';

const STICKY_W = 220;
const STICKY_H = 180;
const SIBLING_GAP = 20;
const LEVEL_GAP = 40;
const TREE_GAP = 1; // extra perpendicular units between separate trees
const MARGIN = 60;

/** Return the set of ids whose visibility is suppressed because some ancestor has `collapsed: true`. */
export function getHiddenIds(notes: StickyNote[]): Set<string> {
  const byParent = new Map<string, StickyNote[]>();
  for (const n of notes) {
    if (n.parentId) {
      const arr = byParent.get(n.parentId) ?? [];
      arr.push(n);
      byParent.set(n.parentId, arr);
    }
  }
  const hidden = new Set<string>();
  const stack: string[] = notes.filter((n) => n.collapsed).map((n) => n.id);
  while (stack.length) {
    const cur = stack.pop()!;
    const kids = byParent.get(cur) ?? [];
    for (const k of kids) {
      if (!hidden.has(k.id)) {
        hidden.add(k.id);
        stack.push(k.id);
      }
    }
  }
  return hidden;
}

/**
 * Lay out all notes as trees, one per root.
 * - vertical: roots at top; children below; siblings spread horizontally.
 * - horizontal: roots at left; children to the right; siblings spread vertically.
 */
export function autoLayout(
  notes: StickyNote[],
  direction: LayoutDirection = 'vertical'
): StickyNote[] {
  const byParent = new Map<string, StickyNote[]>();
  const roots: StickyNote[] = [];
  for (const n of notes) {
    if (n.parentId === null) {
      roots.push(n);
    } else {
      const arr = byParent.get(n.parentId) ?? [];
      arr.push(n);
      byParent.set(n.parentId, arr);
    }
  }

  const isVertical = direction === 'vertical';
  // stepPerp: between siblings (perpendicular to growth axis)
  // stepDepth: between parent and child levels (along growth axis)
  const stepPerp = (isVertical ? STICKY_W : STICKY_H) + SIBLING_GAP;
  const stepDepth = (isVertical ? STICKY_H : STICKY_W) + LEVEL_GAP;

  const positions = new Map<string, { x: number; y: number }>();
  let nextPerp = 0;

  const layoutSubtree = (
    id: string,
    depth: number
  ): { start: number; end: number } => {
    const kids = byParent.get(id) ?? [];
    if (kids.length === 0) {
      const p = nextPerp++;
      positions.set(
        id,
        isVertical
          ? { x: p * stepPerp, y: depth * stepDepth }
          : { x: depth * stepDepth, y: p * stepPerp }
      );
      return { start: p, end: p };
    }
    let start = Infinity;
    let end = -Infinity;
    for (const k of kids) {
      const r = layoutSubtree(k.id, depth + 1);
      if (r.start < start) start = r.start;
      if (r.end > end) end = r.end;
    }
    const mid = (start + end) / 2;
    positions.set(
      id,
      isVertical
        ? { x: mid * stepPerp, y: depth * stepDepth }
        : { x: depth * stepDepth, y: mid * stepPerp }
    );
    return { start, end };
  };

  for (const r of roots) {
    layoutSubtree(r.id, 0);
    nextPerp += TREE_GAP;
  }

  return notes.map((n) => {
    const p = positions.get(n.id);
    if (!p) return n;
    return { ...n, x: p.x + MARGIN, y: p.y + MARGIN };
  });
}
