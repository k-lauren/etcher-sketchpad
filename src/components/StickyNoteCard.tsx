import { useState, useRef, useEffect } from 'react';
import type { StickyNote } from '../types';
import { Markdown } from './Markdown';
import { DocIcon } from './icons';
import {
  Eye,
  Copy,
  Scissors,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  GitBranch,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';

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
  devMode: boolean;
  proMode?: boolean;
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
  devMode,
  proMode = false,
}: Props) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(!note.question);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const isChild = note.parentId !== null;
  const isDoc = note.kind === 'document';

  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft('');
    setEditing(false);
    onAsk(note.id, q);
  };

  /* ───────── Document card ───────── */
  if (isDoc) {
    return (
      <div
        data-note-id={note.id}
        className={
          'sticky doc' +
          (proMode ? ' pro' : '') +
          (selected ? ' selected' : '') +
          (dropTarget ? ' drop-target' : '')
        }
        style={{ left: note.x, top: note.y }}
        onPointerDown={() => onSelect(note.id)}
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
            {proMode ? (
              <FileText size={13} className="inline-icon" />
            ) : (
              <DocIcon size={12} className="inline-icon" />
            )}
            {proMode ? 'Document' : 'document'}
          </span>
          <div className="sticky-actions" onPointerDown={(e) => e.stopPropagation()}>
            <ActionBtn
              proMode={proMode}
              title="Open document"
              onClick={() => onOpenChain(note.id)}
              proIcon={<Eye size={14} />}
              classicGlyph="🔍"
            />
            <ActionBtn
              proMode={proMode}
              title="Duplicate"
              onClick={() => onDuplicate(note.id)}
              proIcon={<Copy size={14} />}
              classicGlyph="⎘"
            />
            {isChild && (
              <ActionBtn
                proMode={proMode}
                title="Detach from parent"
                onClick={() => onDetach(note.id)}
                proIcon={<Scissors size={14} />}
                classicGlyph="✂"
              />
            )}
            <ActionBtn
              proMode={proMode}
              title="Delete"
              onClick={() => onDelete(note.id)}
              proIcon={<Trash2 size={14} />}
              classicGlyph="✕"
            />
          </div>
        </div>
        <div className="doc-title">
          {proMode && <FileText size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
          {note.document?.title ?? 'Untitled document'}
        </div>
        <div className="doc-hint">
          {proMode ? 'Double-click to preview' : 'Double-click to open'}
        </div>
      </div>
    );
  }

  /* ───────── Q/A card ───────── */
  return (
    <div
      data-note-id={note.id}
      className={
        'sticky' +
        (proMode ? ' pro' : '') +
        (isChild ? ' child' : '') +
        (selected ? ' selected' : '') +
        (dropTarget ? ' drop-target' : '')
      }
      style={{ left: note.x, top: note.y }}
      onPointerDown={() => {
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
          {proMode ? (
            <>
              {isChild ? (
                <GitBranch
                  size={13}
                  className="inline-icon"
                  style={{ transform: 'rotate(180deg)' }}
                />
              ) : (
                <MessageSquare size={13} className="inline-icon" />
              )}
              {isChild ? 'Chained' : 'Root'}
            </>
          ) : isChild ? (
            '↳ chained'
          ) : (
            'root'
          )}
          {note.collapsed && hiddenDescendantCount > 0 && (
            <span className="sticky-collapsed-count">
              {' '}
              · {proMode ? 'collapsed' : `+${hiddenDescendantCount} hidden`}
            </span>
          )}
        </span>
        <div className="sticky-actions" onPointerDown={(e) => e.stopPropagation()}>
          {hasChildren && (
            <ActionBtn
              proMode={proMode}
              title={note.collapsed ? 'Expand children' : 'Collapse children'}
              onClick={() => onToggleCollapse(note.id)}
              proIcon={
                note.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
              }
              classicGlyph={note.collapsed ? '▸' : '▾'}
            />
          )}
          <ActionBtn
            proMode={proMode}
            title="Open chain in sidebar"
            onClick={() => onOpenChain(note.id)}
            proIcon={<Eye size={14} />}
            classicGlyph="🔍"
          />
          <ActionBtn
            proMode={proMode}
            title="Duplicate"
            onClick={() => onDuplicate(note.id)}
            proIcon={<Copy size={14} />}
            classicGlyph="⎘"
          />
          {isChild && (
            <ActionBtn
              proMode={proMode}
              title="Detach from parent"
              onClick={() => onDetach(note.id)}
              proIcon={<Scissors size={14} />}
              classicGlyph="✂"
            />
          )}
          <ActionBtn
            proMode={proMode}
            title="Delete"
            onClick={() => onDelete(note.id)}
            proIcon={<Trash2 size={14} />}
            classicGlyph="✕"
          />
        </div>
      </div>

      {!editing && note.question ? (
        <div className="sticky-q" onClick={(e) => e.stopPropagation()}>
          {!proMode && 'Q: '}
          {note.question}
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
          {note.loading ? (
            proMode ? (
              <span className="sticky-a-loading">
                <Loader2 size={14} className="spin" />
                Generating response...
              </span>
            ) : (
              'Thinking…'
            )
          ) : note.answer ? (
            <Markdown>{note.answer}</Markdown>
          ) : proMode ? (
            'No response yet'
          ) : (
            'No answer yet'
          )}
        </div>
      )}

      {devMode && note.toolCalls && note.toolCalls.length > 0 && (
        <div className="dev-toolcalls" onClick={(e) => e.stopPropagation()}>
          <div className="dev-toolcalls-title">
            Tool calls ({note.toolCalls.length})
          </div>
          {note.toolCalls.map((tc, i) => (
            <details key={i} className="dev-toolcall">
              <summary>
                <span className="dev-toolcall-name">{tc.name}</span>
                <span className="dev-toolcall-iter">#{tc.iteration}</span>
              </summary>
              <div className="dev-toolcall-section">
                <div className="dev-toolcall-label">args</div>
                <pre className="dev-toolcall-body">
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              </div>
              <div className="dev-toolcall-section">
                <div className="dev-toolcall-label">result</div>
                <pre className="dev-toolcall-body">{tc.result}</pre>
              </div>
            </details>
          ))}
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
            {proMode && <Send size={12} />}
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

/* Small helper that swaps a Lucide icon (Pro) for an emoji glyph (Classic). */
function ActionBtn({
  proMode,
  title,
  onClick,
  proIcon,
  classicGlyph,
}: {
  proMode: boolean;
  title: string;
  onClick: () => void;
  proIcon: React.ReactNode;
  classicGlyph: string;
}) {
  return (
    <button
      className="icon-btn"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {proMode ? proIcon : classicGlyph}
    </button>
  );
}
