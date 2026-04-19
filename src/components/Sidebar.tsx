import { useMemo, useState } from 'react';
import type { StickyNote } from '../types';
import { Markdown } from './Markdown';

interface Props {
  notes: StickyNote[];
  activeId: string | null;
  onClose: () => void;
  onSend: (parentId: string, question: string) => void;
  sending: boolean;
  devMode: boolean;
}

export function Sidebar({ notes, activeId, onClose, onSend, sending, devMode }: Props) {
  const [draft, setDraft] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

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

  return (
    <div className={'sidebar' + (fullscreen ? ' fullscreen' : '')}>
      <div className="sidebar-header">
        <div className="sidebar-title">Chain as chat</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="icon-btn"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen chat'}
          >
            {fullscreen ? '⤡' : '⤢'}
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="chat-log">
        {chain.length === 0 ? (
          <div className="chat-empty">
            Double-click a sticky note on the canvas, or click 🔍, to view it here.
          </div>
        ) : (
          chain.map((n) => (
            <div key={n.id}>
              {n.kind === 'document' && n.document && (
                <div className="chat-msg doc-card">
                  <span className="doc-viewer-icon">📄</span>
                  <span className="doc-card-title">{n.document.title}</span>
                </div>
              )}
              {n.kind !== 'document' && n.question && (
                <>
                  <div className="chat-msg user">{n.question}</div>
                </>
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
                <>
                  <div className="chat-msg assistant">
                    {n.loading ? 'Thinking…' : <Markdown>{n.answer}</Markdown>}
                  </div>
                </>
              )}
              {n.error && <div className="chat-msg assistant" style={{ color: '#b00020' }}>Error: {n.error}</div>}
            </div>
          ))
        )}
      </div>

      {activeId && (
        <div className="chat-composer">
          <textarea
            placeholder="Continue the chain..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn-primary" disabled={!draft.trim() || sending} onClick={send}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}
