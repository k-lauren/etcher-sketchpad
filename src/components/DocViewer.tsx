import { useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { base64ToBlob } from '../docx';
import type { DocumentPayload } from '../types';

interface Props {
  document: DocumentPayload;
  onClose: () => void;
}

export function DocViewer({ document: docPayload, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    }).catch((e: unknown) => {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      el.innerHTML = `<div style="padding:16px; color:#b00020;">Failed to render document: ${msg}</div>`;
    });
    return () => {
      cancelled = true;
    };
  }, [docPayload.base64]);

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

  return (
    <div className="doc-viewer" role="dialog" aria-label="Document preview">
      <div className="doc-viewer-header">
        <div className="doc-viewer-title">
          <span className="doc-viewer-icon">📄</span>
          <span>{docPayload.title}</span>
        </div>
        <div className="doc-viewer-actions">
          <button className="btn-secondary" onClick={download} title="Download .docx">
            Download
          </button>
          <button
            className="icon-btn doc-viewer-chevron"
            onClick={onClose}
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
