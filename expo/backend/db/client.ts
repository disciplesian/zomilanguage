import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase access layer for the Zomi backend.
 *
 * Sensitive tables (portal users, translation logs, sync data, admin audit
 * trail, dictionary versioning) have RLS enabled with no public policies —
 * they are only reachable through SECURITY DEFINER RPC functions that verify
 * ZOMI_BACKEND_DB_SECRET, a server-only credential that is never inlined in
 * client bundles. Public, non-sensitive reads (published dictionary dataset,
 * shared translation links) use plain table selects with read-only policies.
 */
export interface ZomiDB {
  /** Calls a SECURITY DEFINER RPC, injecting the backend secret. */
  rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<T | null>;
  /** Raw table access (only for tables with public read policies). */
  readonly client: SupabaseClient;
}

let client: SupabaseClient | null = null;

function resolveConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    console.error("[DB] Missing Supabase credentials:", {
      hasUrl: !!url,
      hasKey: !!key,
    });
    throw new Error("Supabase credentials not configured");
  }
  return { url, key };
}

function getSecret(): string {
  const secret = process.env.ZOMI_BACKEND_DB_SECRET;
  if (!secret) {
    throw new Error("ZOMI_BACKEND_DB_SECRET not configured");
  }
  return secret;
}

class ZomiDBImpl implements ZomiDB {
  constructor(private readonly supabase: SupabaseClient) {}

  async rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T | null> {
    const { data, error } = await this.supabase.rpc(fn, {
      p_secret: getSecret(),
      ...params,
    });
    if (error) throw new Error(error.message);
    return (data ?? null) as T | null;
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}

/** Returns the shared backend DB handle (creates the client on first use). */
export async function getDB(): Promise<ZomiDB> {
  if (!client) {
    const { url, key } = resolveConfig();
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return new ZomiDBImpl(client);
}
