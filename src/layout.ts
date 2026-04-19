import type { LayoutDirection, StickyNote } from './types';

const DEFAULT_W = 220;
const DEFAULT_H = 180;
const SIBLING_GAP = 20;
const LEVEL_GAP = 40;
const TREE_GAP = 40;
const MARGIN = 60;

export interface SizeMap {
  get(id: string): { w: number; h: number } | undefined;
}

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
 * Spacing uses actual rendered bounding boxes (from `sizes`) so a ballooned
 * sticky pushes its children/siblings clear of its boundary rather than
 * spacing by center distance.
 *
 * - vertical: roots at top; children below; siblings spread horizontally.
 * - horizontal: roots at left; children to the right; siblings spread vertically.
 */
export function autoLayout(
  notes: StickyNote[],
  direction: LayoutDirection = 'vertical',
  sizes?: SizeMap
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
  const sizeOf = (id: string): { w: number; h: number } => {
    const s = sizes?.get(id);
    if (!s) return { w: DEFAULT_W, h: DEFAULT_H };
    return { w: s.w || DEFAULT_W, h: s.h || DEFAULT_H };
  };

  const positions = new Map<string, { x: number; y: number }>();
  let nextPerp = 0;

  const layoutSubtree = (
    id: string,
    alongOrigin: number
  ): { perpStart: number; perpEnd: number } => {
    const size = sizeOf(id);
    const selfPerp = isVertical ? size.w : size.h;
    const selfAlong = isVertical ? size.h : size.w;
    const kids = byParent.get(id) ?? [];

    if (kids.length === 0) {
      const perpStart = nextPerp;
      positions.set(
        id,
        isVertical
          ? { x: perpStart, y: alongOrigin }
          : { x: alongOrigin, y: perpStart }
      );
      nextPerp = perpStart + selfPerp + SIBLING_GAP;
      return { perpStart, perpEnd: perpStart + selfPerp };
    }

    const childAlongOrigin = alongOrigin + selfAlong + LEVEL_GAP;
    let childMin = Infinity;
    let childMax = -Infinity;
    for (const k of kids) {
      const r = layoutSubtree(k.id, childAlongOrigin);
      if (r.perpStart < childMin) childMin = r.perpStart;
      if (r.perpEnd > childMax) childMax = r.perpEnd;
    }
    const childMid = (childMin + childMax) / 2;
    const perpStart = childMid - selfPerp / 2;
    positions.set(
      id,
      isVertical
        ? { x: perpStart, y: alongOrigin }
        : { x: alongOrigin, y: perpStart }
    );
    return {
      perpStart: Math.min(perpStart, childMin),
      perpEnd: Math.max(perpStart + selfPerp, childMax),
    };
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
