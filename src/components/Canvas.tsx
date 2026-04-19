import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { StickyNote } from '../types';
import { StickyNoteCard } from './StickyNoteCard';
import { getHiddenIds } from '../layout';

interface Props {
  notes: StickyNote[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddNote: (x: number, y: number) => void;
  onMoveNote: (id: string, x: number, y: number) => void;
  onAttach: (childId: string, parentId: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDetach: (id: string) => void;
  onAsk: (id: string, question: string) => void;
  onOpenChain: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onAutoLayout: (sizes: Map<string, { w: number; h: number }>) => void;
  devMode: boolean;
  measureRef?: React.MutableRefObject<(() => Map<string, { w: number; h: number }>) | null>;
}

const STICKY_W = 220;
const STICKY_H_ESTIMATE = 160;
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export function Canvas({
  notes,
  selectedId,
  onSelect,
  onAddNote,
  onMoveNote,
  onAttach,
  onDelete,
  onDuplicate,
  onDetach,
  onAsk,
  onOpenChain,
  onToggleCollapse,
  onAutoLayout,
  devMode,
  measureRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const dragRef = useRef<
    | { kind: 'note'; id: string; offsetX: number; offsetY: number }
    | { kind: 'pan'; startClientX: number; startClientY: number; startTx: number; startTy: number }
    | null
  >(null);

  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  const hiddenIds = useMemo(() => getHiddenIds(notes), [notes]);
  const childCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) {
      if (n.parentId) m.set(n.parentId, (m.get(n.parentId) ?? 0) + 1);
    }
    return m;
  }, [notes]);
  const descendantCountById = useMemo(() => {
    const byParent = new Map<string, string[]>();
    for (const n of notes) {
      if (n.parentId) {
        const arr = byParent.get(n.parentId) ?? [];
        arr.push(n.id);
        byParent.set(n.parentId, arr);
      }
    }
    const memo = new Map<string, number>();
    const count = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      const kids = byParent.get(id) ?? [];
      let total = kids.length;
      for (const k of kids) total += count(k);
      memo.set(id, total);
      return total;
    };
    for (const n of notes) count(n.id);
    return memo;
  }, [notes]);

  const visibleNotes = useMemo(
    () => notes.filter((n) => !hiddenIds.has(n.id)),
    [notes, hiddenIds]
  );

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.x) / t.scale,
      y: (clientY - rect.top - t.y) / t.scale,
    };
  }, []);

  const handleNotePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const p = screenToCanvas(e.clientX, e.clientY);
      dragRef.current = {
        kind: 'note',
        id,
        offsetX: p.x - note.x,
        offsetY: p.y - note.y,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [notes, screenToCanvas]
  );

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== wrapRef.current) return;
    const t = transformRef.current;
    dragRef.current = {
      kind: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: t.x,
      startTy: t.y,
    };
    setPanning(true);
    wrapRef.current?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !wrapRef.current) return;

      if (drag.kind === 'pan') {
        setTransform((prev) => ({
          ...prev,
          x: drag.startTx + (e.clientX - drag.startClientX),
          y: drag.startTy + (e.clientY - drag.startClientY),
        }));
        return;
      }

      const p = screenToCanvas(e.clientX, e.clientY);
      const newX = p.x - drag.offsetX;
      const newY = p.y - drag.offsetY;
      onMoveNote(drag.id, newX, newY);

      const draggingId = drag.id;
      const center = { x: newX + STICKY_W / 2, y: newY + STICKY_H_ESTIMATE / 2 };
      let foundTarget: string | null = null;
      for (const n of notes) {
        if (n.id === draggingId) continue;
        if (isDescendant(notes, n.id, draggingId)) continue;
        const overlap =
          center.x > n.x &&
          center.x < n.x + STICKY_W &&
          center.y > n.y &&
          center.y < n.y + STICKY_H_ESTIMATE;
        if (overlap) {
          foundTarget = n.id;
          break;
        }
      }
      setDropTargetId(foundTarget);
    },
    [notes, onMoveNote, screenToCanvas]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag && drag.kind === 'note' && dropTargetId) {
      onAttach(drag.id, dropTargetId);
    }
    dragRef.current = null;
    setDropTargetId(null);
    setPanning(false);
  }, [dropTargetId, onAttach]);

  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== wrapRef.current) return;
    const p = screenToCanvas(e.clientX, e.clientY);
    onAddNote(p.x - STICKY_W / 2, p.y - 40);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === wrapRef.current) {
      onSelect(null);
    }
  };

  const zoomAround = useCallback((clientX: number, clientY: number, factor: number) => {
    setTransform((prev) => {
      const rect = wrapRef.current!.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
      const ratio = newScale / prev.scale;
      return {
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, []);

  // Wheel zoom — attached via native listener so we can preventDefault.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
      }
      const factor = Math.pow(1.0015, -e.deltaY);
      zoomAround(e.clientX, e.clientY, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  const zoomButton = (factor: number) => () => {
    const rect = wrapRef.current!.getBoundingClientRect();
    zoomAround(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  const measureSizes = useCallback((): Map<string, { w: number; h: number }> => {
    const out = new Map<string, { w: number; h: number }>();
    const el = wrapRef.current;
    if (!el) return out;
    const scale = transformRef.current.scale || 1;
    el
      .querySelectorAll<HTMLElement>('[data-note-id]')
      .forEach((node) => {
        const id = node.dataset.noteId;
        if (!id) return;
        const rect = node.getBoundingClientRect();
        out.set(id, { w: rect.width / scale, h: rect.height / scale });
      });
    return out;
  }, []);

  useEffect(() => {
    if (!measureRef) return;
    measureRef.current = measureSizes;
    return () => {
      if (measureRef) measureRef.current = null;
    };
  }, [measureRef, measureSizes]);

  return (
    <div
      className={'canvas-wrap' + (panning ? ' panning' : '')}
      ref={wrapRef}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleBackgroundDoubleClick}
      onClick={handleBackgroundClick}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
      }}
    >
      <div
        className="canvas-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        }}
      >
        <svg
          className="connections"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          width="10000"
          height="10000"
          overflow="visible"
        >
          {notes
            .filter((n) => n.parentId && !hiddenIds.has(n.id) && !hiddenIds.has(n.parentId!))
            .map((n) => {
              const parent = notes.find((p) => p.id === n.parentId);
              if (!parent) return null;
              const x1 = parent.x + STICKY_W / 2;
              const y1 = parent.y + STICKY_H_ESTIMATE / 2;
              const x2 = n.x + STICKY_W / 2;
              const y2 = n.y + STICKY_H_ESTIMATE / 2;
              return (
                <line
                  key={n.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
              );
            })}
        </svg>

        {visibleNotes.map((n) => (
          <StickyNoteCard
            key={n.id}
            note={n}
            selected={selectedId === n.id}
            dropTarget={dropTargetId === n.id}
            hasChildren={(childCountById.get(n.id) ?? 0) > 0}
            hiddenDescendantCount={descendantCountById.get(n.id) ?? 0}
            onPointerDown={handleNotePointerDown}
            onSelect={onSelect}
            onOpenChain={onOpenChain}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onDetach={onDetach}
            onAsk={onAsk}
            onToggleCollapse={onToggleCollapse}
            devMode={devMode}
          />
        ))}
      </div>

      <div className="zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button className="zoom-btn" title="Zoom out" onClick={zoomButton(1 / 1.2)}>
          −
        </button>
        <div className="zoom-readout">{Math.round(transform.scale * 100)}%</div>
        <button className="zoom-btn" title="Zoom in" onClick={zoomButton(1.2)}>
          +
        </button>
        <button className="zoom-btn small" title="Reset view" onClick={resetView}>
          Reset
        </button>
      </div>

      <div className="canvas-hint">
        <strong>Canvas</strong> · Double-click to add sticky · Drag header to move · Drop onto another to chain ·
        Scroll to zoom · Drag background to pan
      </div>
    </div>
  );
}

function isDescendant(notes: StickyNote[], candidateId: string, ancestorId: string): boolean {
  let cur: string | null = candidateId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) return false;
    seen.add(cur);
    if (cur === ancestorId) return true;
    const n = notes.find((x) => x.id === cur);
    cur = n?.parentId ?? null;
  }
  return false;
}
