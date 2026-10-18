import { applyEnv } from "./env-shim";
import { Hono } from "hono";
import api from "../expo/backend/hono";
import { flushUsageNow } from "../expo/backend/usage";
import { flushProblemsNow } from "../expo/backend/problems";

/**
 * Production host for the Zomi Translator API.
 * The same Hono app that runs in development is mounted under /api, so every
 * client (iOS, Android, web, Expo) uses identical paths.
 * Persistence (usage history, block list) goes through secret-gated Supabase
 * RPCs defined in backend/sql/ (gemini-usage.sql, abuse-protection.sql).
 * Note: the verified dictionary is bundled from expo/constants/dictionary.json;
 * edit this file (or any under functions/) to redeploy after data changes.
 * Each instance re-reads the block list every 30s so admin blocks reach all
 * instances within ~30s. Problem reports (expo/backend/problems.ts) are
 * written during the request and also flushed here as a backstop.
 */
const root = new Hono();
root.get("/", (c) => c.json({ ok: true, service: "zomi-translator" }));
root.route("/api", api);

type Ctx = { waitUntil(promise: Promise<unknown>): void; passThroughOnException?(): void };

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: Ctx): Promise<Response> {
    applyEnv(env);
    const response = await root.fetch(request, env, ctx as never);
    // Let usage aggregates and problem reports flush after responses complete.
    ctx.waitUntil(
      new Promise<void>((resolve) => setTimeout(resolve, 6_000)).then(() =>
        Promise.all([
          flushUsageNow().catch(() => undefined),
          flushProblemsNow().catch(() => undefined),
        ])
      )
    );
    return response;
  },
};
