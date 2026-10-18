import { applyEnv } from "./env-shim";
import { Hono } from "hono";
import api from "../expo/backend/hono";
import { flushUsageNow } from "../expo/backend/usage";

/**
 * Production host for the Zomi Translator API.
 * The same Hono app that runs in development is mounted under /api, so every
 * client (iOS, Android, web, Expo) uses identical paths.
 */
const root = new Hono();
root.get("/", (c) => c.json({ ok: true, service: "zomi-translator" }));
root.route("/api", api);

type Ctx = { waitUntil(promise: Promise<unknown>): void; passThroughOnException?(): void };

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: Ctx): Promise<Response> {
    applyEnv(env);
    const response = await root.fetch(request, env, ctx as never);
    // Let usage aggregates flush after streaming translations complete.
    ctx.waitUntil(
      new Promise<void>((resolve) => setTimeout(resolve, 6_000)).then(() =>
        flushUsageNow().catch(() => undefined)
      )
    );
    return response;
  },
};
