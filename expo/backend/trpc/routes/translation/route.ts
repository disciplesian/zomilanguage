import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';
import { chatCompletion, aiProxyConfigured, type ChatMessage, type ChatRequest } from '../../../aiProxy';
import { chatCompletionDirect, geminiConfigured, translationModelChain } from '../../../geminiDirect';
import { authFromRequest, logTranslation, FREE_WORD_LIMIT, anonymousWordsUsed, countWords, recordAnonymousWords } from '../../../portal';
import { getDB } from '../../../db/client';
import {
  ZOMI_SYSTEM_INSTRUCTION,
  ZOMI_GLOSSARY,
  ZOMI_EXAMPLES,
  promptLanguageName,
  buildSystemInstruction,
  buildUserPrompt,
} from '../../../../constants/zomiPrompt';

/**
 * Model chain: auto-discovered hourly from the Gemini ListModels endpoint
 * (newest capable models first, so new releases are picked up automatically)
 * with a static fallback. Called directly with the project's GEMINI_API_KEY
 * when configured, with the Rork Toolkit proxy (Vercel AI Gateway) as
 * fallback.
 */

/** One provider attempt: a model id plus a completion function. */
type Attempt = { model: string; run: (req: ChatRequest) => Promise<string> };

async function buildAttempts(): Promise<Attempt[]> {
  const attempts: Attempt[] = [];
  // Fast-first chain capped to a short list (matching /api/translate/stream)
  // so a failing request never churns through every candidate model.
  const modelNames = (await translationModelChain()).slice(0, 3);
  if (geminiConfigured()) {
    for (const m of modelNames) attempts.push({ model: m, run: chatCompletionDirect });
  }
  if (aiProxyConfigured()) {
    for (const m of modelNames.slice(0, 2)) attempts.push({ model: `google/${m}`, run: chatCompletion });
  }
  return attempts;
}

/** Completes via the first provider that succeeds (direct Gemini → proxy). */
async function completeWithFallback(
  model: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {}
): Promise<string> {
  const attempts = await buildAttempts();
  const preferred = attempts.find((a) => a.model === model);
  const ordered = preferred ? [preferred, ...attempts.filter((a) => a !== preferred)] : attempts;
  let lastError: unknown = null;
  for (const attempt of ordered) {
    try {
      return await attempt.run({ model: attempt.model, messages, ...opts });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('No AI provider configured.');
}

const MAX_INPUT_CHARS = 10000;

/** Simple in-memory LRU cache by hash(source|target|text). */
const CACHE_SIZE = 256;
type CacheEntry = { translatedText: string; confidence: number; model: string; alternatives: string[] };
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, source: string, target: string): string {
  // Lightweight FNV-1a — good enough for a process-local cache key.
  let h = 0x811c9dc5;
  const s = `${source}>${target}::${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function cacheGet(key: string): CacheEntry | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
  // Refresh recency
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function cacheSet(key: string, entry: CacheEntry): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, entry);
  if (cache.size > CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** Telemetry: which model in the chain answered, and timings. */
function logTelemetry(payload: Record<string, unknown>): void {
  try {
    console.log('[telemetry:translation]', JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

/** Classify a Gemini SDK error so we can surface 429 / retry-after to the client. */
function classifyError(err: unknown): {
  code: 'TOO_MANY_REQUESTS' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_SERVER_ERROR';
  retryAfterMs?: number;
  message: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();
  // Try to extract status code
  let status: number | undefined;
  const statusMatch = raw.match(/\b(4\d{2}|5\d{2})\b/);
  if (statusMatch) status = Number(statusMatch[1]);
  // RetryAfter (in seconds) if present
  let retryAfterMs: number | undefined;
  const retryMatch = raw.match(/retry[-_ ]?after[^\d]*(\d+)/i);
  if (retryMatch) retryAfterMs = Number(retryMatch[1]) * 1000;

  if (status === 429 || lower.includes('quota') || lower.includes('rate limit')) {
    return {
      code: 'TOO_MANY_REQUESTS',
      retryAfterMs: retryAfterMs ?? 30_000,
      message: 'Translation quota exceeded. Please retry shortly.',
    };
  }
  if (status && status >= 500) {
    return { code: 'SERVICE_UNAVAILABLE', message: 'Translation service is temporarily unavailable.' };
  }
  return { code: 'INTERNAL_SERVER_ERROR', message: raw || 'Unknown translation error.' };
}

function buildMessages(
  text: string,
  sourceLang: string,
  targetLang: string,
  extraGlossary?: Record<string, string>
): ChatMessage[] {
  // Pair-aware: the Zomi specialist instruction + glossary are used only when
  // Zomi is part of the pair; the source language is always stated explicitly
  // so the model never has to guess (critical for low-resource languages).
  const sourceCode =
    sourceLang === 'Auto'
      ? 'auto'
      : sourceLang === 'Zomi (ISO 639-3: ctd)'
        ? 'zomi'
        : sourceLang.toLowerCase().replace(/\s+/g, '_');
  const targetCode =
    targetLang === 'Zomi (ISO 639-3: ctd)'
      ? 'zomi'
      : targetLang.toLowerCase().replace(/\s+/g, '_');
  return [
    { role: 'system', content: buildSystemInstruction(sourceCode, targetCode) },
    { role: 'user', content: buildUserPrompt(text, sourceCode, targetCode, extraGlossary) },
  ];
}

/** Parse the model's JSON response, recovering plain text if the schema is ignored. */
function parseTranslation(raw: string): { translation: string; confidence: number; alternatives: string[] } {
  const trimmed = raw.trim().replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(trimmed) as { translation?: string; confidence?: unknown; alternatives?: unknown };
    const primary = (parsed.translation ?? '').trim();
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .map((a) => (typeof a === 'string' ? a.trim() : ''))
          .filter((a) => a.length > 0 && a !== primary)
          .slice(0, 2)
      : [];
    return {
      translation: primary,
      confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence ?? 90)))),
      alternatives: [...new Set(alternatives)],
    };
  } catch {
    return { translation: trimmed, confidence: 90, alternatives: [] };
  }
}

/**
 * Second-pass accuracy pass (LLM-as-reviewer): when the first pass reports low
 * confidence, the model re-examines its own draft against the source and
 * returns a corrected translation. Failures keep the first-pass draft.
 */
const REFINE_CONFIDENCE_THRESHOLD = 85;
const REFINE_MIN_CHARS = 80;

async function refineTranslation(
  model: string,
  text: string,
  sourceLang: string,
  targetLang: string,
  draft: string
): Promise<{ translation: string; confidence: number; alternatives: string[] } | null> {
  const involvesZomi =
    sourceLang === 'Zomi (ISO 639-3: ctd)' || targetLang === 'Zomi (ISO 639-3: ctd)';
  const reviewerLine = involvesZomi
    ? `You are an expert Zomi (ISO 639-3: ctd) translation reviewer.`
    : `You are an expert ${sourceLang} to ${targetLang} translation reviewer.`;
  const dialectLine = involvesZomi
    ? ' Pay special attention to idioms, politeness particles, register, and dialect purity (standard Zomi only).'
    : ' Pay special attention to idioms, tone, and register.';
  const messages: ChatMessage[] = [
    ...(involvesZomi ? [{ role: 'system' as const, content: ZOMI_SYSTEM_INSTRUCTION }] : []),
    {
      role: 'user',
      content: `${reviewerLine}
A draft translation from ${sourceLang} into ${targetLang} is provided below. Compare it against the source and correct ANY error in meaning, grammar, or natural phrasing.${dialectLine}
If the draft is already correct, return it unchanged.
Return JSON {"translation": string, "confidence": number 0-100}.

SOURCE_TEXT:
"${text}"

DRAFT_TRANSLATION:
"${draft}"`,
    },
  ];
  const raw = await completeWithFallback(model, messages, { maxTokens: 8192 });
  const parsed = parseTranslation(raw);
  return parsed.translation ? parsed : null;
}

/** Run translation with structured output, model/provider fallback, and a refinement pass. */
export async function runTranslation(
  text: string,
  sourceLanguage: string | undefined,
  targetLanguage: string,
  extraGlossary?: Record<string, string>
): Promise<CacheEntry & { cached: boolean; refined: boolean }> {
  const attempts = await buildAttempts();
  if (attempts.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No AI provider configured.' });
  }

  const targetLang = promptLanguageName(targetLanguage);
  const sourceLang = sourceLanguage?.trim() ? promptLanguageName(sourceLanguage) : 'Auto';

  const key = cacheKey(text, sourceLang === 'Auto' ? '' : sourceLang, targetLang);
  const cached = cacheGet(key);
  if (cached) {
    logTelemetry({ event: 'cache_hit', model: cached.model, key });
    return { ...cached, cached: true, refined: false };
  }

  const messages = buildMessages(text, sourceLang, targetLang, extraGlossary);

  let lastError: unknown = null;
  const startedAt = Date.now();

  for (const { model, run } of attempts) {
    const modelStart = Date.now();
    try {
      const raw = await run({ model, maxTokens: 8192, messages });
      const parsed = parseTranslation(raw);
      if (!parsed.translation) throw new Error('Empty translation from model');

      let translatedText = parsed.translation;
      let confidence = parsed.confidence;
      let alternatives = parsed.alternatives;
      let refined = false;

      // Second-pass expert review for low-confidence longer texts.
      if (confidence < REFINE_CONFIDENCE_THRESHOLD && text.length >= REFINE_MIN_CHARS) {
        try {
          const refineStart = Date.now();
          const reviewed = await refineTranslation(model, text, sourceLang, targetLang, translatedText);
          if (reviewed) {
            translatedText = reviewed.translation;
            confidence = Math.max(confidence, reviewed.confidence);
            refined = true;
          }
          logTelemetry({
            event: 'refined',
            model,
            latencyMs: Date.now() - refineStart,
            confidence,
          });
        } catch (refineError) {
          logTelemetry({
            event: 'refine_failed',
            model,
            message: refineError instanceof Error ? refineError.message : String(refineError),
          });
        }
      }

      const entry: CacheEntry = { translatedText, confidence, model, alternatives };
      cacheSet(key, entry);

      logTelemetry({
        event: 'success',
        model,
        refined,
        latencyMs: Date.now() - modelStart,
        totalMs: Date.now() - startedAt,
        confidence,
        chars: text.length,
      });

      return { ...entry, cached: false, refined };
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);
      logTelemetry({
        event: 'model_failed',
        model,
        latencyMs: Date.now() - modelStart,
        code: classified.code,
        message: classified.message,
      });
      // On rate-limit, fail fast — falling through models burns more quota.
      if (classified.code === 'TOO_MANY_REQUESTS') {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: classified.message,
          cause: { retryAfterMs: classified.retryAfterMs },
        });
      }
    }
  }

  const classified = classifyError(lastError);
  throw new TRPCError({
    code: classified.code === 'TOO_MANY_REQUESTS' ? 'TOO_MANY_REQUESTS' : 'SERVICE_UNAVAILABLE',
    message: classified.message,
  });
}

export default createTRPCRouter({
  translate: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(MAX_INPUT_CHARS),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string(),
        extraGlossary: z.record(z.string(), z.string()).optional(),
        anonymousId: z.string().max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Free tier: anonymous visitors may translate up to FREE_WORD_LIMIT words
      // (tracked per device); past that a signed-in account is required.
      const auth = await authFromRequest(ctx.req?.headers?.get('authorization') ?? undefined);
      const anonymousId =
        (input.anonymousId ?? '').trim() ||
        (ctx.req?.headers?.get('x-anonymous-id') ?? '').trim();
      let wordsUsed = 0;
      if (!auth) {
        if (!anonymousId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required to translate.' });
        }
        const db = await getDB();
        wordsUsed = await anonymousWordsUsed(db, anonymousId);
        if (wordsUsed >= FREE_WORD_LIMIT) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'word_limit_reached: You have used your 1,500 free words. Sign in to keep translating.',
          });
        }
      }
      const { text, sourceLanguage, targetLanguage, extraGlossary } = input;
      const result = await runTranslation(text.trim(), sourceLanguage, targetLanguage, extraGlossary);
      // Usage accounting: per-user log for members, free-tier words for guests.
      let usage = { authed: true, wordsUsed: 0, wordLimit: 0 };
      try {
        const db = await getDB();
        if (auth) {
          await logTranslation(db, auth, {
            sourceText: text,
            translatedText: result.translatedText,
            targetLanguage,
            model: result.model,
            confidence: result.confidence,
          });
        } else if (anonymousId) {
          wordsUsed = await recordAnonymousWords(db, anonymousId, countWords(text));
          usage = { authed: false, wordsUsed, wordLimit: FREE_WORD_LIMIT };
        }
      } catch {
        // ignore logging failures
      }
      return {
        translatedText: result.translatedText,
        confidence: result.confidence,
        alternatives: result.alternatives,
        detectedSource: sourceLanguage?.trim() || 'Auto',
        model: result.model,
        cached: result.cached,
        refined: result.refined,
        usage,
      };
    }),
});
