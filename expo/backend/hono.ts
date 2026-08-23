import { Hono } from "hono";
import type { Context } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type Surreal from "surrealdb.js";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDB } from "./db/client";
import {
  FREE_WORD_LIMIT,
  anonymousWordsUsed,
  authFromRequest,
  countWords,
  ensurePortalUser,
  portalProfileFor,
  logTranslation,
  recordAnonymousWords,
  type AuthInfo,
} from "./portal";
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
 * Delivers Gemini output token-by-token so long translations feel instant.
 * Falls back gracefully if the SDK or API key is unavailable.
 */
app.post("/translate/stream", async (c) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let body: {
    text?: string;
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
        // Report the caller's free-tier usage so clients can show remaining words.
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
        // Per-user usage log for the admin dashboard. Non-fatal on failure.
        if (auth) {
          try {
            const db = await getDB();
            await logTranslation(db, auth, {
              sourceText: text,
              translatedText: trimmed,
              targetLanguage: target,
              model: spec.model,
              confidence,
            });
          } catch {
            // ignore logging failures
          }
        }
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
    await db.query("DELETE FROM user_sync WHERE userId = $userId", { userId });
    await db.create("user_sync", { userId, glossary, translations, updatedAt });
    return c.json({ success: true, updatedAt });
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
    const profile = await ensurePortalUser(db, auth);
    if (profile.verified) return c.json({ success: true, status: "approved" });
    if (profile.verificationStatus === "pending") {
      return c.json({ success: true, status: "pending" });
    }
    await db.query(
      "UPDATE portal_users SET verificationStatus = 'pending', verificationReason = $reason, requestedAt = $now WHERE userId = $userId",
      { reason, now: new Date().toISOString(), userId: auth.userId }
    );
    return c.json({ success: true, status: "pending" });
  } catch (err) {
    console.error("[portal] verification request failed", err);
    return c.json({ error: "request_failed" }, 500);
  }
});

type AdminGuard =
  | { ok: true; auth: AuthInfo; db: Surreal }
  | { ok: false; response: Response };

/** Verifies the caller is a signed-in admin before any /api/admin route runs. */
async function requireAdmin(c: Context): Promise<AdminGuard> {
  const auth = await authFromRequest(c.req.header("authorization"));
  if (!auth) return { ok: false, response: c.json({ error: "unauthorized" }, 401) };
  let db: Surreal;
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
  const { db } = guard;
  try {
    const usersRes = await db.query<[Record<string, unknown>[]]>("SELECT * FROM portal_users");
    const counts = await db.query<[{ userId: string; total: number }[]]>(
      "SELECT userId, count() AS total FROM translation_logs GROUP BY userId"
    );

    let totalTranslations = 0;
    const countMap = new Map<string, number>();
    for (const row of counts[0] ?? []) {
      const total = Number(row.total ?? 0);
      totalTranslations += total;
      if (row.userId) countMap.set(String(row.userId), total);
    }

    let translationsToday = 0;
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const todayRes = await db.query<[{ total: number }[]]>(
        "SELECT count() AS total FROM translation_logs WHERE createdAt >= $start GROUP ALL",
        { start: start.toISOString() }
      );
      translationsToday = Number(todayRes[0]?.[0]?.total ?? 0);
    } catch {
      translationsToday = 0;
    }

    let recent: Record<string, unknown>[] = [];
    try {
      const recentRes = await db.query<[Record<string, unknown>[]]>(
        "SELECT * FROM translation_logs ORDER BY createdAt DESC LIMIT 50"
      );
      recent = recentRes[0] ?? [];
    } catch {
      recent = [];
    }

    const userList = usersRes[0] ?? [];
    const userById = new Map(userList.map((u) => [String(u.userId), u]));
    const topUsers = [...countMap.entries()]
      .map(([userId, total]) => {
        const u = userById.get(userId);
        return {
          userId,
          email: String(u?.email ?? ""),
          name: (u?.name as string | null) ?? null,
          total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return c.json({
      totalUsers: userList.length,
      totalTranslations,
      translationsToday,
      verifiedUsers: userList.filter((u) => u.verified === true).length,
      pendingVerifications: userList.filter((u) => u.verificationStatus === "pending").length,
      topUsers,
      recentTranslations: recent.map((r) => {
        const u = userById.get(String(r.userId));
        return {
          userId: String(r.userId ?? ""),
          email: String(u?.email ?? ""),
          name: (u?.name as string | null) ?? null,
          sourceText: String(r.sourceText ?? ""),
          translatedText: String(r.translatedText ?? ""),
          targetLanguage: String(r.targetLanguage ?? ""),
          model: (r.model as string | null) ?? null,
          confidence: Number(r.confidence ?? 0),
          wordCount: Number(r.wordCount ?? 0),
          createdAt: String(r.createdAt ?? ""),
        };
      }),
    });
  } catch (err) {
    console.error("[admin] overview failed", err);
    return c.json({ error: "overview_failed" }, 500);
  }
});

/** Admin: list every portal user with roles, verification state, usage. */
app.get("/admin/users", async (c) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  try {
    const { db } = guard;
    const usersRes = await db.query<[Record<string, unknown>[]]>("SELECT * FROM portal_users");
    const counts = await db.query<[{ userId: string; total: number }[]]>(
      "SELECT userId, count() AS total FROM translation_logs GROUP BY userId"
    );
    const countMap = new Map<string, number>();
    for (const row of counts[0] ?? []) {
      if (row.userId) countMap.set(String(row.userId), Number(row.total ?? 0));
    }
    const users = (usersRes[0] ?? []).map((u) => ({
      userId: String(u.userId ?? ""),
      email: String(u.email ?? ""),
      name: (u.name as string | null) ?? null,
      role: String(u.role ?? "user"),
      verified: u.verified === true,
      verificationStatus: String(u.verificationStatus ?? "none"),
      verificationReason: String(u.verificationReason ?? ""),
      requestedAt: (u.requestedAt as string | null) ?? null,
      translationCount: countMap.get(String(u.userId)) ?? 0,
      joinedAt: String(u.createdAt ?? ""),
    }));
    return c.json({ users });
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
    await guard.db.query("UPDATE portal_users SET role = $role WHERE userId = $userId", {
      role,
      userId,
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
    if (decision === "approve") {
      await guard.db.query(
        "UPDATE portal_users SET verified = true, verificationStatus = 'approved' WHERE userId = $userId",
        { userId }
      );
    } else {
      await guard.db.query(
        "UPDATE portal_users SET verified = false, verificationStatus = 'rejected' WHERE userId = $userId",
        { userId }
      );
    }
    return c.json({ success: true });
  } catch (err) {
    console.error("[admin] verification decision failed", err);
    return c.json({ error: "verification_failed" }, 500);
  }
});

export default app;
