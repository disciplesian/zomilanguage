import { getStoredAccessToken } from './authStorage';
import type { GlossaryTerm } from '@/contexts/GlossaryContext';
import type { CachedTranslation } from '@/contexts/TranslationCacheContext';

const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();

export interface RemoteSyncPayload {
  exists: boolean;
  glossary: GlossaryTerm[];
  translations: CachedTranslation[];
  updatedAt: string | null;
}

async function authedFetch(path: string, body: unknown): Promise<Response> {
  const token = await getStoredAccessToken();
  if (!token) throw new Error('not_signed_in');
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/** Fetch the signed-in user's synced glossary + translations. Null on failure. */
export async function pullSync(): Promise<RemoteSyncPayload | null> {
  try {
    const res = await authedFetch('/api/sync/pull', {});
    if (!res.ok) return null;
    return (await res.json()) as RemoteSyncPayload;
  } catch (err) {
    console.log('[sync] pull failed:', err);
    return null;
  }
}

/** Upload the local glossary + saved translations for the signed-in user. */
export async function pushSync(
  glossary: GlossaryTerm[],
  translations: CachedTranslation[]
): Promise<boolean> {
  try {
    const res = await authedFetch('/api/sync/push', {
      glossary,
      translations,
      updatedAt: Date.now(),
    });
    return res.ok;
  } catch (err) {
    console.log('[sync] push failed:', err);
    return false;
  }
}

/** Union-merge glossaries by term (case-insensitive); the newest edit wins. */
export function mergeGlossaries(local: GlossaryTerm[], remote: GlossaryTerm[]): GlossaryTerm[] {
  const byTerm = new Map<string, GlossaryTerm>();
  for (const t of [...remote, ...local]) {
    const key = t.term.trim().toLowerCase();
    const existing = byTerm.get(key);
    if (!existing || t.createdAt >= existing.createdAt) byTerm.set(key, t);
  }
  return [...byTerm.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
}

/** Union-merge saved translations by cache key; the newest entry wins. */
export function mergeTranslations(
  local: CachedTranslation[],
  remote: CachedTranslation[]
): CachedTranslation[] {
  const byKey = new Map<string, CachedTranslation>();
  for (const t of [...remote, ...local]) {
    const existing = byKey.get(t.key);
    if (!existing || t.createdAt >= existing.createdAt) byKey.set(t.key, t);
  }
  return [...byKey.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
}
