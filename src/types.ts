export type Provider = 'deepseek' | 'openai' | 'claude';
export type LayoutDirection = 'vertical' | 'horizontal';
export type Theme = 'light' | 'dark';

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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
