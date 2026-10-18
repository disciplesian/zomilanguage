/**
 * Public share links for completed translations.
 * POSTs the translation to the backend, which stores it and returns a
 * unique id; anyone can then view it at https://zomilanguage.rork.app/t/<shareId>.
 */

const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL || process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://zomilanguage-backend.rork.app';
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();

const SHARE_WEB_BASE = 'https://zomilanguage.rork.app';

/** Language code — 'zomi', 'english' or any catalog language. */
export type ShareLanguage = string;

export interface CreateShareLinkInput {
  sourceText: string;
  translatedText: string;
  sourceLanguage: ShareLanguage;
  targetLanguage: ShareLanguage;
  confidence?: number;
  model?: string | null;
}

/**
 * Creates a public share link for a completed translation.
 * Returns the full URL (e.g. https://zomilanguage.rork.app/t/ab3k9xz2q1), or null when the
 * backend is unreachable so callers can fall back to sharing plain text.
 */
export async function createShareLink(input: CreateShareLinkInput): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${API_BASE}/api/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: input.sourceText,
          translatedText: input.translatedText,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          confidence: input.confidence ?? 0,
          model: input.model ?? null,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { shareId?: string };
      if (typeof data.shareId !== 'string' || !data.shareId) return null;
      return `${SHARE_WEB_BASE}/t/${data.shareId}`;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.log('[share] link creation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
