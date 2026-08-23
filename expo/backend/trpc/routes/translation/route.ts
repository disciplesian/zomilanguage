import { z } from 'zod';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';
import { authFromRequest, logTranslation, FREE_WORD_LIMIT, anonymousWordsUsed, countWords, recordAnonymousWords } from '../../../portal';
import { getDB } from '../../../db/client';
import {
  ZOMI_SYSTEM_INSTRUCTION,
  ZOMI_GLOSSARY,
  ZOMI_EXAMPLES,
} from '../../../../constants/zomiPrompt';

/**
 * Model chain (newest → oldest, as of August 2026).
 *
 * - Gemini 3.x models use `thinkingLevel` (thinkingBudget is gone; sending both
 *   returns 400) and treat temperature/topP as deprecated. The Pro model runs
 *   HIGH thinking — a low-resource dialect like Tedim Zomi (CTD) benefits most
 *   from deep reasoning. Flash tiers run LOW thinking to stay latency-friendly.
 * - Gemini 2.5 fallbacks keep the classic sampling parameters.
 */
type ThinkingLevelValue = (typeof ThinkingLevel)[keyof typeof ThinkingLevel];

interface ModelSpec {
  model: string;
  thinkingLevel?: ThinkingLevelValue;
}

const MODEL_CHAIN: readonly ModelSpec[] = [
  { model: 'gemini-3.1-pro-preview', thinkingLevel: ThinkingLevel.HIGH },
  { model: 'gemini-3.7-flash', thinkingLevel: ThinkingLevel.LOW },
  { model: 'gemini-3.6-flash', thinkingLevel: ThinkingLevel.LOW },
  { model: 'gemini-2.5-pro' },
  { model: 'gemini-2.5-flash' },
];

const MAX_INPUT_CHARS = 10000;

/** Simple in-memory LRU cache by hash(text|target). */
const CACHE_SIZE = 256;
type CacheEntry = { translatedText: string; confidence: number; model: string };
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, target: string): string {
  // Lightweight FNV-1a — good enough for a process-local cache key.
  let h = 0x811c9dc5;
  const s = `${target}::${text}`;
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

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING },
    confidence: { type: Type.INTEGER },
  },
  required: ['translation', 'confidence'],
} as const;

function buildContents(
  text: string,
  targetLang: string,
  extraGlossary?: Record<string, string>
) {
  const mergedGlossary: Record<string, string> = { ...ZOMI_GLOSSARY, ...(extraGlossary ?? {}) };
  const glossaryJson = JSON.stringify({ glossary: mergedGlossary, examples: ZOMI_EXAMPLES });
  // Glossary is a separate parts block so the model treats it as DATA, not instructions.
  return [
    {
      role: 'user' as const,
      parts: [
        {
          text: `Translate the following text into ${targetLang}.
Use EXCLUSIVELY the Tedim dialect (CTD). No other Zomi dialect is acceptable.
Ensure the grammar of ${targetLang} is perfect.
Return JSON {"translation": string, "confidence": number 0-100}.`,
        },
        { text: `GLOSSARY_DATA_JSON:\n${glossaryJson}` },
        { text: `INPUT_TEXT:\n"${text}"` },
      ],
    },
  ];
}

const baseGenerationConfig = {
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
  responseSchema,
} as const;

/** Per-model config: Gemini 3.x thinkingLevel vs legacy 2.5 sampling params. */
function configFor(spec: ModelSpec) {
  if (spec.thinkingLevel) {
    return {
      ...baseGenerationConfig,
      thinkingConfig: { thinkingLevel: spec.thinkingLevel },
    };
  }
  return { ...baseGenerationConfig, temperature: 0.1, topP: 0.8 };
}

/** Parse the model's JSON response, recovering plain text if the schema is ignored. */
function parseTranslation(raw: string): { translation: string; confidence: number } {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as { translation?: string; confidence?: unknown };
    return {
      translation: (parsed.translation ?? '').trim(),
      confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence ?? 90)))),
    };
  } catch {
    return { translation: trimmed, confidence: 90 };
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
  ai: GoogleGenAI,
  spec: ModelSpec,
  text: string,
  targetLang: string,
  draft: string
): Promise<{ translation: string; confidence: number } | null> {
  const contents = [
    {
      role: 'user' as const,
      parts: [
        {
          text: `You are an expert Tedim Zomi (CTD) translation reviewer.
A draft translation into ${targetLang} is provided below. Compare it against the source and correct ANY error in meaning, grammar, dialect purity (Tedim CTD only), or natural phrasing. Pay special attention to idioms, politeness particles and register.
If the draft is already correct, return it unchanged.
Return JSON {"translation": string, "confidence": number 0-100}.`,
        },
        { text: `SOURCE_TEXT:\n"${text}"` },
        { text: `DRAFT_TRANSLATION:\n"${draft}"` },
      ],
    },
  ];
  const result = await ai.models.generateContent({
    model: spec.model,
    contents,
    config: {
      ...configFor(spec),
      systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
    },
  });
  const parsed = parseTranslation(result.text ?? '');
  return parsed.translation ? parsed : null;
}

/** Run translation through the @google/genai SDK with structured output, model fallback, and a refinement pass. */
export async function runTranslation(
  text: string,
  targetLanguage: string,
  extraGlossary?: Record<string, string>
): Promise<CacheEntry & { cached: boolean; refined: boolean }> {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'API key not configured.' });
  }

  const targetLang =
    targetLanguage === 'zomi' ? 'Tedim Zomi (CTD, ISO 639-3: ctd)' : targetLanguage;

  const key = cacheKey(text, targetLang);
  const cached = cacheGet(key);
  if (cached) {
    logTelemetry({ event: 'cache_hit', model: cached.model, key });
    return { ...cached, cached: true, refined: false };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const contents = buildContents(text, targetLang, extraGlossary);

  let lastError: unknown = null;
  const startedAt = Date.now();

  for (const spec of MODEL_CHAIN) {
    const modelStart = Date.now();
    try {
      const result = await ai.models.generateContent({
        model: spec.model,
        contents,
        config: {
          ...configFor(spec),
          systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
        },
      });

      const parsed = parseTranslation(result.text ?? '');
      if (!parsed.translation) throw new Error('Empty translation from model');

      let translatedText = parsed.translation;
      let confidence = parsed.confidence;
      let refined = false;

      // Second-pass expert review for low-confidence longer texts.
      if (confidence < REFINE_CONFIDENCE_THRESHOLD && text.length >= REFINE_MIN_CHARS) {
        try {
          const refineStart = Date.now();
          const reviewed = await refineTranslation(ai, spec, text, targetLang, translatedText);
          if (reviewed) {
            translatedText = reviewed.translation;
            confidence = Math.max(confidence, reviewed.confidence);
            refined = true;
          }
          logTelemetry({
            event: 'refined',
            model: spec.model,
            latencyMs: Date.now() - refineStart,
            confidence,
          });
        } catch (refineError) {
          logTelemetry({
            event: 'refine_failed',
            model: spec.model,
            message: refineError instanceof Error ? refineError.message : String(refineError),
          });
        }
      }

      const entry: CacheEntry = { translatedText, confidence, model: spec.model };
      cacheSet(key, entry);

      logTelemetry({
        event: 'success',
        model: spec.model,
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
        model: spec.model,
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
      const { text, targetLanguage, extraGlossary } = input;
      const result = await runTranslation(text.trim(), targetLanguage, extraGlossary);
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
        detectedSource: 'Auto',
        model: result.model,
        cached: result.cached,
        refined: result.refined,
        usage,
      };
    }),
});
