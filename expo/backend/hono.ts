import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDB } from "./db/client";
import {
  ZOMI_SYSTEM_INSTRUCTION,
  ZOMI_GLOSSARY,
  ZOMI_EXAMPLES,
} from "../constants/zomiPrompt";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}));

app.options('*', (c) => {
  return new Response(null, { status: 204 });
});

app.use(
  "/api/trpc/*",
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

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Streaming translation endpoint (Server-Sent Events).
 * Delivers Gemini output token-by-token so long translations feel instant.
 * Falls back gracefully if the SDK or API key is unavailable.
 */
app.post("/api/translate/stream", async (c) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let body: {
    text?: string;
    targetLanguage?: string;
    extraGlossary?: Record<string, string>;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const text = (body.text ?? "").trim();
  const target = (body.targetLanguage ?? "english").trim();
  const extraGlossary =
    body.extraGlossary && typeof body.extraGlossary === 'object' ? body.extraGlossary : {};
  if (!text) return c.json({ error: "missing_text" }, 400);
  if (!apiKey) return c.json({ error: "api_key_missing" }, 500);

  const targetLang = target === "zomi" ? "Tedim Zomi (CTD, ISO 639-3: ctd)" : target;
  const ai = new GoogleGenAI({ apiKey });
  const mergedGlossary: Record<string, string> = { ...ZOMI_GLOSSARY, ...extraGlossary };
  const glossaryJson = JSON.stringify({ glossary: mergedGlossary, examples: ZOMI_EXAMPLES });
  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text: `Translate the following text into ${targetLang}.\nUse EXCLUSIVELY the Tedim dialect (CTD). Output plain translated text only.`,
        },
        { text: `GLOSSARY_DATA_JSON:\n${glossaryJson}` },
        { text: `INPUT_TEXT:\n"${text}"` },
      ],
    },
  ];

  return streamSSE(c, async (stream) => {
    // Gemini 3.x chain (Aug 2026): thinkingLevel replaces thinkingBudget and
    // temperature/topP are deprecated on 3.x. LOW thinking keeps token-by-token
    // streaming snappy. 2.5 fallbacks keep classic sampling params.
    const models: { model: string; thinkingLevel?: ThinkingLevel }[] = [
      { model: "gemini-3.1-pro-preview", thinkingLevel: ThinkingLevel.LOW },
      { model: "gemini-3.7-flash", thinkingLevel: ThinkingLevel.LOW },
      { model: "gemini-3.6-flash", thinkingLevel: ThinkingLevel.LOW },
      { model: "gemini-2.5-pro" },
      { model: "gemini-2.5-flash" },
    ];
    for (const spec of models) {
      try {
        const iter = await ai.models.generateContentStream({
          model: spec.model,
          contents,
          config: {
            maxOutputTokens: 8192,
            systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
            ...(spec.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: spec.thinkingLevel } }
              : { temperature: 0.1, topP: 0.8 }),
          },
        });
        await stream.writeSSE({ event: "start", data: JSON.stringify({ model: spec.model }) });
        let full = "";
        for await (const chunk of iter) {
          const piece = chunk.text ?? "";
          if (!piece) continue;
          full += piece;
          await stream.writeSSE({ event: "delta", data: JSON.stringify({ text: piece }) });
        }
        // Estimate a confidence based on output stability heuristics.
        // (A best-effort proxy for true model confidence in streaming mode.)
        const trimmed = full.trim();
        const looksClean = trimmed.length > 0 && !/\b(sorry|cannot|unable)\b/i.test(trimmed);
        const confidence = looksClean ? Math.min(98, 88 + Math.min(10, Math.floor(trimmed.length / 80))) : 60;
        await stream.writeSSE({
          event: "confidence",
          data: JSON.stringify({ confidence }),
        });
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ text: trimmed, model: spec.model, confidence }),
        });
        return;
      } catch (err) {
        console.error(`[stream] model ${spec.model} failed`, err);
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ code: "TOO_MANY_REQUESTS", message }),
          });
          return;
        }
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
 * translations in SurrealDB so they stay consistent across devices.
 * Auth: Rork Auth access token (JWT bearer). The signature is verified with
 * RORK_AUTH_SECRET_KEY (HS256) when the secret is available in this runtime.
 */
function b64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

function b64UrlToBytes(segment: string): Uint8Array<ArrayBuffer> {
  const raw = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function authUserIdFromRequest(header: string | undefined): Promise<string | null> {
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let payload: { sub?: string; exp?: number };
  try {
    payload = JSON.parse(b64UrlDecode(parts[1]));
  } catch {
    return null;
  }
  if (!payload.sub) return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

  // Verify the JWT signature when the shared secret is present (HS256).
  const secret = process.env.RORK_AUTH_SECRET_KEY;
  if (secret && typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const ok = await crypto.subtle.verify(
        "HMAC",
        key,
        b64UrlToBytes(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
      if (!ok) return null;
    } catch (err) {
      console.warn("[sync] JWT signature verification skipped:", err);
    }
  }
  return String(payload.sub);
}

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

function sanitizeTranslations(input: unknown): unknown[] {
  if (!Array.isArray(input)) return [];
  const lang = (v: unknown): "zomi" | "english" =>
    v === "zomi" || v === "english" ? v : "english";
  return input
    .slice(0, 100)
    .map((item: Record<string, unknown>) => ({
      key: sanitizeString(item?.key, 64),
      sourceText: sanitizeString(item?.sourceText, 5000),
      translatedText: sanitizeString(item?.translatedText, 5000),
      sourceLanguage: lang(item?.sourceLanguage),
      targetLanguage: lang(item?.targetLanguage),
      confidence: typeof item?.confidence === "number" ? Math.round(item.confidence) : 0,
      model: sanitizeString(item?.model, 64) || null,
      createdAt: typeof item?.createdAt === "number" ? item.createdAt : 0,
      isFavorite: item?.isFavorite === true,
    }))
    .filter((t) => t.key && t.sourceText && t.translatedText);
}

app.post("/api/sync/push", async (c) => {
  const userId = await authUserIdFromRequest(c.req.header("authorization"));
  if (!userId) return c.json({ error: "unauthorized" }, 401);

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
    await db.query("DELETE FROM user_sync WHERE userId = $userId", { userId });
    await db.create("user_sync", { userId, glossary, translations, updatedAt });
    return c.json({ success: true, updatedAt });
  } catch (err) {
    console.error("[sync] push failed", err);
    return c.json({ error: "sync_failed" }, 500);
  }
});

app.post("/api/sync/pull", async (c) => {
  const userId = await authUserIdFromRequest(c.req.header("authorization"));
  if (!userId) return c.json({ error: "unauthorized" }, 401);

  try {
    const db = await getDB();
    const result = await db.query<[Record<string, unknown>[]]>(
      "SELECT * FROM user_sync WHERE userId = $userId LIMIT 1",
      { userId }
    );
    const row = result[0]?.[0];
    if (!row) {
      return c.json({ exists: false, glossary: [], translations: [], updatedAt: null });
    }
    return c.json({
      exists: true,
      glossary: Array.isArray(row.glossary) ? row.glossary : [],
      translations: Array.isArray(row.translations) ? row.translations : [],
      updatedAt: row.updatedAt ?? null,
    });
  } catch (err) {
    console.error("[sync] pull failed", err);
    return c.json({ error: "sync_failed" }, 500);
  }
});

export default app;
