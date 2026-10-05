import { Hono } from "hono";
import type { Context } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDB, type ZomiDB } from "./db/client";
import {
  streamChatCompletion,
  chatCompletion,
  aiProxyConfigured,
  type ChatRequest,
} from "./aiProxy";
import {
  streamChatCompletionDirect,
  chatCompletionDirect,
  geminiConfigured,
  translationModelChain,
} from "./geminiDirect";
import { lookupVerified } from "./verifiedDictionary";
import { usageSnapshot } from "./usage";
import {
  FREE_WORD_LIMIT,
  anonymousWordsUsed,
  authFromRequest,
  countWords,
  deletePortalUser,
  ensurePortalUser,
  portalProfileFor,
  logTranslation,
  recordAnonymousWords,
  type AuthInfo,
} from "./portal";
import {
  buildSystemInstruction,
  buildUserPrompt,
  buildEntryExamplesPrompt,
  ENTRY_EXAMPLES_SYSTEM_INSTRUCTION,
} from "../constants/zomiPrompt";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Requested-With', 'Accept', 'X-Anonymous-Id'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}));

app.options('*', (c) => {
  return new Response(null, { status: 204 });
});

// NOTE: the platform mounts this Hono app at /api, so routes are defined
// WITHOUT the /api prefix — e.g. "/translate/stream" serves /api/translate/stream.
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({
    error: {
      message: err.message || 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  }, 500);
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Streaming translation endpoint (Server-Sent Events).
 * Delivers model output token-by-token so long translations feel instant.
 * Models are called directly with the project's GEMINI_API_KEY when present,
 * with the Rork Toolkit proxy (Vercel AI Gateway) as fallback.
 */
/** Strips markdown code fences a model may wrap around JSON output. */
function stripFences(s: string): string {
  return s.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "");
}

/** Unescapes JSON string escapes (\n, \", \\uXXXX) in extracted text. */
function unescapeJsonText(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
}

/**
 * Extracts the human-readable translation from raw model output that may be
 * JSON ("translation": "...") possibly wrapped in code fences — or plain text.
 * Only returns text once the translation value is fully quoted, so partial
 * JSON braces/quotes are never streamed to the user as words.
 */
function extractDisplayText(raw: string): string | null {
  const s = stripFences(raw).trim();
  const complete = s.match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (complete) return unescapeJsonText(complete[1]);
  // If we can see the key but not the closing quote, the value is incomplete.
  if (/"translation"\s*:\s*"?$/s.test(s) || /"translation"\s*:\s*"(?:[^"\\]|\\.)*$/s.test(s)) {
    return null;
  }
  // JSON is still arriving (e.g. `{"` or `{\"translati` — hold until the value
  // is complete so braces and key names never leak into the displayed words.
  if (s.startsWith("{")) return null;
  // Not JSON output — plain text, minus any trailing incomplete JSON tail.
  const cut = s.search(/\s*[,}]?\s*"(confidence|alternatives|model)"\s*:/);
  const trimmed = (cut === -1 ? s : s.slice(0, cut)).trim();
  return trimmed || null;
}

/**
 * Strips a matching pair of quotes the model may wrap around the whole
 * translation (e.g. `"Zingsang hoih"` instead of `Zingsang hoih`). Only a
 * full matching pair at both ends is removed, so legitimate inner or
 * asymmetric quotes are preserved.
 */
function stripWrapQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const first = t[0];
    const last = t[t.length - 1];
    if (
      first === last &&
      (first === '"' || first === "\u201c" || first === "\u2018" || first === "'")
    ) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

/**
 * Incremental variant of extractDisplayText for live streaming: starts
 * returning the JSON "translation" value BEFORE its closing quote arrives,
 * trimming any trailing partial escape sequence (lone backslash, partial
 * \uXXXX) so an incomplete escape is never rendered. This is what makes text
 * appear word-by-word while the model is still generating — Google Translate
 * style perceived latency. Plain-text model output streams the same way.
 * Returns null only while nothing displayable exists yet ("" is meaningful:
 * the value has started but is still empty).
 */
function incrementalDisplayText(raw: string): string | null {
  const s = stripFences(raw);
  const started = s.match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (started) {
    let val = started[1];
    // Drop a trailing lone backslash (escape sequence still arriving).
    const trailingBackslashes = val.length - val.replace(/\\+$/, "").length;
    if (trailingBackslashes % 2 === 1) val = val.slice(0, -1);
    // Drop a partial \uXXXX escape (one to three hex digits so far).
    const partialUnicode = val.match(/\\u[0-9a-fA-F]{0,3}$/);
    if (partialUnicode) val = val.slice(0, val.length - partialUnicode[0].length);
    if (!val) return "";
    const display = unescapeJsonText(val);
    // Models sometimes wrap the whole translation in quotes; drop the leading
    // one immediately so it never flashes on screen mid-stream.
    return display.startsWith('"') || display.startsWith("\u201c")
      ? display.slice(1)
      : display;
  }
  // JSON arriving but the translation value hasn't opened yet.
  if (s.startsWith("{")) return null;
  // Plain-text output — stream it as it arrives, minus any JSON tail.
  const cut = s.search(/\s*[,}]?\s*"(confidence|alternatives|model)"\s*:/);
  const trimmed = (cut === -1 ? s : s.slice(0, cut)).trim();
  return trimmed || null;
}

/** Extracts a confidence value from JSON model output, if present. */
function extractConfidence(raw: string): number | null {
  const m = stripFences(raw).match(/"confidence"\s*:\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Math.max(0, Math.min(100, Math.round(Number(m[1]))));
}

/**
 * Extracts alternative renderings from JSON model output. Kept to at most 2
 * unique, non-empty strings that differ from the primary translation.
 */
function extractAlternatives(raw: string, primary: string): string[] {
  const s = stripFences(raw);
  const m = s.match(/"alternatives"\s*:\s*\[([^\]]*)\]/);
  if (!m) return [];
  const out: string[] = [];
  const itemRe = /"((?:[^"\\]|\\.)*)"/g;
  let item: RegExpExecArray | null;
  while ((item = itemRe.exec(m[1])) !== null && out.length < 2) {
    const val = unescapeJsonText(item[1]).trim();
    if (val && val !== primary && !out.includes(val)) out.push(val);
  }
  return out;
}

app.post("/translate/stream", async (c) => {
  let body: {
    text?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    extraGlossary?: Record<string, string>;
    anonymousId?: string;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  // Free tier: anyone can translate up to FREE_WORD_LIMIT words without an
  // account (tracked per device). Past the limit a signed-in account is
  // required; signed-in members translate without limits.
  const auth = await authFromRequest(c.req.header("authorization"));
  const anonymousId =
    (body.anonymousId ?? "").trim() ||
    (c.req.header("x-anonymous-id") ?? "").trim() ||
    (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "anonymous";
  if (!auth) {
    try {
      const db = await getDB();
      const wordsUsed = await anonymousWordsUsed(db, anonymousId);
      if (wordsUsed >= FREE_WORD_LIMIT) {
        return c.json(
          { error: "word_limit_reached", wordsUsed, wordLimit: FREE_WORD_LIMIT },
          401
        );
      }
    } catch {
      // Quota store unavailable — fail open rather than blocking translation.
    }
  }

  const text = (body.text ?? "").trim();
  const target = sanitizeLanguageCode(body.targetLanguage);
  // Clients state the source language explicitly; stale clients fall back to
  // auto-detection so they keep working.
  const source =
    typeof body.sourceLanguage === "string" && body.sourceLanguage.trim()
      ? sanitizeLanguageCode(body.sourceLanguage)
      : "auto";
  const extraGlossary =
    body.extraGlossary && typeof body.extraGlossary === 'object' ? body.extraGlossary : {};
  if (!text) return c.json({ error: "missing_text" }, 400);

  // Verified-dictionary integration: an exact word/short-phrase match in the
  // human-verified dataset is answered instantly (fast path, zero model
  // latency), and matched entries are injected into the prompt otherwise so
  // the AI translation always agrees with the verified dictionary.
  const verified = lookupVerified(text);
  const verifiedFastPath =
    verified !== null &&
    ((verified.side === "english" && target === "zomi" && (source === "english" || source === "auto")) ||
      (verified.side === "zomi" && target === "english" && (source === "zomi" || source === "auto")));

  // The fast path needs no AI provider — verified words still translate even
  // when every model is unavailable.
  if (!aiProxyConfigured() && !geminiConfigured() && !verifiedFastPath)
    return c.json({ error: "ai_unavailable" }, 500);

  // Pair-aware prompt: the Zomi specialist instruction and glossary are used
  // only when Zomi is part of the pair; every other pair gets a clean,
  // generic professional-translation context. The source language is always
  // stated explicitly so the model never has to guess.
  const systemInstruction = buildSystemInstruction(source, target);
  const prompt = buildUserPrompt(
    text,
    source,
    target,
    extraGlossary,
    verified && !verifiedFastPath && (source === "zomi" || target === "zomi")
      ? verified.matches
      : undefined
  );

  return streamSSE(c, async (stream) => {
    // Shared tail for both answer paths (verified fast path and model path):
    // free-tier usage reporting plus the per-user admin log. Best-effort.
    const reportUsageAndLog = async (
      answerText: string,
      answerModel: string,
      answerConfidence: number
    ): Promise<void> => {
      try {
        if (auth) {
          await stream.writeSSE({
            event: "usage",
            data: JSON.stringify({ authed: true, wordsUsed: 0, wordLimit: 0 }),
          });
        } else {
          const db = await getDB();
          const wordsUsed = await recordAnonymousWords(db, anonymousId, countWords(text));
          await stream.writeSSE({
            event: "usage",
            data: JSON.stringify({ authed: false, wordsUsed, wordLimit: FREE_WORD_LIMIT }),
          });
        }
      } catch {
        // usage reporting is best-effort
      }
      if (auth) {
        try {
          const db = await getDB();
          await logTranslation(db, auth, {
            sourceText: text,
            translatedText: answerText,
            targetLanguage: target,
            model: answerModel,
            confidence: answerConfidence,
          });
        } catch {
          // ignore logging failures
        }
      }
    };

    // Instant verified answer: the input is an exact headword in the
    // human-verified dataset and the pair is English ⇄ Zomi. Emit the
    // verified rendering directly — Google-Translate dictionary behavior
    // with zero model latency — and never call a model.
    if (verifiedFastPath && verified) {
      const primary = verified.matches[0];
      const answer = verified.side === "english" ? primary.zomi : primary.english;
      const seen = new Set<string>([answer.trim().toLowerCase()]);
      const alternatives: string[] = [];
      for (const m of verified.matches.slice(1)) {
        const other = verified.side === "english" ? m.zomi : m.english;
        const key = other.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          alternatives.push(other);
        }
        if (alternatives.length >= 2) break;
      }
      await stream.writeSSE({ event: "start", data: JSON.stringify({ model: "verified-dictionary" }) });
      await stream.writeSSE({ event: "delta", data: JSON.stringify({ text: answer }) });
      await stream.writeSSE({ event: "confidence", data: JSON.stringify({ confidence: 100 }) });
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ text: answer, model: "verified-dictionary", confidence: 100, alternatives }),
      });
      await reportUsageAndLog(answer, "verified-dictionary", 100);
      return;
    }

    // Fast-by-default chain: auto-discovered newest models (Flash first),
    // capped to a short list so a failing request never churns through every
    // candidate. Direct Gemini is preferred; the Rork AI proxy is the fallback.
    const modelNames = await translationModelChain();
    const primaryModels = modelNames.slice(0, 3);
    type Attempt = {
      model: string;
      run: (req: ChatRequest, onDelta: (piece: string) => void | Promise<void>) => Promise<string>;
    };
    const attempts: Attempt[] = [];
    if (geminiConfigured()) {
      for (const m of primaryModels) attempts.push({ model: m, run: streamChatCompletionDirect });
    }
    if (aiProxyConfigured()) {
      for (const m of primaryModels.slice(0, 2)) attempts.push({ model: `google/${m}`, run: streamChatCompletion });
    }
    // Whole-request ceiling: if every realistic attempt cannot finish inside
    // this window, answer with an error instead of keeping the client waiting.
    const OVERALL_DEADLINE_MS = 60_000;
    const startedAt = Date.now();
    // Propagate browser/app disconnects: once the user cancels or leaves,
    // upstream model calls are aborted instead of running to completion.
    const clientSignal = c.req.raw.signal;
    for (const { model, run } of attempts) {
      if (clientSignal?.aborted) return;
      if (Date.now() - startedAt > OVERALL_DEADLINE_MS) break;
      // Fail over fast when a model hangs before its first token: if nothing
      // displayable arrives within this window the attempt is aborted and the
      // next model in the chain takes over, instead of the user waiting out
      // the full per-model timeout.
      const FIRST_TOKEN_TIMEOUT_MS = 8_000;
      let gotFirstToken = false;
      const firstTokenController = new AbortController();
      const firstTokenTimer = setTimeout(() => {
        if (!gotFirstToken) firstTokenController.abort();
      }, FIRST_TOKEN_TIMEOUT_MS);
      try {
        await stream.writeSSE({ event: "start", data: JSON.stringify({ model }) });
        // Models may emit JSON ("translation": "...") despite the plain-text
        // instruction; deltas are filtered so users only ever see the words.
        let full = "";
        let emitted = "";
        const requestSignal = clientSignal
          ? AbortSignal.any([clientSignal, firstTokenController.signal])
          : firstTokenController.signal;
        const raw = await run(
          {
            model,
            maxTokens: 8192,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            signal: requestSignal,
          },
          async (piece) => {
            if (!gotFirstToken) {
              gotFirstToken = true;
              clearTimeout(firstTokenTimer);
            }
            full += piece;
            const display = incrementalDisplayText(full);
            if (display === null) return;
            const newPart = display.slice(emitted.length);
            if (newPart) {
              emitted = display;
              await stream.writeSSE({ event: "delta", data: JSON.stringify({ text: newPart }) });
            }
          }
        );
        const trimmed = stripWrapQuotes(extractDisplayText(raw) || emitted);
        const jsonConfidence = extractConfidence(raw);
        const confidence =
          jsonConfidence ??
          (trimmed.length > 0 && !/\b(sorry|cannot|unable)\b/i.test(trimmed)
            ? Math.min(98, 88 + Math.min(10, Math.floor(trimmed.length / 80)))
            : 60);
        const alternatives = extractAlternatives(raw, trimmed);
        await stream.writeSSE({
          event: "confidence",
          data: JSON.stringify({ confidence }),
        });
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ text: trimmed, model, confidence, alternatives }),
        });
        await reportUsageAndLog(trimmed, model, confidence);
        return;
      } catch (err) {
        console.error(`[stream] model ${model} failed`, err);
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ code: "TOO_MANY_REQUESTS", message }),
          });
          return;
        }
      } finally {
        clearTimeout(firstTokenTimer);
      }
    }
    await stream.writeSSE({
      event: "error",
      data: JSON.stringify({ code: "SERVICE_UNAVAILABLE", message: "All models failed" }),
    });
  });
});

/**
 * Cloud sync: stores each signed-in user's personal glossary and saved
 * translations in Supabase so they stay consistent across devices.
 * Auth helpers (JWT bearer verification) live in ./portal.ts.
 */
function sanitizeString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function sanitizeGlossary(input: unknown): unknown[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 200)
    .map((item: Record<string, unknown>) => ({
      id: sanitizeString(item?.id, 64) || `g_${Math.random().toString(36).slice(2)}`,
      term: sanitizeString(item?.term, 200),
      meaning: sanitizeString(item?.meaning, 400),
      createdAt: typeof item?.createdAt === "number" ? item.createdAt : 0,
    }))
    .filter((t) => t.term && t.meaning);
}

function sanitizeLanguageCode(v: unknown): string {
  if (typeof v !== "string") return "english";
  const t = v.trim().toLowerCase().slice(0, 32);
  return /^[a-z][a-z_]*$/.test(t) ? t : "english";
}

function sanitizeTranslations(input: unknown): unknown[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 100)
    .map((item: Record<string, unknown>) => ({
      key: sanitizeString(item?.key, 64),
      sourceText: sanitizeString(item?.sourceText, 5000),
      translatedText: sanitizeString(item?.translatedText, 5000),
      sourceLanguage: sanitizeLanguageCode(item?.sourceLanguage),
      targetLanguage: sanitizeLanguageCode(item?.targetLanguage),
      confidence: typeof item?.confidence === "number" ? Math.round(item.confidence) : 0,
      model: sanitizeString(item?.model, 64) || null,
      createdAt: typeof item?.createdAt === "number" ? item.createdAt : 0,
      isFavorite: item?.isFavorite === true,
    }))
    .filter((t) => t.key && t.sourceText && t.translatedText);
}

app.post("/sync/push", async (c) => {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return c.json({ error: "unauthorized" }, 401);
  const userId = auth.userId;

  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const glossary = sanitizeGlossary(body.glossary);
  const translations = sanitizeTranslations(body.translations);
  const updatedAt = new Date().toISOString();

  try {
    const db = await getDB();
    const res = await db.rpc<{ updatedAt: string }>("upsert_user_sync", {
      p_user_id: userId,
      p_glossary: glossary,
      p_translations: translations,
    });
    return c.json({ success: true, updatedAt: res?.updatedAt ?? updatedAt });
  } catch (err) {
    console.error("[sync] push failed", err);
    return c.json({ error: "sync_failed" }, 500);
  }
});

app.post("/sync/pull", async (c) => {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return c.json({ error: "unauthorized" }, 401);
  const userId = auth.userId;

  try {
    const db = await getDB();
    const row = await db.rpc<{
      user_id: string;
      glossary: unknown[];
      translations: unknown[];
      updated_at: string | null;
    } | null>("get_user_sync", { p_user_id: userId });
    if (!row) {
      return c.json({ exists: false, glossary: [], translations: [], updatedAt: null });
    }
    return c.json({
      exists: true,
      glossary: Array.isArray(row.glossary) ? row.glossary : [],
      translations: Array.isArray(row.translations) ? row.translations : [],
      updatedAt: row.updated_at ?? null,
    });
  } catch (err) {
    console.error("[sync] pull failed", err);
    return c.json({ error: "sync_failed" }, 500);
  }
});

/** Public share links: a completed translation can be posted and viewed by
 * anyone with the link (e.g. https://zomi.me/t/<shareId>). Share ids are
 * generated inside the create_share RPC (unambiguous 10-char alphabet). */

/** Creates a public share link for a completed translation. No account needed. */
app.post("/share", async (c) => {
  let body: {
    sourceText?: string;
    translatedText?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    confidence?: number;
    model?: string;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const sourceText = sanitizeString(body.sourceText, 5000).trim();
  const translatedText = sanitizeString(body.translatedText, 5000).trim();
  if (!sourceText || !translatedText) {
    return c.json({ error: "missing_text" }, 400);
  }

  try {
    const db = await getDB();
    const shareId = await db.rpc<string>("create_share", {
      p_source_text: sourceText,
      p_translated_text: translatedText,
      p_source_language: sanitizeLanguageCode(body.sourceLanguage),
      p_target_language: sanitizeLanguageCode(body.targetLanguage),
      p_confidence:
        typeof body.confidence === "number" ? Math.round(body.confidence) : 0,
      p_model: sanitizeString(body.model, 64) || null,
    });
    if (!shareId) throw new Error("empty share id");
    return c.json({ shareId });
  } catch (err) {
    console.error("[share] create failed", err);
    return c.json({ error: "share_failed" }, 500);
  }
});

/** Public read of a shared translation by its share id. */
app.get("/share/:id", async (c) => {
  const shareId = (c.req.param("id") ?? "").trim().slice(0, 64);
  if (!shareId) return c.json({ error: "missing_id" }, 400);
  try {
    const db = await getDB();
    const { data } = await db.client
      .from("shared_translations")
      .select("*")
      .eq("share_id", shareId)
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({
      shareId: String(row.share_id ?? shareId),
      sourceText: String(row.source_text ?? ""),
      translatedText: String(row.translated_text ?? ""),
      sourceLanguage: sanitizeLanguageCode(row.source_language),
      targetLanguage: sanitizeLanguageCode(row.target_language),
      confidence: Number(row.confidence ?? 0),
      model: (row.model as string | null) ?? null,
      createdAt: String(row.created_at ?? ""),
    });
  } catch (err) {
    console.error("[share] read failed", err);
    return c.json({ error: "share_failed" }, 500);
  }
});

/** Delete the signed-in user's account and all associated data (App Store 5.1.1(v)). */
app.delete("/portal/me", async (c) => {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return c.json({ error: "unauthorized" }, 401);
  try {
    const db = await getDB();
    await deletePortalUser(db, auth);
    return c.json({ success: true });
  } catch (err) {
    console.error("[portal] delete account failed", err);
    return c.json({ error: "delete_failed" }, 500);
  }
});

/** Portal profile for the signed-in user: role, verification status, usage stats. */
app.get("/portal/me", async (c) => {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return c.json({ error: "unauthorized" }, 401);
  try {
    const db = await getDB();
    const profile = await portalProfileFor(db, auth);
    return c.json({
      userId: profile.userId,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      verified: profile.verified,
      verificationStatus: profile.verificationStatus,
      translationCount: profile.translationCount,
      joinedAt: profile.createdAt,
    });
  } catch (err) {
    console.error("[portal] me failed", err);
    return c.json({ error: "portal_failed" }, 500);
  }
});

/** Submit a blue-check verification request for admin review. */
app.post("/portal/verification/request", async (c) => {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return c.json({ error: "unauthorized" }, 401);

  let body: { reason?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500).trim() : "";

  try {
    const db = await getDB();
    await ensurePortalUser(db, auth);
    const res = await db.rpc<{ status: string }>("request_verification", {
      p_user_id: auth.userId,
      p_reason: reason,
    });
    return c.json({ success: true, status: res?.status ?? "pending" });
  } catch (err) {
    console.error("[portal] verification request failed", err);
    return c.json({ error: "request_failed" }, 500);
  }
});

type AdminGuard =
  | { ok: true; auth: AuthInfo; db: ZomiDB }
  | { ok: false; response: Response };

/** Verifies the caller is a signed-in admin before any /api/admin route runs. */
async function requireAdmin(c: Context): Promise<AdminGuard> {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return { ok: false, response: c.json({ error: "unauthorized" }, 401) };
  let db: ZomiDB;
  try {
    db = await getDB();
  } catch {
    return { ok: false, response: c.json({ error: "db_unavailable" }, 500) };
  }
  const profile = await ensurePortalUser(db, auth);
  if (profile.role !== "admin") {
    return { ok: false, response: c.json({ error: "forbidden" }, 403) };
  }
  return { ok: true, auth, db };
}

/** Admin dashboard overview: usage stats, top users, recent translations. */
app.get("/admin/overview", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const overview = await guard.db.rpc<Record<string, unknown>>("admin_overview", {
      p_admin_user_id: guard.auth.userId,
    });
    return c.json(overview ?? {});
  } catch (err) {
    console.error("[admin] overview failed", err);
    return c.json({ error: "overview_failed" }, 500);
  }
});

/** Admin: aggregate AI usage, spend estimate and rate-limit alerts. */
app.get("/admin/usage", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  const snapshot = usageSnapshot();
  let history: unknown[] = [];
  let persistAvailable = false;
  try {
    const res = await guard.db.rpc<{ days: unknown[] }>("admin_gemini_usage", {
      p_admin_user_id: guard.auth.userId,
      p_days: 30,
    });
    if (Array.isArray(res?.days)) {
      history = res.days;
      persistAvailable = true;
    }
  } catch (err) {
    // Expected until backend/sql/gemini-usage.sql is applied in Supabase.
    console.warn(
      "[admin] gemini usage history unavailable:",
      err instanceof Error ? err.message : err
    );
  }
  return c.json({ ...snapshot, history, persistAvailable });
});

/** Admin: list every portal user with roles, verification state, usage. */
app.get("/admin/users", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const res = await guard.db.rpc<{ users: unknown[] }>("admin_users", {
      p_admin_user_id: guard.auth.userId,
    });
    return c.json({ users: res?.users ?? [] });
  } catch (err) {
    console.error("[admin] users failed", err);
    return c.json({ error: "users_failed" }, 500);
  }
});

/** Admin: assign a role (user | moderator | admin) to any account. */
app.post("/admin/role", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;

  let body: { userId?: string; role?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const role = body.role;
  if (!userId) return c.json({ error: "missing_user_id" }, 400);
  if (role !== "user" && role !== "moderator" && role !== "admin") {
    return c.json({ error: "invalid_role" }, 400);
  }
  try {
    await guard.db.rpc("admin_set_role", {
      p_admin_user_id: guard.auth.userId,
      p_target_user_id: userId,
      p_role: role,
    });
    return c.json({ success: true });
  } catch (err) {
    console.error("[admin] role update failed", err);
    return c.json({ error: "role_update_failed" }, 500);
  }
});

/** Admin: approve or reject a verification request (also used to grant directly). */
app.post("/admin/verification", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;

  let body: { userId?: string; decision?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const decision = body.decision;
  if (!userId) return c.json({ error: "missing_user_id" }, 400);
  if (decision !== "approve" && decision !== "reject") {
    return c.json({ error: "invalid_decision" }, 400);
  }
  try {
    await guard.db.rpc("admin_set_verification", {
      p_admin_user_id: guard.auth.userId,
      p_target_user_id: userId,
      p_approve: decision === "approve",
    });
    return c.json({ success: true });
  } catch (err) {
    console.error("[admin] verification decision failed", err);
    return c.json({ error: "verification_failed" }, 500);
  }
});

/** Admin: status of the published dictionary dataset (light — no payload). */
app.get("/admin/dictionary", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const { data } = await guard.db.client
      .from("dictionary_dataset")
      .select("version, count, updated_at, updated_by, note, file_name")
      .eq("id", "latest")
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    if (!row) {
      return c.json({ available: false });
    }
    return c.json({
      available: true,
      version: Number(row.version ?? 0),
      count: Number(row.count ?? 0),
      updatedAt: String(row.updated_at ?? ""),
      updatedBy: String(row.updated_by ?? ""),
      note: (row.note as string | null) || null,
      fileName: (row.file_name as string | null) || null,
    });
  } catch (err) {
    console.error("[admin] dictionary status failed", err);
    return c.json({ error: "dictionary_status_failed" }, 500);
  }
});

const MAX_DICTIONARY_ENTRIES = 100000;
const MAX_DICTIONARY_CELL = 1000;

/** Admin: publish a new version of the dictionary dataset.
 *  Body: { payload: string (JSON with an entries array), fileName?, note? }. */
app.post("/admin/dictionary/import", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;

  let body: { payload?: unknown; fileName?: unknown; note?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (typeof body.payload !== "string" || !body.payload.trim()) {
    return c.json({ error: "missing_payload" }, 400);
  }

  let parsed: { entries?: unknown };
  try {
    parsed = JSON.parse(body.payload);
  } catch {
    return c.json({ error: "invalid_payload_json" }, 400);
  }
  const rawEntries = parsed.entries;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return c.json({ error: "invalid_entries" }, 400);
  }
  if (rawEntries.length > MAX_DICTIONARY_ENTRIES) {
    return c.json({ error: "too_many_entries" }, 400);
  }

  const entries: string[][] = [];
  for (const row of rawEntries) {
    if (!Array.isArray(row) || row.length < 3) {
      return c.json({ error: "invalid_row_format" }, 400);
    }
    const clean = row.map((cell: unknown) => (typeof cell === "string" ? cell : ""));
    const english = clean[0].trim();
    const pos = (clean[1] ?? "").trim();
    const zomi = clean[2].trim();
    const category = clean.length >= 4 && clean[3].trim() ? clean[3].trim() : "other";
    if (!english || !zomi) {
      return c.json({ error: "invalid_row_content" }, 400);
    }
    if ([english, pos, zomi, category].some((v) => v.length > MAX_DICTIONARY_CELL)) {
      return c.json({ error: "row_too_long" }, 400);
    }
    entries.push([english, pos, zomi, category]);
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  try {
    const res = await guard.db.rpc<{ version: number; count: number }>(
      "admin_publish_dictionary",
      {
        p_admin_user_id: guard.auth.userId,
        p_entries: entries,
        p_file_name: fileName,
        p_note: note,
        p_kind: "upload",
      }
    );
    return c.json({
      success: true,
      version: res?.version ?? 0,
      count: res?.count ?? entries.length,
    });
  } catch (err) {
    console.error("[admin] dictionary import failed", err);
    return c.json({ error: "import_failed" }, 500);
  }
});

/** Admin: record that a dataset export was downloaded (CSV or JSON bundle).
 *  Body: { format: "csv" | "json", count, fileName?, scope? ("bundled" | "import") }. */
app.post("/admin/dictionary/export", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  let body: { format?: unknown; count?: unknown; fileName?: unknown; scope?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const format = body.format === "csv" ? "csv" : "json";
  try {
    await guard.db.rpc("admin_log_dictionary_export", {
      p_admin_user_id: guard.auth.userId,
      p_format: format,
      p_count: Number(body.count ?? 0),
      p_file_name: typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "",
      p_scope: body.scope === "import" ? "import" : "bundled",
    });
  } catch (err) {
    console.error("[admin] dictionary export audit failed", err);
  }
  return c.json({ success: true });
});

function entryKey(row: string[]): string {
  return `${row[0].toLowerCase()}|${row[1].toLowerCase()}|${row[2].toLowerCase()}`;
}

/** Validates one [english, pos, zomi, category] row or returns an error code. */
function validateEntryRow(row: unknown): { ok: true; entry: string[] } | { ok: false; code: string } {
  if (!Array.isArray(row) || row.length < 3) return { ok: false, code: "invalid_row_format" };
  const clean = row.map((cell: unknown) => (typeof cell === "string" ? cell : ""));
  const english = clean[0].trim();
  const pos = (clean[1] ?? "").trim();
  const zomi = clean[2].trim();
  const category = clean.length >= 4 && clean[3].trim() ? clean[3].trim() : "other";
  if (!english || !zomi) return { ok: false, code: "invalid_row_content" };
  if ([english, pos, zomi, category].some((v) => v.length > MAX_DICTIONARY_CELL)) {
    return { ok: false, code: "row_too_long" };
  }
  return { ok: true, entry: [english, pos, zomi, category] };
}

/** Loads the published dataset payload as a parsed entries array. */
async function loadPublishedDataset(
  db: ZomiDB
): Promise<{ version: number; entries: string[][] } | null> {
  const { data } = await db.client
    .from("dictionary_dataset")
    .select("version, payload")
    .eq("id", "latest")
    .maybeSingle();
  const row = (data ?? null) as { version?: number; payload?: unknown } | null;
  if (!row || !row.payload) return null;
  const parsed =
    typeof row.payload === "string"
      ? (JSON.parse(row.payload) as { entries?: unknown })
      : (row.payload as { entries?: unknown });
  if (!Array.isArray(parsed.entries)) return null;
  const entries = parsed.entries.map((entry: unknown) =>
    Array.isArray(entry) ? entry.map((cell: unknown) => (typeof cell === "string" ? cell : "")) : []
  );
  return { version: Number(row.version ?? 0), entries };
}

/** Persists a mutated dataset as the next version, records it in the version
 *  history and the audit trail (all inside the admin_publish_dictionary RPC).
 *  kind: "upload" | "edit" | "add" | "delete". */
async function saveDatasetVersion(
  db: ZomiDB,
  auth: AuthInfo,
  entries: string[][],
  kind: string,
  note: string,
  fileName: string
): Promise<number> {
  const res = await db.rpc<{ version: number }>("admin_publish_dictionary", {
    p_admin_user_id: auth.userId,
    p_entries: entries,
    p_file_name: fileName,
    p_note: note,
    p_kind: kind,
  });
  return res?.version ?? 0;
}

/** Admin: full published dataset entries (source of truth for entry editing). */
app.get("/admin/dictionary/entries", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const dataset = await loadPublishedDataset(guard.db);
    if (!dataset) return c.json({ available: false });
    return c.json({
      available: true,
      version: dataset.version,
      count: dataset.entries.length,
      entries: dataset.entries,
    });
  } catch (err) {
    console.error("[admin] dictionary entries failed", err);
    return c.json({ error: "dictionary_entries_failed" }, 500);
  }
});

/** Admin: version history — every upload and entry mutation, newest first. */
app.get("/admin/dictionary/history", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const res = await guard.db.rpc<{ versions: unknown[] }>("admin_dictionary_history", {
      p_admin_user_id: guard.auth.userId,
    });
    return c.json({ versions: res?.versions ?? [] });
  } catch (err) {
    console.error("[admin] dictionary history failed", err);
    return c.json({ error: "dictionary_history_failed" }, 500);
  }
});

/** Admin: add one entry to the published dataset.
 *  Body: { entry: [english, pos, zomi, category] }. */
app.post("/admin/dictionary/entry", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  let body: { entry?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const validated = validateEntryRow(body.entry);
  if (!validated.ok) return c.json({ error: validated.code }, 400);

  try {
    const dataset = await loadPublishedDataset(guard.db);
    if (!dataset) return c.json({ error: "dataset_not_published" }, 409);
    if (dataset.entries.some((row) => entryKey(row) === entryKey(validated.entry))) {
      return c.json({ error: "duplicate_entry" }, 409);
    }
    dataset.entries.push(validated.entry);
    const version = await saveDatasetVersion(
      guard.db,
      guard.auth,
      dataset.entries,
      "add",
      `Added "${validated.entry[0]}"`,
      ""
    );
    return c.json({ success: true, version, count: dataset.entries.length });
  } catch (err) {
    console.error("[admin] dictionary entry add failed", err);
    return c.json({ error: "entry_add_failed" }, 500);
  }
});

/** Admin: edit one entry in the published dataset.
 *  Body: { original: [english, pos, zomi], entry: [english, pos, zomi, category] }. */
app.put("/admin/dictionary/entry", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  let body: { original?: unknown; entry?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const validated = validateEntryRow(body.entry);
  if (!validated.ok) return c.json({ error: validated.code }, 400);
  if (!Array.isArray(body.original) || body.original.length < 3) {
    return c.json({ error: "invalid_row_format" }, 400);
  }
  const originalKey = entryKey(body.original.map((v) => String(v ?? "")));

  try {
    const dataset = await loadPublishedDataset(guard.db);
    if (!dataset) return c.json({ error: "dataset_not_published" }, 409);
    const index = dataset.entries.findIndex((row) => entryKey(row) === originalKey);
    if (index < 0) return c.json({ error: "entry_not_found" }, 404);
    if (dataset.entries.some((row, i) => i !== index && entryKey(row) === entryKey(validated.entry))) {
      return c.json({ error: "duplicate_entry" }, 409);
    }
    dataset.entries[index] = validated.entry;
    const version = await saveDatasetVersion(
      guard.db,
      guard.auth,
      dataset.entries,
      "edit",
      `Edited "${validated.entry[0]}"`,
      ""
    );
    return c.json({ success: true, version, count: dataset.entries.length });
  } catch (err) {
    console.error("[admin] dictionary entry edit failed", err);
    return c.json({ error: "entry_edit_failed" }, 500);
  }
});

/** Admin: delete one entry from the published dataset.
 *  Body: { original: [english, pos, zomi] }. */
app.delete("/admin/dictionary/entry", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  let body: { original?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (!Array.isArray(body.original) || body.original.length < 3) {
    return c.json({ error: "invalid_row_format" }, 400);
  }
  const originalKey = entryKey(body.original.map((v) => String(v ?? "")));

  try {
    const dataset = await loadPublishedDataset(guard.db);
    if (!dataset) return c.json({ error: "dataset_not_published" }, 409);
    const index = dataset.entries.findIndex((row) => entryKey(row) === originalKey);
    if (index < 0) return c.json({ error: "entry_not_found" }, 404);
    if (dataset.entries.length <= 1) return c.json({ error: "last_entry" }, 409);
    const removed = dataset.entries[index];
    dataset.entries.splice(index, 1);
    const version = await saveDatasetVersion(
      guard.db,
      guard.auth,
      dataset.entries,
      "delete",
      `Deleted "${removed[0]}"`,
      ""
    );
    return c.json({ success: true, version, count: dataset.entries.length });
  } catch (err) {
    console.error("[admin] dictionary entry delete failed", err);
    return c.json({ error: "entry_delete_failed" }, 500);
  }
});

/** Admin: central audit log — recent admin actions across the portal. */
app.get("/admin/audit-log", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const res = await guard.db.rpc<{ events: unknown[] }>("admin_audit_log", {
      p_admin_user_id: guard.auth.userId,
    });
    return c.json({ events: res?.events ?? [] });
  } catch (err) {
    console.error("[admin] audit log failed", err);
    return c.json({ error: "audit_log_failed" }, 500);
  }
});

/** Public: latest published dictionary dataset, so app builds can pick up
 *  updates published from the admin dashboard without re-importing by hand.
 *  Also used by the apps at startup to refresh their local dictionary cache. */
/** Parses {"examples":[{"english","zomi"}]} out of raw model output. */
function parseEntryExamples(raw: string): { english: string; zomi: string }[] {
  const s = stripFences(raw).trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(s.slice(start, end + 1)) as { examples?: unknown };
    if (!Array.isArray(parsed.examples)) return [];
    const out: { english: string; zomi: string }[] = [];
    for (const item of parsed.examples) {
      if (!item || typeof item !== "object") continue;
      const english = String((item as Record<string, unknown>).english ?? "").trim().slice(0, 300);
      const zomi = String((item as Record<string, unknown>).zomi ?? "").trim().slice(0, 300);
      if (english && zomi) out.push({ english, zomi });
    }
    return out.slice(0, 4);
  } catch {
    return [];
  }
}

/**
 * Dictionary entry examples (POST). Returns two beginner-friendly example
 * sentences (English + Zomi) for a verified entry, generated by the same
 * Gemini model chain used for translation. Guests are blocked once their
 * anonymous free-tier word allowance is exhausted, but viewing examples
 * does not draw the allowance down.
 */
app.post("/dictionary/examples", async (c) => {
  let body: { english?: string; zomi?: string; pos?: string; anonymousId?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const english = (body.english ?? "").trim().slice(0, 200);
  const zomi = (body.zomi ?? "").trim().slice(0, 200);
  const pos = (body.pos ?? "").trim().slice(0, 100);
  if (!english || !zomi) return c.json({ error: "missing_entry" }, 400);
  if (!aiProxyConfigured() && !geminiConfigured()) {
    return c.json({ error: "ai_unavailable" }, 500);
  }

  const auth = await authFromRequest(c.req.header("authorization"));
  const anonymousId =
    (body.anonymousId ?? "").trim() ||
    (c.req.header("x-anonymous-id") ?? "").trim() ||
    "anonymous";
  if (!auth) {
    try {
      const db = await getDB();
      const wordsUsed = await anonymousWordsUsed(db, anonymousId);
      if (wordsUsed >= FREE_WORD_LIMIT) {
        return c.json(
          { error: "word_limit_reached", wordsUsed, wordLimit: FREE_WORD_LIMIT },
          401
        );
      }
    } catch {
      // Quota store unavailable — fail open rather than blocking examples.
    }
  }

  const modelNames = await translationModelChain();
  type Attempt = {
    model: string;
    run: (req: ChatRequest) => Promise<string>;
  };
  const attempts: Attempt[] = [];
  if (geminiConfigured()) {
    for (const m of modelNames) attempts.push({ model: m, run: chatCompletionDirect });
  }
  if (aiProxyConfigured()) {
    for (const m of modelNames) attempts.push({ model: `google/${m}`, run: chatCompletion });
  }
  const messages = [
    { role: "system" as const, content: ENTRY_EXAMPLES_SYSTEM_INSTRUCTION },
    { role: "user" as const, content: buildEntryExamplesPrompt(english, zomi, pos) },
  ];

  for (const { model, run } of attempts) {
    try {
      const raw = await run({ model, maxTokens: 1024, messages });
      const examples = parseEntryExamples(raw);
      if (examples.length > 0) return c.json({ examples, model });
    } catch (err) {
      console.warn(`[examples] model ${model} failed`, err);
    }
  }
  return c.json({ error: "ai_unavailable" }, 502);
});

app.get("/dictionary/latest", async (c) => {
  try {
    const db = await getDB();
    const { data } = await db.client
      .from("dictionary_dataset")
      .select("version, count, updated_at, payload")
      .eq("id", "latest")
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    if (!row) return c.json({ available: false });
    return c.json({
      available: true,
      version: Number(row.version ?? 0),
      count: Number(row.count ?? 0),
      updatedAt: String(row.updated_at ?? ""),
      payload: row.payload ? JSON.stringify(row.payload) : "",
    });
  } catch (err) {
    console.error("[public] dictionary latest failed", err);
    return c.json({ available: false });
  }
});

export default app;
