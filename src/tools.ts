import { blobToBase64, generateDocx } from './docx';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<string>;
}

/**
 * Marker prefix used by the create_document tool to smuggle a binary artifact
 * back through the (string-only) tool-result channel. The orchestrator in
 * api.ts strips this out before returning results to the model.
 */
export const DOC_ARTIFACT_MARKER = '__DOCX_ARTIFACT__';

// Free!!
const wikipediaSearch: Tool = {
  name: 'wikipedia_search',
  description:
    'Search Wikipedia and return an extract from the top-matching article. Use for factual, encyclopedic lookups.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
    },
    required: ['query'],
  },
  async execute({ query }) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(
        String(query ?? '')
      )}&srlimit=1`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return `Wikipedia search failed: ${searchRes.status}`;
      const searchData = await searchRes.json();
      const hit = searchData?.query?.search?.[0];
      if (!hit) return `No Wikipedia results for "${query}".`;
      const title: string = hit.title;
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) {
        return `Wikipedia summary failed for "${title}": ${summaryRes.status}`;
      }
      const summary = await summaryRes.json();
      return JSON.stringify({
        title: summary.title,
        extract: summary.extract,
        url: summary.content_urls?.desktop?.page ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Wikipedia error: ${msg}`;
    }
  },
};


// Waiting for Wolfram to approve my API key req.
const wolframAlpha: Tool = {
  name: 'wolfram_alpha',
  description:
    'Query Wolfram Alpha for math, science, units, and computational knowledge. Use when an exact numeric or symbolic answer is needed instead of LLM estimation.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language or symbolic math query.',
      },
    },
    required: ['query'],
  },
  async execute({ query }) {
    const appId = '6XATHLEA95';
    try {
      const url = `https://api.wolframalpha.com/v2/query?appid=${encodeURIComponent(
        appId
      )}&input=${encodeURIComponent(String(query ?? ''))}&output=json&format=plaintext`;
      const res = await fetch(url);
      if (!res.ok) return `Wolfram Alpha error: ${res.status}`;
      const data = await res.json();
      const pods: unknown[] = data?.queryresult?.pods ?? [];
      const results = pods
        .map((p: unknown) => {
          const pod = p as { title?: string; subpods?: { plaintext?: string }[] };
          return {
            title: pod.title,
            text: (pod.subpods ?? [])
              .map((sp) => sp.plaintext)
              .filter(Boolean)
              .join('; '),
          };
        })
        .filter((p) => p.text);
      if (!results.length) return `Wolfram Alpha returned no results for "${query}".`;
      return JSON.stringify(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Wolfram Alpha error: ${msg}`;
    }
  },
};

// Limit 1k queries / month. Need a way to reign in the model's use of this tool too freely.
const tavilySearch: Tool = {
  name: 'tavily_search',
  description:
    'Search the live web with Tavily and return relevant passages with URLs. Use for current events or information beyond Wikipedia.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
      max_results: {
        type: 'integer',
        description: 'Max number of results (default 5).',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['query'],
  },
  async execute({ query, max_results }) {
    const apiKey = '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';
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: String(query ?? ''),
          max_results: typeof max_results === 'number' ? max_results : 5,
        }),
      });
      if (!res.ok) return `Tavily error: ${res.status} ${await res.text()}`;
      const data = await res.json();
      const results = (data?.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));
      return JSON.stringify({ answer: data?.answer ?? null, results });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Tavily error: ${msg}`;
    }
  },
};

const createDocument: Tool = {
  name: 'create_document',
  description:
    'Generate a Microsoft Word (.docx) document and attach it as a new note on the canvas. Call this when the user asks to create, draft, or write a document. Supply a short title and the document body. The body may use simple markdown-ish formatting: `# `, `## `, `### ` for headings; `- ` for bullets; blank lines for paragraph breaks; `**bold**` and `*italic*` inline.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short document title (also used as the filename).',
      },
      content: {
        type: 'string',
        description: 'Full body of the document.',
      },
    },
    required: ['title', 'content'],
  },
  async execute({ title, content }) {
    try {
      const t = String(title ?? 'Untitled Document');
      const c = String(content ?? '');
      const blob = await generateDocx(t, c);
      const base64 = await blobToBase64(blob);
      return `${DOC_ARTIFACT_MARKER}${JSON.stringify({ title: t, base64 })}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `create_document error: ${msg}`;
    }
  },
};

export const tools: Tool[] = [wikipediaSearch, wolframAlpha, tavilySearch, createDocument];

export const toolByName: Record<string, Tool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);

export function toolsForOpenAI() {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function toolsForAnthropic() {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}
