/**
 * Privacy-safe problem reports (crashes, errors, slow screens).
 *
 * Clients send a short error signature; the server scrubs it again, buckets
 * identical reports in memory, and flushes aggregated counts to Supabase
 * (`record_client_problems`, see backend/sql/problem-reports.sql).
 * Nothing that identifies a person or contains translated text is kept:
 * no user/device ids, no network address, quoted strings and numbers removed.
 */

export type ProblemKind = "crash" | "error" | "slow";

export interface ProblemReport {
  platform: string;
  appVersion: string;
  kind: ProblemKind;
  signature: string;
  screen: string;
}

const PLATFORMS = new Set(["ios", "android", "web", "expo"]);
const MAX_PENDING = 500;

/**
 * Removes anything that could carry user content from an error message:
 * quoted text, emails, URLs' query strings, long numbers and ids.
 */
export function scrubSignature(raw: string): string {
  return raw
    .replace(/(["'`“”‘’])(?:(?!\1).){0,400}\1/g, "…")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>")
    .replace(/(https?:\/\/[^\s?#]+)[?#]\S*/g, "$1")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "<id>")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "<id>")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Validates and normalizes one client report; returns null when unusable. */
export function parseProblem(input: unknown): ProblemReport | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const platform = typeof o.platform === "string" ? o.platform.toLowerCase() : "";
  if (!PLATFORMS.has(platform)) return null;
  const kind: ProblemKind = o.kind === "crash" || o.kind === "slow" ? o.kind : "error";
  const signature = scrubSignature(typeof o.signature === "string" ? o.signature : "");
  if (!signature) return null;
  const appVersion = typeof o.appVersion === "string" ? o.appVersion.replace(/[^\w.() -]/g, "").slice(0, 24) : "";
  const screen = typeof o.screen === "string" ? o.screen.replace(/[^\w/ -]/g, "").slice(0, 48) : "";
  return { platform, appVersion, kind, signature, screen };
}

const pending = new Map<string, ProblemReport & { count: number }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Buckets a report in memory and schedules a flush within ~5 seconds. */
export function recordProblem(report: ProblemReport): void {
  const key = [report.platform, report.appVersion, report.kind, report.signature].join("|");
  const existing = pending.get(key);
  if (existing) {
    existing.count += 1;
  } else if (pending.size < MAX_PENDING) {
    pending.set(key, { ...report, count: 1 });
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushProblemsNow();
    }, 5_000);
  }
}

let inFlight: Promise<void> | null = null;

/**
 * Writes all pending buckets to the database. Safe to call any time; also
 * waits for a flush already in progress so short-lived runtimes don't drop it.
 */
export async function flushProblemsNow(): Promise<void> {
  if (inFlight) await inFlight;
  if (pending.size === 0) return;
  const items = [...pending.values()];
  pending.clear();
  inFlight = (async () => {
    try {
      const { getDB } = await import("./db/client");
      const db = await getDB();
      await db.rpc("record_client_problems", { p_items: items });
    } catch (err) {
      console.warn("[problems] flush failed:", err instanceof Error ? err.message : err);
    }
  })();
  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}
