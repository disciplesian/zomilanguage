import Surreal from "surrealdb.js";
import { getDB } from "./db/client";

/**
 * Shared portal auth + user management for the Zomi Language Portal.
 * Used by both the Hono REST endpoints and the tRPC translation route.
 */

export interface AuthInfo {
  userId: string;
  email: string;
  name: string;
}

export interface PortalUserRecord {
  userId: string;
  email: string;
  name: string | null;
  role: "user" | "moderator" | "admin";
  verified: boolean;
  verificationStatus: "none" | "pending" | "approved" | "rejected";
  verificationReason: string;
  requestedAt: string | null;
  createdAt: string;
}

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

/**
 * Extracts the signed-in user from a Rork Auth JWT bearer token.
 * The signature is verified with RORK_AUTH_SECRET_KEY (HS256) when the secret
 * is available in this runtime; otherwise the payload claims are still
 * validated (sub + exp).
 */
export async function authFromRequest(header: string | undefined): Promise<AuthInfo | null> {
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let payload: { sub?: string; email?: string; name?: string; exp?: number };
  try {
    payload = JSON.parse(b64UrlDecode(parts[1]));
  } catch {
    return null;
  }
  if (!payload.sub) return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

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
      console.warn("[portal] JWT signature verification skipped:", err);
    }
  }
  return {
    userId: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : "",
  };
}

/**
 * Fetches (or lazily creates) the portal profile for a signed-in user.
 * The very first user to register becomes the admin — this bootstraps the
 * role system without any manual setup.
 */
export async function ensurePortalUser(db: Surreal, auth: AuthInfo): Promise<PortalUserRecord> {
  const existing = await db.query<[Record<string, unknown>[]]>(
    "SELECT * FROM portal_users WHERE userId = $userId LIMIT 1",
    { userId: auth.userId }
  );
  const row = existing[0]?.[0];
  if (row) return row as unknown as PortalUserRecord;

  let total = 0;
  try {
    const countRes = await db.query<[{ total: number }[]]>(
      "SELECT count() AS total FROM portal_users GROUP ALL"
    );
    total = Number(countRes[0]?.[0]?.total ?? 0);
  } catch {
    total = 0;
  }

  const record = {
    userId: auth.userId,
    email: auth.email.slice(0, 200),
    name: auth.name.slice(0, 120),
    role: total === 0 ? "admin" : "user",
    verified: false,
    verificationStatus: "none",
    verificationReason: "",
    requestedAt: null,
    createdAt: new Date().toISOString(),
  };
  await db.create("portal_users", record);
  return record as unknown as PortalUserRecord;
}

/** Translation count for a single user (used by /api/portal/me). */
export async function translationCountFor(db: Surreal, userId: string): Promise<number> {
  try {
    const res = await db.query<[{ total: number }[]]>(
      "SELECT count() AS total FROM translation_logs WHERE userId = $userId GROUP ALL",
      { userId }
    );
    return Number(res[0]?.[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Persists one completed translation against the signed-in user's account.
 * Failures are non-fatal — logging must never break a translation.
 */
export async function logTranslation(
  db: Surreal,
  auth: AuthInfo,
  entry: {
    sourceText: string;
    translatedText: string;
    targetLanguage: string;
    model: string | null;
    confidence: number;
  }
): Promise<void> {
  try {
    await ensurePortalUser(db, auth);
    const wordCount = entry.sourceText.trim() ? entry.sourceText.trim().split(/\s+/).length : 0;
    await db.create("translation_logs", {
      userId: auth.userId,
      sourceText: entry.sourceText.slice(0, 5000),
      translatedText: entry.translatedText.slice(0, 5000),
      targetLanguage: String(entry.targetLanguage).slice(0, 32),
      model: entry.model ? String(entry.model).slice(0, 64) : null,
      confidence: Math.max(0, Math.min(100, Math.round(entry.confidence))),
      wordCount,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[portal] translation log failed:", err);
  }
}

/** Full portal profile with usage stats, for the signed-in user. */
export async function portalProfileFor(db: Surreal, auth: AuthInfo): Promise<PortalUserRecord & { translationCount: number }> {
  const profile = await ensurePortalUser(db, auth);
  const translationCount = await translationCountFor(db, auth.userId);
  return { ...profile, translationCount };
}
