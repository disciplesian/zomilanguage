import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';
import {
  ZOMI_SYSTEM_INSTRUCTION,
  ZOMI_GLOSSARY,
  ZOMI_EXAMPLES,
} from '../../../../constants/zomiPrompt';

/**
 * Model chain (newest → oldest). The latest @google/genai SDK supports the
 * Gemini 3 family directly. We fall back through the chain on hard failure.
 */
const MODEL_CHAIN = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
] as const;

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

function buildContents(text: string, targetLang: string) {
  const glossaryJson = JSON.stringify({ glossary: ZOMI_GLOSSARY, examples: ZOMI_EXAMPLES });
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

const generationConfig = {
  temperature: 0.1,
  maxOutputTokens: 8192,
  topP: 0.8,
  responseMimeType: 'application/json',
  responseSchema,
} as const;

/** Run translation through the @google/genai SDK with structured output + model fallback. */
export async function runTranslation(
  text: string,
  targetLanguage: string
): Promise<CacheEntry & { cached: boolean }> {
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
    return { ...cached, cached: true };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const contents = buildContents(text, targetLang);

  let lastError: unknown = null;
  const startedAt = Date.now();

  for (const modelName of MODEL_CHAIN) {
    const modelStart = Date.now();
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          ...generationConfig,
          systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
        },
      });

      const raw = (result.text ?? '').trim();
      let parsed: { translation?: string; confidence?: number } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Model returned plain text despite schema — recover gracefully.
        parsed = { translation: raw, confidence: 90 };
      }

      const translatedText = (parsed.translation ?? '').trim();
      const confidence = Math.max(
        0,
        Math.min(100, Math.round(Number(parsed.confidence ?? 90)))
      );

      if (!translatedText) throw new Error('Empty translation from model');

      const entry: CacheEntry = { translatedText, confidence, model: modelName };
      cacheSet(key, entry);

      logTelemetry({
        event: 'success',
        model: modelName,
        latencyMs: Date.now() - modelStart,
        totalMs: Date.now() - startedAt,
        confidence,
        chars: text.length,
      });

      return { ...entry, cached: false };
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);
      logTelemetry({
        event: 'model_failed',
        model: modelName,
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
      })
    )
    .mutation(async ({ input }) => {
      const { text, targetLanguage } = input;
      const result = await runTranslation(text.trim(), targetLanguage);
      return {
        translatedText: result.translatedText,
        confidence: result.confidence,
        detectedSource: 'Auto',
        model: result.model,
        cached: result.cached,
      };
    }),
});
