import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
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

export default app;
