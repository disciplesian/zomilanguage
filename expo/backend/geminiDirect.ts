/**
 * Direct Gemini API access (generativelanguage.googleapis.com) using the
 * project's GEMINI_API_KEY. Preferred provider when the key is configured;
 * the Rork AI proxy (./aiProxy.ts) serves as fallback.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function apiKey(): string {
  return (process.env.GEMINI_API_KEY ?? "").trim();
}

/** True when a Gemini API key is present. */
export function geminiConfigured(): boolean {
  return apiKey().length > 0;
}

interface GeminiPayload {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  // NOTE: sampling params (temperature/top_p/top_k) were deprecated by the
  // Gemini API in July 2026 and are intentionally not sent.
  generationConfig: { maxOutputTokens: number };
}

function toPayload(req: ChatRequest): GeminiPayload {
  const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 8192,
    },
  };
}

/** Extracts the text of a stream frame (`{"candidates":[{"content":{"parts":[...]}}]}`). */
function frameText(frame: unknown): string {
  const f = frame as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const parts = f.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

async function proxyError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  return new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
}

/**
 * Static fallback model chain (newest first, August 2026). Used until the
 * ListModels auto-discovery below completes, and whenever it is unavailable.
 * Accuracy first: Pro tier leads, then the newest Flash generations.
 */
export const FALLBACK_TRANSLATION_MODELS: readonly string[] = [
  "gemini-3.1-pro-preview",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

/** Lists every model this API key can call that supports generateContent. */
async function listAvailableModels(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/models?pageSize=1000`, {
    headers: { "x-goog-api-key": apiKey() },
  });
  if (!res.ok) throw await proxyError(res);
  const payload = (await res.json()) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
  };
  return (payload.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter((name) => /^gemini-\d/.test(name))
    .filter((name) => !/(embedding|imagen|aqa|live|native-audio|tts|omni)/.test(name));
}

/**
 * Ranks discovered chat models for translation quality: Pro tier first, then
 * Flash, then Flash-Lite; within a tier newer versions win. Thinking-preview
 * and experimental builds rank below their stable siblings.
 */
function rankModels(models: string[]): string[] {
  const score = (id: string): number => {
    const version = Number(id.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0) * 10;
    let tier = 0;
    if (/pro/.test(id)) tier = 300;
    else if (/flash-lite/.test(id)) tier = 100;
    else if (/flash/.test(id)) tier = 200;
    let penalty = 0;
    if (/exp|deprecated|thinking/.test(id)) penalty = 5;
    else if (/preview/.test(id)) penalty = 1;
    return version + tier - penalty;
  };
  return [...models].sort((a, b) => score(b) - score(a));
}

const MODEL_LIST_TTL_MS = 60 * 60 * 1000; // re-discover hourly
let modelListCache: { models: string[]; fetchedAt: number } | null = null;
let modelListPromise: Promise<string[]> | null = null;

/**
 * The translation model chain, kept up to date automatically: the live model
 * list is fetched from the Gemini ListModels endpoint and cached for an hour,
 * so newly released models are picked up without a code change. Falls back to
 * FALLBACK_TRANSLATION_MODELS when the key is missing or discovery fails.
 */
export async function translationModelChain(): Promise<string[]> {
  if (modelListCache && Date.now() - modelListCache.fetchedAt < MODEL_LIST_TTL_MS) {
    return modelListCache.models;
  }
  if (modelListPromise) return modelListPromise;
  modelListPromise = (async () => {
    try {
      const ranked = rankModels(await listAvailableModels()).slice(0, 6);
      if (ranked.length > 0) {
        modelListCache = { models: ranked, fetchedAt: Date.now() };
        return ranked;
      }
    } catch (err) {
      console.warn("[gemini] model auto-discovery failed, using static chain", err);
    } finally {
      modelListPromise = null;
    }
    return [...FALLBACK_TRANSLATION_MODELS];
  })();
  return modelListPromise;
}

/** Non-streaming completion. Returns the assistant text. */
export async function chatCompletionDirect(req: ChatRequest): Promise<string> {
  const res = await fetch(`${API_BASE}/models/${req.model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(req)),
  });
  if (!res.ok) throw await proxyError(res);
  const payload = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const content = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
  if (!content.trim()) throw new Error("Empty completion from Gemini");
  return content;
}

/**
 * Streaming completion via SSE. Invokes `onDelta` for each text piece as it
 * arrives and resolves with the full text once the stream ends.
 */
export async function streamChatCompletionDirect(
  req: ChatRequest,
  onDelta: (piece: string) => void | Promise<void>
): Promise<string> {
  const res = await fetch(`${API_BASE}/models/${req.model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey(), "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(toPayload(req)),
  });
  if (!res.ok || !res.body) throw await proxyError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const handleLine = async (line: string): Promise<void> => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return; // ignore malformed frames
    }
    const piece = frameText(parsed);
    if (piece) {
      full += piece;
      await onDelta(piece);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      await handleLine(line);
    }
  }
  if (buffer.trim()) await handleLine(buffer);

  if (!full.trim()) throw new Error("Empty stream from Gemini");
  return full;
}
