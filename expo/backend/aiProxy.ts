/**
 * AI model access through the Rork Toolkit proxy (Vercel AI Gateway).
 *
 * Server-side calls authenticate with EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;
 * the gateway owns upstream provider auth, billing, and rate limiting, so the
 * backend needs no direct provider API keys. Endpoints are OpenAI-compatible
 * chat completions at `${EXPO_PUBLIC_TOOLKIT_URL}/v2/vercel/v1/chat/completions`.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

import { reportUsage } from "./geminiDirect";

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Optional caller-side cancellation signal (streaming client disconnects). */
  signal?: AbortSignal;
}

/** Hard ceiling on a single proxy model call, matching the direct-Gemini path. */
const MODEL_CALL_TIMEOUT_MS = 30_000;

/** Request-scoped abort signal: the caller's signal plus the hard timeout. */
function callSignal(req: ChatRequest): AbortSignal {
  return req.signal
    ? AbortSignal.any([req.signal, AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS)])
    : AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS);
}

interface ProxyConfig {
  url: string;
  key: string;
}

function proxyConfig(): ProxyConfig | null {
  const base = (process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "").replace(/\/$/, "");
  const key = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";
  if (!base || !key) return null;
  return { url: `${base}/v2/vercel/v1/chat/completions`, key };
}

/** True when the proxy is usable; callers surface a clear error otherwise. */
export function aiProxyConfigured(): boolean {
  return proxyConfig() !== null;
}

/** Extracts the assistant text from a chat completion payload. */
function extractContent(payload: { choices?: { message?: { content?: string } }[] }): string {
  return payload.choices?.[0]?.message?.content ?? "";
}

/** Extracts an upstream status/error message from a failed proxy response. */
async function proxyError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  return new Error(`AI proxy error ${res.status}: ${text.slice(0, 300)}`);
}

/** Non-streaming completion. Returns the assistant text. */
export async function chatCompletion(req: ChatRequest): Promise<string> {
  const cfg = proxyConfig();
  if (!cfg) throw new Error("AI proxy is not configured (missing toolkit URL or secret).");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      max_tokens: req.maxTokens ?? 8192,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    }),
    signal: callSignal(req),
  });
  if (!res.ok) {
    reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: false });
    throw await proxyError(res);
  }
  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = extractContent(payload);
  if (!content.trim()) {
    reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: false });
    throw new Error("Empty completion from model");
  }
  // The gateway does not expose token counts on this shape; count the request only.
  reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: true });
  return content;
}

/**
 * Streaming completion. Invokes `onDelta` for each text piece as it arrives
 * and resolves with the full text once the stream ends.
 */
export async function streamChatCompletion(
  req: ChatRequest,
  onDelta: (piece: string) => void | Promise<void>
): Promise<string> {
  const cfg = proxyConfig();
  if (!cfg) throw new Error("AI proxy is not configured (missing toolkit URL or secret).");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      max_tokens: req.maxTokens ?? 8192,
      stream: true,
    }),
    signal: callSignal(req),
  });
  if (!res.ok || !res.body) {
    reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: false });
    throw await proxyError(res);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const handleLine = async (line: string): Promise<void> => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let parsed: { choices?: { delta?: { content?: string } }[] };
    try {
      parsed = JSON.parse(data);
    } catch {
      return; // ignore malformed frames
    }
    const piece = parsed.choices?.[0]?.delta?.content ?? "";
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

  if (!full.trim()) {
    reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: false });
    throw new Error("Empty stream from model");
  }
  // The gateway does not expose token counts on this shape; count the request only.
  reportUsage({ provider: "proxy", model: req.model, promptTokens: 0, outputTokens: 0, ok: true });
  return full;
}
