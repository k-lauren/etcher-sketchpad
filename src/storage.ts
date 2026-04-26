import type { AppConfig, CanvasesState, StickyNote } from './types';

const NOTES_KEY = 'etcher.notes'; // legacy single-canvas storage
const CANVASES_KEY = 'etcher.canvases';
const CONFIG_KEY = 'etcher.config';

const DEFAULT_DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';

export const defaultConfig: AppConfig = {
  provider: 'deepseek',
  apiKeys: {
    deepseek: DEFAULT_DEEPSEEK_KEY,
    openai: '',
    claude: '',
  },
  model: {
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o-mini',
    claude: 'claude-sonnet-4-5',
  },
  layoutDirection: 'vertical',
  theme: 'light',
  devMode: false,
  settingsAsOverlay: false,
  saasMode: true,
  threadFullscreenDefault: false,
};

/* ───── Legacy single-canvas helpers (kept for backward-compat read) ───── */

export function loadNotes(): StickyNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotes(notes: StickyNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/* ───── Multi-canvas storage ───── */

function makeStarterCanvas(name = 'Canvas 1'): CanvasesState['canvases'][number] {
  return {
    id: uid(),
    name,
    notes: [{ id: uid(), x: 120, y: 120, question: '', answer: '', parentId: null }],
    transform: { x: 0, y: 0, scale: 1 },
  };
}

export function loadCanvases(): CanvasesState {
  // Prefer the multi-canvas blob.
  try {
    const raw = localStorage.getItem(CANVASES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CanvasesState;
      if (parsed.canvases?.length) {
        // Make sure activeId points at a real canvas.
        const activeId = parsed.canvases.some((c) => c.id === parsed.activeId)
          ? parsed.activeId
          : parsed.canvases[0].id;
        return { canvases: parsed.canvases, activeId };
      }
    }
  } catch {}

  // Migrate from legacy single-canvas notes.
  const legacy = loadNotes();
  const starter =
    legacy.length > 0
      ? {
          id: uid(),
          name: 'Canvas 1',
          notes: legacy,
          transform: { x: 0, y: 0, scale: 1 },
        }
      : makeStarterCanvas();
  return { canvases: [starter], activeId: starter.id };
}

export function saveCanvases(state: CanvasesState) {
  localStorage.setItem(CANVASES_KEY, JSON.stringify(state));
}

/* ───── Config ───── */

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...defaultConfig,
      ...parsed,
      apiKeys: { ...defaultConfig.apiKeys, ...(parsed.apiKeys ?? {}) },
      model: { ...defaultConfig.model, ...(parsed.model ?? {}) },
    };
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
