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
  generationConfig: { maxOutputTokens: number; temperature?: number };
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
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
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
