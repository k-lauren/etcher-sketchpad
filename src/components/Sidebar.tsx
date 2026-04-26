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

  return (
    <div className={'sidebar' + (proMode ? ' pro' : '') + (fullscreen ? ' fullscreen' : '')}>
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
  );
}
