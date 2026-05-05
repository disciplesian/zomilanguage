import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { GoogleGenAI } from "@google/genai";
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
  let body: { text?: string; targetLanguage?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const text = (body.text ?? "").trim();
  const target = (body.targetLanguage ?? "english").trim();
  if (!text) return c.json({ error: "missing_text" }, 400);
  if (!apiKey) return c.json({ error: "api_key_missing" }, 500);

  const targetLang = target === "zomi" ? "Tedim Zomi (CTD, ISO 639-3: ctd)" : target;
  const ai = new GoogleGenAI({ apiKey });
  const glossaryJson = JSON.stringify({ glossary: ZOMI_GLOSSARY, examples: ZOMI_EXAMPLES });
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
    const models = [
      "gemini-3.1-pro-preview",
      "gemini-3-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ];
    for (const model of models) {
      try {
        const iter = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            topP: 0.8,
            systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
          },
        });
        await stream.writeSSE({ event: "start", data: JSON.stringify({ model }) });
        let full = "";
        for await (const chunk of iter) {
          const piece = chunk.text ?? "";
          if (!piece) continue;
          full += piece;
          await stream.writeSSE({ event: "delta", data: JSON.stringify({ text: piece }) });
        }
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ text: full.trim(), model }),
        });
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
      }
    }
    await stream.writeSSE({
      event: "error",
      data: JSON.stringify({ code: "SERVICE_UNAVAILABLE", message: "All models failed" }),
    });
  });
});

export default app;
