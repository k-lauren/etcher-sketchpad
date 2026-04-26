import type { AppConfig, ChatMessage, DocumentPayload, Provider, ToolCallRecord } from './types';
import { DOC_ARTIFACT_MARKER, toolByName, toolsForAnthropic, toolsForOpenAI } from './tools';

const MAX_TOOL_ITERATIONS = 8;

/**
 * Shared system prompt. Nudges the model to call tools directly instead of
 * narrating intent, and forces document creation through the tool channel
 * rather than inline in the chat response.
 */
const SYSTEM_PROMPT =
  'You have access to tools: wikipedia_search, wolfram_alpha, tavily_search, and create_document. ' +
  'Call tools directly when needed — do not narrate your intent before calling them ' +
  '(avoid phrases like "Let me call…" or "I will now use…"). ' +
  'When the user asks you to create, draft, or write a document, you MUST invoke the create_document tool ' +
  'with the full document body. Never produce the document text inline in your response; it must be delivered via the tool.';

interface InferParams {
  config: AppConfig;
  messages: ChatMessage[];
}

export interface InferResult {
  answer: string;
  toolCalls: ToolCallRecord[];
  documents: DocumentPayload[];
}

/**
 * If the tool returned a document artifact, unpack it into the documents list
 * and return a short human summary that's safe to send back to the model
 * (keeps the base64 blob out of the conversation context).
 */
function unpackArtifact(
  rawResult: string,
  documents: DocumentPayload[]
): string {
  if (!rawResult.startsWith(DOC_ARTIFACT_MARKER)) return rawResult;
  try {
    const payload = JSON.parse(rawResult.slice(DOC_ARTIFACT_MARKER.length)) as DocumentPayload;
    documents.push(payload);
    return `Document "${payload.title}" created and attached to the canvas.`;
  } catch {
    return rawResult;
  }
}

export async function infer({ config, messages }: InferParams): Promise<InferResult> {
  const provider: Provider = config.provider;
  const apiKey = config.apiKeys[provider];
  if (!apiKey) throw new Error(`No API key set for ${provider}`);

  if (provider === 'openai' || provider === 'deepseek') {
    return runOpenAICompatibleLoop(provider, apiKey, config, messages);
  }
  if (provider === 'claude') {
    return runAnthropicLoop(apiKey, config, messages);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

async function runOpenAICompatibleLoop(
  provider: 'openai' | 'deepseek',
  apiKey: string,
  config: AppConfig,
  messages: ChatMessage[]
): Promise<InferResult> {
  const endpoint =
    provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.deepseek.com/chat/completions';
  const model =
    provider === 'openai'
      ? config.model.openai || 'gpt-4o-mini'
      : config.model.deepseek || 'deepseek-chat';

  const wire: Record<string, unknown>[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const recorded: ToolCallRecord[] = [];
  const documents: DocumentPayload[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: wire,
        tools: toolsForOpenAI(),
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`${provider} error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    if (!msg) throw new Error(`${provider}: no message in response`);

    const toolCalls: OpenAIToolCall[] = msg.tool_calls ?? [];
    if (!toolCalls.length) {
      return { answer: msg.content ?? '', toolCalls: recorded, documents };
    }

    wire.push({
      role: 'assistant',
      content: msg.content ?? '',
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let argsObj: Record<string, unknown> = {};
      try {
        argsObj = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        argsObj = {};
      }
      const tool = toolByName[name];
      const rawResult = tool ? await tool.execute(argsObj) : `Unknown tool: ${name}`;
      const visibleResult = unpackArtifact(rawResult, documents);
      recorded.push({ iteration: i, name, args: argsObj, result: visibleResult });
      wire.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: visibleResult,
      });
    }
  }
  throw new Error(`${provider}: exceeded max tool iterations (${MAX_TOOL_ITERATIONS})`);
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

async function runAnthropicLoop(
  apiKey: string,
  config: AppConfig,
  messages: ChatMessage[]
): Promise<InferResult> {
  const model = config.model.claude || 'claude-sonnet-4-5';
  const wire: { role: 'user' | 'assistant'; content: unknown }[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const recorded: ToolCallRecord[] = [];
  const documents: DocumentPayload[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: toolsForAnthropic(),
        messages: wire,
      }),
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content: AnthropicContentBlock[] = data?.content ?? [];

    if (data?.stop_reason !== 'tool_use') {
      const text = content
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      return { answer: text, toolCalls: recorded, documents };
    }

    wire.push({ role: 'assistant', content });

    const toolUses = content.filter((b) => b.type === 'tool_use');
    const toolResults: Record<string, unknown>[] = [];
    for (const tu of toolUses) {
      const tool = tu.name ? toolByName[tu.name] : undefined;
      const args = tu.input ?? {};
      const rawResult = tool ? await tool.execute(args) : `Unknown tool: ${tu.name}`;
      const visibleResult = unpackArtifact(rawResult, documents);
      recorded.push({
        iteration: i,
        name: tu.name ?? '(unknown)',
        args,
        result: visibleResult,
      });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: visibleResult,
      });
    }
    wire.push({ role: 'user', content: toolResults });
  }
  throw new Error(`Claude: exceeded max tool iterations (${MAX_TOOL_ITERATIONS})`);
}
