import type { ZomiDB } from "./db/client";

/**
 * Shared portal auth + user management for the Zomi Language Portal.
 * Used by both the Hono REST endpoints and the tRPC translation route.
 * All persistence goes through secret-guarded SECURITY DEFINER RPCs.
 */

/** Free tier: AI-translated words a guest device may use per day (resets daily, UTC). */
export const FREE_WORD_LIMIT = 1000;

/** Daily quota key: the counter resets every UTC day without any schema change. */
function dailyKey(anonymousId: string): string {
  return `${anonymousId}@${new Date().toISOString().slice(0, 10)}`;
}

/** Splits text into words the same way on every quota check. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Words translated so far by an anonymous visitor (0 when unknown). */
export async function anonymousWordsUsed(db: ZomiDB, anonymousId: string): Promise<number> {
  try {
    const words = await db.rpc<number>("get_anonymous_words", {
      p_anonymous_id: dailyKey(anonymousId),
    });
    return Math.max(0, Number(words ?? 0));
  } catch {
    return 0;
  }
}

/**
 * Adds `words` to a guest device's daily counter and returns the new
 * total. Failures are non-fatal — quota tracking must never break a translation.
 */
export async function recordAnonymousWords(
  db: ZomiDB,
  anonymousId: string,
  words: number
): Promise<number> {
  if (words <= 0) return anonymousWordsUsed(db, anonymousId);
  try {
    const total = await db.rpc<number>("increment_anonymous_words", {
      p_anonymous_id: dailyKey(anonymousId),
      p_words: words,
    });
    return Math.max(0, Number(total ?? 0));
  } catch (err) {
    console.warn("[portal] anonymous usage update failed:", err);
    return 0;
  }
}

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

/** Raw portal_users row as returned by Postgres (snake_case columns). */
interface PortalUserRow {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  verified: boolean;
  verification_status: string;
  verification_reason: string;
  requested_at: string | null;
  created_at: string;
}

function mapUserRow(row: PortalUserRow): PortalUserRecord {
  return {
    userId: String(row.user_id ?? ""),
    email: String(row.email ?? ""),
    name: row.name ?? null,
    role: (row.role as PortalUserRecord["role"]) ?? "user",
    verified: row.verified === true,
    verificationStatus:
      (row.verification_status as PortalUserRecord["verificationStatus"]) ?? "none",
    verificationReason: String(row.verification_reason ?? ""),
    requestedAt: row.requested_at ?? null,
    createdAt: String(row.created_at ?? ""),
  };
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
 * role system without any manual setup (enforced inside ensure_portal_user).
 */
export async function ensurePortalUser(db: ZomiDB, auth: AuthInfo): Promise<PortalUserRecord> {
  const row = await db.rpc<PortalUserRow>("ensure_portal_user", {
    p_user_id: auth.userId,
    p_email: auth.email,
    p_name: auth.name,
  });
  if (!row) throw new Error("Failed to load portal user");
  return mapUserRow(row);
}

/** Translation count for a single user (used by /api/portal/me). */
export async function translationCountFor(db: ZomiDB, userId: string): Promise<number> {
  try {
    const count = await db.rpc<number>("count_user_translations", {
      p_user_id: userId,
    });
    return Math.max(0, Number(count ?? 0));
  } catch {
    return 0;
  }
}

/**
 * Persists one completed translation against the signed-in user's account.
 * Failures are non-fatal — logging must never break a translation.
 */
export async function logTranslation(
  db: ZomiDB,
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
    await db.rpc("log_translation", {
      p_user_id: auth.userId,
      p_email: auth.email,
      p_name: auth.name,
      p_source_text: entry.sourceText,
      p_translated_text: entry.translatedText,
      p_target_language: entry.targetLanguage,
      p_model: entry.model,
      p_confidence: Math.round(entry.confidence),
      p_word_count: countWords(entry.sourceText),
    });
  } catch (err) {
    console.warn("[portal] translation log failed:", err);
  }
}

/** Full portal profile with usage stats, for the signed-in user. */
export async function portalProfileFor(
  db: ZomiDB,
  auth: AuthInfo
): Promise<PortalUserRecord & { translationCount: number }> {
  const profile = await ensurePortalUser(db, auth);
  const translationCount = await translationCountFor(db, auth.userId);
  return { ...profile, translationCount };
}

/**
 * Permanently deletes a signed-in user's account and all associated data.
 * This is required for App Store guideline 5.1.1(v) account deletion.
 */
export async function deletePortalUser(db: ZomiDB, auth: AuthInfo): Promise<void> {
  await db.rpc("delete_user_data", { p_user_id: auth.userId });
}
