import type { AppConfig, StickyNote } from './types';

const NOTES_KEY = 'etcher.notes';
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
};

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
