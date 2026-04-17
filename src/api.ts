import type { AppConfig, ChatMessage, Provider } from './types';

interface InferParams {
  config: AppConfig;
  messages: ChatMessage[];
}

export async function infer({ config, messages }: InferParams): Promise<string> {
  const provider: Provider = config.provider;
  const apiKey = config.apiKeys[provider];
  if (!apiKey) throw new Error(`No API key set for ${provider}`);

  if (provider === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model.deepseek || 'deepseek-chat',
        messages,
        stream: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model.openai || 'gpt-4o-mini',
        messages,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'claude') {
    const system = messages.find((m) => m.role === 'assistant' && false); // placeholder
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model.claude || 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const block = data?.content?.[0];
    return block?.text ?? '';
  }

  throw new Error(`Unknown provider: ${provider}`);
}
