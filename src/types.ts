export type Provider = 'deepseek' | 'openai' | 'claude';

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}
export type LayoutDirection = 'vertical' | 'horizontal';
export type Theme = 'light' | 'dark';

export interface ToolCallRecord {
  iteration: number;
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface DocumentPayload {
  title: string;
  base64: string; // base64-encoded .docx bytes
  source?: string; // current markdown-ish body (updated by user edits)
  originalSource?: string; // model's original markdown body, frozen at creation
}

export type NoteKind = 'qa' | 'document';

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  question: string;
  answer: string;
  parentId: string | null; // chained to this note (the prior Q/A in context)
  loading?: boolean;
  error?: string;
  collapsed?: boolean;
  toolCalls?: ToolCallRecord[];
  kind?: NoteKind; // default 'qa' when absent
  document?: DocumentPayload;
}

export interface AppConfig {
  provider: Provider;
  apiKeys: {
    deepseek: string;
    openai: string;
    claude: string;
  };
  model: {
    deepseek: string;
    openai: string;
    claude: string;
  };
  layoutDirection: LayoutDirection;
  theme: Theme;
  devMode: boolean;
  settingsAsOverlay: boolean;
  saasMode: boolean;
  /** When true, opening a chat in the sidebar opens it in fullscreen
   *  thread view by default. Toggled from the pin button in the
   *  fullscreen thread header. */
  threadFullscreenDefault: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** A single canvas: an isolated workspace of notes + viewport. The user
 *  can have many canvases and switch between them via the canvas-switcher
 *  in the top-left of the canvas area. */
export interface CanvasDoc {
  id: string;
  name: string;
  notes: StickyNote[];
  transform: CanvasTransform;
}

export interface CanvasesState {
  canvases: CanvasDoc[];
  activeId: string;
}
