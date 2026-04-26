import { useEffect, useRef, useState } from 'react';
import { Plus, ChevronDown, Check, Pencil, Trash2 } from 'lucide-react';

interface CanvasSummary {
  id: string;
  name: string;
}

interface Props {
  canvases: CanvasSummary[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename?: (id: string, name: string) => void;
  /** Omit to hide the delete affordance (e.g. when only one canvas remains). */
  onDelete?: (id: string) => void;
}

/**
 * Top-left canvas switcher.
 *
 * One canvas → renders a single "Add Canvas" pill button that creates a new one.
 * Multiple canvases → renders a "Your Canvases" trigger that opens a dropdown
 * listing all canvases (active one checked) with a blue "Add Canvas" affordance
 * pinned to the bottom of the menu.
 *
 * Each row in the menu also carries (on hover) rename + delete inline actions
 * so the user can manage their set without leaving the canvas surface.
 */
export function CanvasSwitcher({
  canvases,
  activeId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setRenaming(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const startRename = (c: CanvasSummary) => {
    setRenaming(c.id);
    setRenameDraft(c.name);
  };
  const commitRename = () => {
    if (renaming && renameDraft.trim() && onRename) {
      onRename(renaming, renameDraft.trim());
    }
    setRenaming(null);
  };

  // Single-canvas state: just the "Add Canvas" pill.
  if (canvases.length <= 1) {
    return (
      <button className="canvas-switcher-add" onClick={onCreate}>
        <Plus size={14} />
        Add Canvas
      </button>
    );
  }

  return (
    <div className="canvas-switcher" ref={wrapRef}>
      <button
        className={'canvas-switcher-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Your Canvases
        <ChevronDown
          size={14}
          className={'canvas-switcher-caret' + (open ? ' open' : '')}
        />
      </button>
      {open && (
        <div className="canvas-switcher-menu" role="menu">
          {canvases.map((c) => {
            const isActive = c.id === activeId;
            const isRenaming = renaming === c.id;
            return (
              <div
                key={c.id}
                className={'canvas-switcher-row' + (isActive ? ' active' : '')}
              >
                <span className="canvas-switcher-check" aria-hidden="true">
                  {isActive && <Check size={14} />}
                </span>
                {isRenaming ? (
                  <input
                    className="canvas-switcher-rename-input"
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenaming(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    className="canvas-switcher-name"
                    onClick={() => {
                      onSwitch(c.id);
                      setOpen(false);
                    }}
                    onDoubleClick={() => onRename && startRename(c)}
                    role="menuitem"
                    title={c.name}
                  >
                    {c.name}
                  </button>
                )}
                <div className="canvas-switcher-row-actions">
                  {onRename && !isRenaming && (
                    <button
                      className="canvas-switcher-row-btn"
                      title="Rename"
                      aria-label={`Rename ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(c);
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {onDelete && !isRenaming && (
                    <button
                      className="canvas-switcher-row-btn danger"
                      title="Delete canvas"
                      aria-label={`Delete ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Delete "${c.name}"? This will discard the canvas's notes and threads.`
                          )
                        ) {
                          onDelete(c.id);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="canvas-switcher-divider" />
          <button
            className="canvas-switcher-add-bottom"
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
            role="menuitem"
          >
            <Plus size={14} />
            Add Canvas
          </button>
        </div>
      )}
    </div>
  );
}
