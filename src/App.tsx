import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, CanvasTransform, ChatMessage, DocumentPayload, StickyNote } from './types';
import { defaultConfig, loadConfig, loadNotes, saveConfig, saveNotes, uid } from './storage';
import { infer } from './api';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { DocViewer, type DocViewerEntry } from './components/DocViewer';
import { autoLayout } from './layout';

type Tab = 'canvas' | 'config';

export default function App() {
  const [tab, setTab] = useState<Tab>('canvas');
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const n = loadNotes();
    if (n.length > 0) return n;
    return [
      { id: uid(), x: 120, y: 120, question: '', answer: '', parentId: null },
    ];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarId, setSidebarId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [docPreview, setDocPreview] = useState<{ noteId: string; open: boolean } | null>(null);
  const [docViewerEntry, setDocViewerEntry] = useState<DocViewerEntry>('default');
  const [sidebarFullscreen, setSidebarFullscreen] = useState(false);
  const [canvasTransform, setCanvasTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const [configOverlayOpen, setConfigOverlayOpen] = useState(false);
  const measureRef = useRef<(() => Map<string, { w: number; h: number }>) | null>(null);

  useEffect(() => { saveNotes(notes); }, [notes]);
  useEffect(() => { saveConfig(config); }, [config]);
  useEffect(() => {
    document.body.classList.toggle('theme-dark', config.theme === 'dark');
  }, [config.theme]);
  // If the user enables overlay mode while on the config tab, pop back to
  // canvas and open the overlay so the preference takes effect immediately.
  useEffect(() => {
    if (config.settingsAsOverlay && tab === 'config') {
      setTab('canvas');
      setConfigOverlayOpen(true);
    }
  }, [config.settingsAsOverlay, tab]);
  useEffect(() => {
    if (!configOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfigOverlayOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [configOverlayOpen]);

  const buildDocNotes = (
    all: StickyNote[],
    parentId: string,
    docs: DocumentPayload[]
  ): StickyNote[] => {
    const parent = all.find((n) => n.id === parentId);
    const baseX = (parent?.x ?? 200) + 260;
    const baseY = (parent?.y ?? 200) + 20;
    return docs.map((doc, i) => ({
      id: uid(),
      x: baseX,
      y: baseY + i * 50,
      question: '',
      answer: '',
      parentId,
      kind: 'document' as const,
      document: doc,
    }));
  };

  // For each parent note id, the document notes attached to it. Used to
  // surface attached document content into the LLM context window.
  const docsByParent = (all: StickyNote[]): Map<string, StickyNote[]> => {
    const m = new Map<string, StickyNote[]>();
    for (const n of all) {
      if (n.kind === 'document' && n.parentId) {
        const arr = m.get(n.parentId) ?? [];
        arr.push(n);
        m.set(n.parentId, arr);
      }
    }
    return m;
  };

  const formatDocForContext = (doc: DocumentPayload): string => {
    const body = doc.source ?? '(document content unavailable)';
    let out = `[Attached document — title: "${doc.title}"]\n\n${body}`;
    if (
      doc.originalSource &&
      doc.source &&
      doc.source !== doc.originalSource
    ) {
      out +=
        `\n\n[Note: the user has edited this document since I generated it. ` +
        `The version above is the current, user-edited version. ` +
        `My original AI-generated version was:]\n\n${doc.originalSource}`;
    }
    return out;
  };

  const chainFor = (id: string): StickyNote[] => {
    const chain: StickyNote[] = [];
    let curId: string | null = id;
    const seen = new Set<string>();
    while (curId) {
      if (seen.has(curId)) break;
      seen.add(curId);
      const n = notes.find((x) => x.id === curId);
      if (!n) break;
      chain.unshift(n);
      curId = n.parentId;
    }
    return chain;
  };

  const runInference = async (noteId: string, question: string) => {
    // set the question, mark loading
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, question, answer: '', loading: true, error: undefined } : n
      )
    );

    // build chain using the just-updated question for this note
    const updatedNotes = notes.map((n) =>
      n.id === noteId ? { ...n, question, answer: '', loading: true } : n
    );
    const chain: StickyNote[] = [];
    let curId: string | null = noteId;
    const seen = new Set<string>();
    while (curId) {
      if (seen.has(curId)) break;
      seen.add(curId);
      const n = updatedNotes.find((x) => x.id === curId);
      if (!n) break;
      chain.unshift(n);
      curId = n.parentId;
    }

    const messages: ChatMessage[] = [];
    const qaChain = chain.filter((n) => n.kind !== 'document');
    const attachedDocs = docsByParent(updatedNotes);
    for (let i = 0; i < qaChain.length; i++) {
      const n = qaChain[i];
      if (i === qaChain.length - 1) {
        messages.push({ role: 'user', content: n.question });
      } else {
        if (n.question) messages.push({ role: 'user', content: n.question });
        if (n.answer) messages.push({ role: 'assistant', content: n.answer });
        for (const docNote of attachedDocs.get(n.id) ?? []) {
          if (docNote.document) {
            messages.push({
              role: 'assistant',
              content: formatDocForContext(docNote.document),
            });
          }
        }
      }
    }

    try {
      setSending(true);
      const { answer, toolCalls, documents } = await infer({ config, messages });
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === noteId ? { ...n, answer, toolCalls, loading: false } : n
        );
        if (!documents.length) return updated;
        return [...updated, ...buildDocNotes(updated, noteId, documents)];
      });
    } catch (err: any) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, loading: false, error: err?.message ?? 'Unknown error' }
            : n
        )
      );
    } finally {
      setSending(false);
    }
  };

  const addNote = (x = 200, y = 200) => {
    const id = uid();
    const note: StickyNote = {
      id,
      x,
      y,
      question: '',
      answer: '',
      parentId: null,
    };
    setNotes((prev) => [...prev, note]);
    setSelectedId(id);
  };

  const moveNote = (id: string, x: number, y: number) =>
    setNotes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target) return prev;
      const dx = x - target.x;
      const dy = y - target.y;
      if (!target.collapsed || (dx === 0 && dy === 0)) {
        return prev.map((n) => (n.id === id ? { ...n, x, y } : n));
      }
      const byParent = new Map<string, StickyNote[]>();
      for (const n of prev) {
        if (n.parentId) {
          const arr = byParent.get(n.parentId) ?? [];
          arr.push(n);
          byParent.set(n.parentId, arr);
        }
      }
      const descendants = new Set<string>();
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const k of byParent.get(cur) ?? []) {
          if (!descendants.has(k.id)) {
            descendants.add(k.id);
            stack.push(k.id);
          }
        }
      }
      return prev.map((n) => {
        if (n.id === id) return { ...n, x, y };
        if (descendants.has(n.id)) return { ...n, x: n.x + dx, y: n.y + dy };
        return n;
      });
    });

  const attach = (childId: string, parentId: string) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === childId ? { ...n, parentId } : n))
    );

  const detach = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, parentId: null } : n)));

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id).map((n) => (n.parentId === id ? { ...n, parentId: null } : n)));
    if (selectedId === id) setSelectedId(null);
    if (sidebarId === id) setSidebarId(null);
    if (docPreview?.noteId === id) setDocPreview(null);
  };

  const duplicateNote = (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const copy: StickyNote = {
      ...n,
      id: uid(),
      x: n.x + 30,
      y: n.y + 30,
      parentId: n.parentId,
    };
    setNotes((prev) => [...prev, copy]);
  };

  const sendInSidebar = async (parentId: string, question: string) => {
    const parent = notes.find((n) => n.id === parentId);
    if (!parent) return;

    const chain: StickyNote[] = [];
    let curId: string | null = parentId;
    const seen = new Set<string>();
    while (curId) {
      if (seen.has(curId)) break;
      seen.add(curId);
      const n = notes.find((x) => x.id === curId);
      if (!n) break;
      chain.unshift(n);
      curId = n.parentId;
    }

    const messages: ChatMessage[] = [];
    const attachedDocs = docsByParent(notes);
    for (const n of chain) {
      if (n.kind === 'document') continue;
      if (n.question) messages.push({ role: 'user', content: n.question });
      if (n.answer) messages.push({ role: 'assistant', content: n.answer });
      for (const docNote of attachedDocs.get(n.id) ?? []) {
        if (docNote.document) {
          messages.push({
            role: 'assistant',
            content: formatDocForContext(docNote.document),
          });
        }
      }
    }
    messages.push({ role: 'user', content: question });

    const id = uid();
    const child: StickyNote = {
      id,
      x: parent.x + 260,
      y: parent.y + 40,
      question,
      answer: '',
      parentId,
      loading: true,
    };
    setNotes((prev) => [...prev, child]);
    setSidebarId(id);
    setSelectedId(id);

    try {
      setSending(true);
      const { answer, toolCalls, documents } = await infer({ config, messages });
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, answer, toolCalls, loading: false } : n
        );
        if (!documents.length) return updated;
        return [...updated, ...buildDocNotes(updated, id, documents)];
      });
    } catch (err: any) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, loading: false, error: err?.message ?? 'Unknown error' } : n
        )
      );
    } finally {
      setSending(false);
    }
  };

  const openChain = (id: string) => {
    setSidebarId(id);
    setSelectedId(id);
    const n = notes.find((x) => x.id === id);
    if (n?.kind === 'document') {
      setDocPreview({ noteId: id, open: false });
    } else if (docPreview) {
      setDocPreview(null);
    }
  };

  const toggleCollapse = (id: string) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n))
    );

  const runAutoLayout = (sizes: Map<string, { w: number; h: number }>) =>
    setNotes((prev) => autoLayout(prev, config.layoutDirection, sizes));

  const handleHeaderAutoLayout = () => {
    const sizes = measureRef.current?.() ?? new Map<string, { w: number; h: number }>();
    runAutoLayout(sizes);
  };

  const handleHeaderAddNote = () =>
    addNote(160 + Math.random() * 200, 160 + Math.random() * 200);

  return (
    <div className="app">
      <div className="header">
        <div className="logo">
          <span className="logo-dot" />
          Etcher-Sketchpad
        </div>
        <div className="tabs">
          <button
            className={'tab' + (tab === 'canvas' ? ' active' : '')}
            onClick={() => setTab('canvas')}
          >
            Canvas
          </button>
          <button
            className={
              'tab' +
              ((tab === 'config' || (config.settingsAsOverlay && configOverlayOpen))
                ? ' active'
                : '')
            }
            onClick={() => {
              if (config.settingsAsOverlay) {
                setConfigOverlayOpen((v) => !v);
              } else {
                setTab('config');
              }
            }}
          >
            Config
          </button>
        </div>
        <div className="header-spacer" />
        <div style={{ fontSize: 12, color: '#888' }}>
          {config.provider} · {config.model[config.provider]}
        </div>
      </div>

      {tab === 'canvas' ? (
        <div className={'canvas-page' + (sidebarId ? ' sidebar-open' : '')}>
          <Canvas
            notes={notes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddNote={addNote}
            onMoveNote={moveNote}
            onAttach={attach}
            onDetach={detach}
            onDelete={deleteNote}
            onDuplicate={duplicateNote}
            onAsk={runInference}
            onOpenChain={openChain}
            onToggleCollapse={toggleCollapse}
            onAutoLayout={runAutoLayout}
            devMode={config.devMode}
            measureRef={measureRef}
            initialTransform={canvasTransform}
            onTransformChange={setCanvasTransform}
          />
          {!docPreview?.open && (
            <div className="canvas-toolbar" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className="toolbar-btn tidy"
                title="Auto-arrange into tidy trees"
                onClick={handleHeaderAutoLayout}
              >
                ⊞
              </button>
              <button
                className="toolbar-btn"
                title="Add new chain"
                onClick={handleHeaderAddNote}
              >
                +
              </button>
            </div>
          )}
          {docPreview !== null && !docPreview.open && (
            <button
              className="doc-expand-chevron"
              title="Expand attached document"
              aria-label="Expand attached document"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setDocViewerEntry('default');
                setDocPreview((p) => (p ? { ...p, open: true } : p));
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>
          )}
          {sidebarId && (
            <Sidebar
              notes={notes}
              activeId={sidebarId}
              onClose={() => {
                setSidebarId(null);
                setDocPreview(null);
                setSidebarFullscreen(false);
              }}
              onSend={sendInSidebar}
              sending={sending}
              devMode={config.devMode}
              fullscreen={sidebarFullscreen}
              onToggleFullscreen={() => setSidebarFullscreen((v) => !v)}
              onOpenDocument={(noteId) => {
                setDocViewerEntry(sidebarFullscreen ? 'from-fullscreen' : 'default');
                setDocPreview({ noteId, open: true });
                setSidebarFullscreen(false);
              }}
            />
          )}
          {docPreview?.open && (() => {
            const n = notes.find((x) => x.id === docPreview.noteId);
            if (!n?.document) return null;
            const noteId = n.id;
            return (
              <DocViewer
                document={n.document}
                entry={docViewerEntry}
                onCloseStart={() => {
                  if (docViewerEntry === 'from-fullscreen') {
                    setSidebarFullscreen(true);
                  }
                }}
                onClose={() =>
                  setDocPreview((p) => (p ? { ...p, open: false } : p))
                }
                onUpdateDocument={(payload) =>
                  setNotes((prev) =>
                    prev.map((x) =>
                      x.id === noteId ? { ...x, document: payload } : x
                    )
                  )
                }
              />
            );
          })()}
        </div>
      ) : (
        <ConfigPanel config={config} onSave={setConfig} />
      )}

      {configOverlayOpen && (
        <div
          className="settings-overlay-backdrop"
          onClick={() => setConfigOverlayOpen(false)}
        >
          <div
            className="settings-overlay-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="settings-overlay-close"
              aria-label="Close settings"
              onClick={() => setConfigOverlayOpen(false)}
            >
              ×
            </button>
            <ConfigPanel config={config} onSave={setConfig} />
          </div>
        </div>
      )}
    </div>
  );
}
