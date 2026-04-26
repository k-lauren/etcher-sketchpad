import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { base64ToBlob, blobToBase64, generateDocx } from '../docx';
import type { DocumentPayload } from '../types';
import { DocIcon, EditIcon } from './icons';

export type DocViewerEntry = 'default' | 'from-fullscreen';

interface Props {
  document: DocumentPayload;
  entry?: DocViewerEntry;
  onClose: () => void;
  onCloseStart?: () => void;
  onUpdateDocument?: (payload: DocumentPayload) => void;
}

const CLOSE_ANIMATION_MS = 260;

/**
 * Pull a markdown-ish source string out of the docx-preview rendered DOM.
 * Tries to preserve heading and list semantics by inspecting tag/class hints
 * docx-preview leaves on each block; falls back to plain paragraph text.
 */
function extractSourceFromRendered(root: HTMLElement): string {
  const lines: string[] = [];
  const pushLine = (s: string) => {
    // collapse runs of blank lines to a single blank
    if (s === '' && lines[lines.length - 1] === '') return;
    lines.push(s);
  };

  const visit = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script') return;
    const cls = el.className?.toString() ?? '';
    const text = (el as HTMLElement).innerText?.replace(/\s+$/g, '') ?? '';

    // Containers — recurse into children rather than emitting a line.
    if (
      tag === 'div' ||
      tag === 'section' ||
      tag === 'article' ||
      tag === 'main' ||
      cls.includes('docx-rendered-wrapper') ||
      cls.includes('docx-rendered-section')
    ) {
      for (const child of Array.from(el.children)) visit(child);
      return;
    }

    if (!text.trim()) {
      pushLine('');
      return;
    }

    // Headings
    if (tag === 'h1' || /heading-1|title/i.test(cls)) pushLine('# ' + text);
    else if (tag === 'h2' || /heading-2/i.test(cls)) pushLine('## ' + text);
    else if (
      tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ||
      /heading-[3-6]/i.test(cls)
    ) pushLine('### ' + text);
    // Lists
    else if (tag === 'li') pushLine('- ' + text);
    else if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() === 'li') {
          pushLine('- ' + ((li as HTMLElement).innerText ?? '').trim());
        }
      }
    }
    // Paragraphs / fallback
    else pushLine(text);
  };

  for (const child of Array.from(root.children)) visit(child);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function DocViewer({
  document: docPayload,
  entry = 'default',
  onClose,
  onCloseStart,
  onUpdateDocument,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Render the docx into the container whenever the source changes or
  // the editing flag flips. After rendering we toggle contentEditable on
  // the docx-preview wrapper so the user can edit text in-place without
  // changing the visual display.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';
    const blob = base64ToBlob(docPayload.base64);
    let cancelled = false;
    renderAsync(blob, el, undefined, {
      className: 'docx-rendered',
      inWrapper: true,
      breakPages: true,
      ignoreWidth: false,
      ignoreHeight: false,
    })
      .then(() => {
        if (cancelled) return;
        const wrapper = el.querySelector<HTMLElement>('.docx-rendered-wrapper');
        if (wrapper) wrapper.contentEditable = editing ? 'true' : 'false';
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        el.innerHTML = `<div style="padding:16px; color:#b00020;">Failed to render document: ${msg}</div>`;
      });
    return () => {
      cancelled = true;
    };
  }, [docPayload.base64, editing]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onCloseStart?.();
    window.setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

  const startEdit = () => {
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    // The render effect will rebuild the docx from current base64,
    // throwing away any in-progress DOM edits.
  };

  const saveEdit = async () => {
    if (!onUpdateDocument || saving) return;
    setSaving(true);
    try {
      const wrapper = containerRef.current?.querySelector<HTMLElement>(
        '.docx-rendered-wrapper'
      );
      if (!wrapper) {
        setEditing(false);
        return;
      }
      const extracted = extractSourceFromRendered(wrapper);
      // The first content line is the rendered title (generateDocx emits it
      // as a TITLE paragraph at the top). Pull it back out so we don't
      // double-render it on regeneration.
      const lines = extracted.split('\n');
      let nextTitle = docPayload.title;
      let bodyStart = 0;
      while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
      if (bodyStart < lines.length) {
        const first = lines[bodyStart].replace(/^#+\s*/, '').trim();
        if (first) nextTitle = first;
        bodyStart++;
      }
      const newSource = lines
        .slice(bodyStart)
        .join('\n')
        .replace(/^\n+/, '')
        .trim();

      const blob = await generateDocx(nextTitle, newSource);
      const base64 = await blobToBase64(blob);
      onUpdateDocument({
        title: nextTitle,
        base64,
        source: newSource,
        originalSource:
          docPayload.originalSource ?? docPayload.source ?? newSource,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const blob = base64ToBlob(docPayload.base64);
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${docPayload.title.replace(/[^\w.-]+/g, '_') || 'document'}.docx`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const userEdited =
    !!docPayload.originalSource &&
    !!docPayload.source &&
    docPayload.source !== docPayload.originalSource;

  const className =
    'doc-viewer' +
    ` entry-${entry}` +
    (isClosing ? ' is-closing' : '') +
    (editing ? ' is-editing' : '');

  return (
    <div className={className} role="dialog" aria-label="Document preview">
      <div className="doc-viewer-header">
        <div className="doc-viewer-title">
          <span className="doc-viewer-icon" aria-hidden="true">
            {editing ? <EditIcon size={18} /> : <DocIcon size={18} />}
          </span>
          <span>{docPayload.title}</span>
          {userEdited && !editing && (
            <span className="doc-edited-badge" title="Edited by user">
              edited
            </span>
          )}
        </div>
        <div className="doc-viewer-actions">
          {editing ? (
            <>
              <button
                className="btn-secondary"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={download} title="Download .docx">
                Download
              </button>
              {onUpdateDocument && (
                <button className="btn-secondary" onClick={startEdit} title="Edit document">
                  Edit
                </button>
              )}
            </>
          )}
          <button
            className="icon-btn doc-viewer-chevron"
            onClick={handleClose}
            title="Collapse document"
            aria-label="Collapse document"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
      <div className="doc-viewer-body" ref={containerRef} />
    </div>
  );
}
