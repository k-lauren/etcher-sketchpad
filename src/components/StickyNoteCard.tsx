import { useState, useRef, useEffect } from 'react';
import type { StickyNote } from '../types';

interface Props {
  note: StickyNote;
  selected: boolean;
  dropTarget: boolean;
  hasChildren: boolean;
  hiddenDescendantCount: number;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onSelect: (id: string) => void;
  onOpenChain: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDetach: (id: string) => void;
  onAsk: (id: string, question: string) => void;
  onToggleCollapse: (id: string) => void;
}

export function StickyNoteCard({
  note,
  selected,
  dropTarget,
  hasChildren,
  hiddenDescendantCount,
  onPointerDown,
  onSelect,
  onOpenChain,
  onDelete,
  onDuplicate,
  onDetach,
  onAsk,
  onToggleCollapse,
}: Props) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(!note.question);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const isChild = note.parentId !== null;

  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft('');
    setEditing(false);
    onAsk(note.id, q);
  };

  return (
    <div
      className={
        'sticky' +
        (isChild ? ' child' : '') +
        (selected ? ' selected' : '') +
        (dropTarget ? ' drop-target' : '')
      }
      style={{ left: note.x, top: note.y }}
      onPointerDown={(e) => {
        onSelect(note.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpenChain(note.id);
      }}
    >
      <div
        className="sticky-header"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(note.id);
          onPointerDown(e, note.id);
        }}
      >
        <span className="sticky-chain-badge">
          {isChild ? '↳ chained' : 'root'}
          {note.collapsed && hiddenDescendantCount > 0 && (
            <span className="sticky-collapsed-count"> · +{hiddenDescendantCount} hidden</span>
          )}
        </span>
        <div className="sticky-actions" onPointerDown={(e) => e.stopPropagation()}>
          {hasChildren && (
            <button
              className="icon-btn"
              title={note.collapsed ? 'Expand children' : 'Collapse children'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(note.id);
              }}
            >
              {note.collapsed ? '▸' : '▾'}
            </button>
          )}
          <button
            className="icon-btn"
            title="Open chain in sidebar"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChain(note.id);
            }}
          >
            🔍
          </button>
          <button
            className="icon-btn"
            title="Duplicate"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(note.id);
            }}
          >
            ⎘
          </button>
          {isChild && (
            <button
              className="icon-btn"
              title="Detach from parent"
              onClick={(e) => {
                e.stopPropagation();
                onDetach(note.id);
              }}
            >
              ✂
            </button>
          )}
          <button
            className="icon-btn"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!editing && note.question ? (
        <div className="sticky-q" onClick={(e) => e.stopPropagation()}>
          Q: {note.question}
        </div>
      ) : (
        <textarea
          ref={taRef}
          className="sticky-input"
          placeholder="Ask a question..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
      )}

      {!editing && note.question && (
        <div
          className={'sticky-a' + (note.answer ? '' : ' empty')}
          onClick={(e) => e.stopPropagation()}
        >
          {note.loading ? 'Thinking…' : note.answer || 'No answer yet'}
        </div>
      )}

      {note.error && <div className="sticky-error">{note.error}</div>}

      {editing && (
        <div className="sticky-footer" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              if (note.question) setEditing(false);
              else onDelete(note.id);
            }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!draft.trim()}
            onClick={(e) => {
              e.stopPropagation();
              send();
            }}
          >
            Ask
          </button>
        </div>
      )}

      {!editing && note.question && !note.loading && (
        <div className="sticky-footer" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(note.question);
              setEditing(true);
            }}
          >
            Re-ask
          </button>
        </div>
      )}
    </div>
  );
}
