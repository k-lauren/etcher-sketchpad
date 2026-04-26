import { useMemo, useState } from 'react';
import type { StickyNote } from '../types';
import { Markdown } from './Markdown';
import { DocIcon } from './icons';
import {
  MessageSquare,
  Maximize2,
  Minimize2,
  X as XIcon,
  Eye,
  FileText,
  Bot,
  Loader2,
  Send,
  Pin,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Props {
  notes: StickyNote[];
  activeId: string | null;
  onClose: () => void;
  onSend: (parentId: string, question: string) => void;
  sending: boolean;
  devMode: boolean;
  proMode?: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onSelectChat?: (id: string) => void;
  fullscreenDefault?: boolean;
  onToggleFullscreenDefault?: () => void;
  onOpenDocument: (noteId: string) => void;
}

export function Sidebar({
  notes,
  activeId,
  onClose,
  onSend,
  sending,
  devMode,
  proMode = false,
  fullscreen,
  onToggleFullscreen,
  onSelectChat,
  fullscreenDefault = false,
  onToggleFullscreenDefault,
  onOpenDocument,
}: Props) {
  const [draft, setDraft] = useState('');

  const chain = useMemo(() => {
    if (!activeId) return [];
    const out: StickyNote[] = [];
    let curId: string | null = activeId;
    const seen = new Set<string>();
    while (curId) {
      if (seen.has(curId)) break;
      seen.add(curId);
      const n = notes.find((x) => x.id === curId);
      if (!n) break;
      out.unshift(n);
      curId = n.parentId;
    }
    return out;
  }, [notes, activeId]);

  const send = () => {
    const q = draft.trim();
    if (!q || !activeId) return;
    setDraft('');
    onSend(activeId, q);
  };

  const messageCount = chain.filter((n) => n.kind !== 'document').length;
  const showChatList = proMode && fullscreen;

  return (
    <div className={'sidebar' + (proMode ? ' pro' : '') + (fullscreen ? ' fullscreen' : '')}>
      {showChatList && (
        <ChatListPane
          notes={notes}
          activeId={activeId}
          onSelect={(id) => onSelectChat?.(id)}
        />
      )}

      <div className="sidebar-thread">
        <div className="sidebar-header">
          <div className="sidebar-title">
            {proMode && <MessageSquare size={15} className="sidebar-title-icon" />}
            {proMode ? 'Thread view' : 'Chain as chat'}
            {proMode && (
              <span className="sidebar-msg-count">
                {messageCount} {messageCount === 1 ? 'message' : 'messages'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Pin: only meaningful in fullscreen Pro mode. */}
            {proMode && fullscreen && onToggleFullscreenDefault && (
              <button
                className={'icon-btn pin-btn' + (fullscreenDefault ? ' active' : '')}
                onClick={onToggleFullscreenDefault}
                title={
                  fullscreenDefault
                    ? 'Fullscreen is the default — click to unpin'
                    : 'Pin fullscreen as the default'
                }
                aria-label="Pin fullscreen as default"
                aria-pressed={fullscreenDefault}
              >
                <Pin size={15} />
              </button>
            )}
            <button
              className="icon-btn"
              onClick={onToggleFullscreen}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen chat'}
            >
              {proMode ? (
                fullscreen ? (
                  <Minimize2 size={15} />
                ) : (
                  <Maximize2 size={15} />
                )
              ) : fullscreen ? (
                '⤡'
              ) : (
                '⤢'
              )}
            </button>
            <button className="icon-btn" onClick={onClose} title="Close">
              {proMode ? <XIcon size={15} /> : '✕'}
            </button>
          </div>
        </div>

        <div className="chat-log">
          {chain.length === 0 ? (
            <div className="chat-empty">
              {proMode ? (
                <>
                  <Eye size={28} className="chat-empty-icon" />
                  <div>Select a node on the canvas to view its conversation thread here.</div>
                </>
              ) : (
                <>Double-click a sticky note on the canvas, or click 🔍, to view it here.</>
              )}
            </div>
          ) : (
            chain.map((n) => (
              <div key={n.id}>
                {n.kind === 'document' && n.document && (
                  <button
                    type="button"
                    className="chat-msg doc-card"
                    onClick={() => onOpenDocument(n.id)}
                    title="Open document"
                  >
                    {proMode ? (
                      <FileText size={16} className="doc-card-icon" />
                    ) : (
                      <DocIcon size={16} className="doc-card-icon" />
                    )}
                    <span className="doc-card-title">{n.document.title}</span>
                  </button>
                )}
                {n.kind !== 'document' && n.question && (
                  <div className="chat-msg-row user">
                    <div className="chat-msg user">{n.question}</div>
                  </div>
                )}
                {devMode && n.toolCalls && n.toolCalls.length > 0 && (
                  <div className="chat-toolcalls">
                    <div className="dev-toolcalls-title">
                      Tool calls ({n.toolCalls.length})
                    </div>
                    {n.toolCalls.map((tc, i) => (
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
                {(n.answer || n.loading) && (
                  <div className="chat-msg-row assistant">
                    {proMode && (
                      <span className="chat-bot-avatar" aria-hidden="true">
                        <Bot size={14} color="#fff" />
                      </span>
                    )}
                    <div className="chat-msg assistant">
                      {n.loading ? (
                        proMode ? (
                          <span className="chat-thinking">
                            <Loader2 size={14} className="spin" />
                            Thinking...
                          </span>
                        ) : (
                          'Thinking…'
                        )
                      ) : (
                        <Markdown>{n.answer}</Markdown>
                      )}
                    </div>
                  </div>
                )}
                {n.error && (
                  <div className="chat-msg assistant" style={{ color: '#b00020' }}>
                    Error: {n.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {activeId && (
          <div className="chat-composer">
            <textarea
              placeholder={proMode ? 'Continue the thread...' : 'Continue the chain...'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              className="btn-primary"
              disabled={!draft.trim() || sending}
              onClick={send}
              title={proMode ? 'Send' : undefined}
            >
              {proMode ? <Send size={14} /> : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Chat list pane: tree of all Q/A notes, indented by depth, with
   roots sorted most-recent-first (using array order as a recency
   proxy since notes are append-only). Document notes are skipped
   — they're artifacts of a chat, not chats themselves.
   ────────────────────────────────────────────────────────────── */

interface ChatListPaneProps {
  notes: StickyNote[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function ChatListPane({ notes, activeId, onSelect }: ChatListPaneProps) {
  const { roots, childrenByParent, indexOf } = useMemo(() => {
    const indexOf = new Map<string, number>();
    notes.forEach((n, i) => indexOf.set(n.id, i));
    const qaNotes = notes.filter((n) => n.kind !== 'document');
    const childrenByParent = new Map<string, StickyNote[]>();
    for (const n of qaNotes) {
      if (n.parentId) {
        const arr = childrenByParent.get(n.parentId) ?? [];
        arr.push(n);
        childrenByParent.set(n.parentId, arr);
      }
    }
    // Latest-first.
    const byRecencyDesc = (a: StickyNote, b: StickyNote) =>
      (indexOf.get(b.id) ?? 0) - (indexOf.get(a.id) ?? 0);
    for (const arr of childrenByParent.values()) arr.sort(byRecencyDesc);
    const roots = qaNotes.filter((n) => n.parentId === null).sort(byRecencyDesc);
    return { roots, childrenByParent, indexOf };
  }, [notes]);

  // Auto-expand the chain leading to the active note so it's always visible.
  const ancestorIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeId) return ids;
    let cur: string | null = activeId;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      ids.add(cur);
      const n = notes.find((x) => x.id === cur);
      cur = n?.parentId ?? null;
    }
    return ids;
  }, [notes, activeId]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const isCollapsed = (id: string) => collapsed.has(id) && !ancestorIds.has(id);
  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="chat-list-pane" aria-label="All chats">
      <div className="chat-list-header">
        <span>Chats</span>
        <span className="chat-list-count">{indexOf.size > 0 ? roots.length : 0}</span>
      </div>
      <div className="chat-list-scroll">
        {roots.length === 0 ? (
          <div className="chat-list-empty">No chats yet.</div>
        ) : (
          <ul className="chat-list-tree">
            {roots.map((n) => (
              <ChatListItem
                key={n.id}
                note={n}
                depth={0}
                activeId={activeId}
                childrenByParent={childrenByParent}
                isCollapsed={isCollapsed}
                onToggle={toggleCollapsed}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

interface ChatListItemProps {
  note: StickyNote;
  depth: number;
  activeId: string | null;
  childrenByParent: Map<string, StickyNote[]>;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function ChatListItem({
  note,
  depth,
  activeId,
  childrenByParent,
  isCollapsed,
  onToggle,
  onSelect,
}: ChatListItemProps) {
  const kids = childrenByParent.get(note.id) ?? [];
  const collapsed = isCollapsed(note.id);
  const label =
    (note.question?.trim().length ?? 0) > 0
      ? note.question.replace(/\s+/g, ' ').trim()
      : 'Untitled';

  return (
    <li className="chat-list-li">
      <div
        className={'chat-list-row' + (note.id === activeId ? ' active' : '')}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {kids.length > 0 ? (
          <button
            className="chat-list-twist"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(note.id);
            }}
            aria-label={collapsed ? 'Expand subthread' : 'Collapse subthread'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="chat-list-twist chat-list-twist-spacer" aria-hidden="true" />
        )}
        <button
          className="chat-list-label"
          onClick={() => onSelect(note.id)}
          title={label}
        >
          {label}
        </button>
      </div>
      {kids.length > 0 && !collapsed && (
        <ul className="chat-list-tree">
          {kids.map((k) => (
            <ChatListItem
              key={k.id}
              note={k}
              depth={depth + 1}
              activeId={activeId}
              childrenByParent={childrenByParent}
              isCollapsed={isCollapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
