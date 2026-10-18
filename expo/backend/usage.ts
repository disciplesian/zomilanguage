/**
 * Aggregate AI usage tracking for the Zomi backend.
 *
 * Privacy-first by design: only counts, token totals and model names are
 * recorded — never user IDs, IPs, timestamps beyond day granularity, or
 * message content. Data lives in process memory and is flushed (best-effort)
 * to the `gemini_usage_daily` Supabase table once per minute when dirty.
 */
import { setGeminiUsageListener } from "./geminiDirect";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MAX_DAYS_IN_MEMORY = 31;
const MAX_MINUTE_BUCKETS = 15;

export interface UsageEvent {
  provider: "gemini" | "proxy";
  model: string;
  promptTokens: number;
  outputTokens: number;
  ok: boolean;
}

interface ModelAgg {
  requests: number;
  errors: number;
  promptTokens: number;
  outputTokens: number;
}

interface DayAgg {
  date: string;
  requests: number;
  errors: number;
  promptTokens: number;
  outputTokens: number;
  byModel: Map<string, ModelAgg>;
}

interface MinuteBucket {
  startedAt: number;
  requests: number;
  errors: number;
  tokens: number;
}

function utcDay(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function envNumber(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Spend estimate at Flash-class list pricing (USD per 1M tokens), env-overridable. */
function inputPricePerMillion(): number {
  return envNumber("GEMINI_PRICE_INPUT_PER_M", 0.3);
}
function outputPricePerMillion(): number {
  return envNumber("GEMINI_PRICE_OUTPUT_PER_M", 2.5);
}
export function estimateCostUsd(promptTokens: number, outputTokens: number): number {
  return (
    (promptTokens / 1_000_000) * inputPricePerMillion() +
    (outputTokens / 1_000_000) * outputPricePerMillion()
  );
}

/** Rate-limit alert thresholds (requests per minute), tuned near free-tier limits. */
function rpmWarn(): number {
  return envNumber("GEMINI_RPM_WARN", 8);
}
function rpmCritical(): number {
  return envNumber("GEMINI_RPM_CRIT", 12);
}
function errorsPerMinWarn(): number {
  return envNumber("GEMINI_ERRPM_WARN", 3);
}
function errorsPerMinCritical(): number {
  return envNumber("GEMINI_ERRPM_CRIT", 6);
}

const days = new Map<string, DayAgg>();
const minutes: MinuteBucket[] = [];
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastFlushError = "";

// Wire the model-call sink: every Gemini/proxy call reported by the AI modules
// lands here as an aggregate count.
setGeminiUsageListener((event) =>
  recordUsage({
    provider: event.provider,
    model: event.model,
    promptTokens: event.promptTokens,
    outputTokens: event.outputTokens,
    ok: event.ok,
  })
);

function todayAgg(): DayAgg {
  const date = utcDay();
  let agg = days.get(date);
  if (!agg) {
    agg = { date, requests: 0, errors: 0, promptTokens: 0, outputTokens: 0, byModel: new Map() };
    days.set(date, agg);
    // Keep memory bounded to the last 31 days.
    if (days.size > MAX_DAYS_IN_MEMORY) {
      const oldest = [...days.keys()].sort()[0];
      days.delete(oldest);
    }
  }
  return agg;
}

function currentMinute(): MinuteBucket {
  const startedAt = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
  const last = minutes[minutes.length - 1];
  if (last && last.startedAt === startedAt) return last;
  const bucket: MinuteBucket = { startedAt, requests: 0, errors: 0, tokens: 0 };
  minutes.push(bucket);
  while (minutes.length > MAX_MINUTE_BUCKETS) minutes.shift();
  return bucket;
}

/** Records one model call. Never throws. */
export function recordUsage(event: UsageEvent): void {
  try {
    const agg = todayAgg();
    const tokens = event.promptTokens + event.outputTokens;
    agg.requests += 1;
    agg.promptTokens += event.promptTokens;
    agg.outputTokens += event.outputTokens;
    if (!event.ok) agg.errors += 1;

    const model = event.model || "unknown";
    let m = agg.byModel.get(model);
    if (!m) {
      m = { requests: 0, errors: 0, promptTokens: 0, outputTokens: 0 };
      agg.byModel.set(model, m);
    }
    m.requests += 1;
    m.promptTokens += event.promptTokens;
    m.outputTokens += event.outputTokens;
    if (!event.ok) m.errors += 1;

    const bucket = currentMinute();
    bucket.requests += 1;
    bucket.tokens += tokens;
    if (!event.ok) bucket.errors += 1;

    markDirty();
  } catch {
    // Monitoring must never break a live translation.
  }
}

function markDirty(): void {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushDaily();
  }, 5_000);
}

async function flushDaily(): Promise<void> {
  if (!dirty) return;
  const agg = todayAgg();
  dirty = false;
  try {
    const { getDB } = await import("./db/client");
    const db = await getDB();
    await db.rpc("record_gemini_usage", {
      p_day: agg.date,
      p_requests: agg.requests,
      p_errors: agg.errors,
      p_prompt_tokens: agg.promptTokens,
      p_output_tokens: agg.outputTokens,
      p_by_model: Object.fromEntries([...agg.byModel].map(([model, m]) => [model, m])),
    });
    lastFlushError = "";
  } catch (err) {
    // Absent table/RPC is expected until backend/sql/gemini-usage.sql is applied.
    lastFlushError = err instanceof Error ? err.message : String(err);
    dirty = true; // retry on the next cycle
  }
}

export interface UsageSnapshot {
  today: {
    date: string;
    requests: number;
    errors: number;
    promptTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
  byModel: (ModelAgg & { model: string; estimatedCostUsd: number })[];
  rate: {
    requestsPerMinute: number;
    errorsPerMinute: number;
    tokensPerMinute: number;
    level: "ok" | "warning" | "critical";
    reasons: string[];
    thresholds: { rpmWarn: number; rpmCritical: number; errorsWarn: number; errorsCritical: number };
  };
  pricing: { inputUsdPerMillion: number; outputUsdPerMillion: number };
  lastFlushError: string;
}

export function usageSnapshot(): UsageSnapshot {
  const agg = todayAgg();
  const cutoff = Date.now() - 5 * MINUTE_MS;
  let requests = 0;
  let errors = 0;
  let tokens = 0;
  for (const bucket of minutes) {
    if (bucket.startedAt < cutoff) continue;
    requests += bucket.requests;
    errors += bucket.errors;
    tokens += bucket.tokens;
  }
  const rpm = requests / 5; // average over the 5-minute window
  const epm = errors / 5;

  const reasons: string[] = [];
  const rpmCriticalHit = rpm >= rpmCritical();
  const rpmWarnHit = rpm >= rpmWarn();
  const epmCriticalHit = epm >= errorsPerMinCritical();
  const epmWarnHit = epm >= errorsPerMinWarn();
  let level: "ok" | "warning" | "critical" = "ok";
  if (rpmCriticalHit || epmCriticalHit) {
    level = "critical";
  } else if (rpmWarnHit || epmWarnHit) {
    level = "warning";
  }
  if (rpmCriticalHit) {
    reasons.push(`${rpm.toFixed(1)} requests/min is at or above the critical threshold (${rpmCritical()}).`);
  } else if (rpmWarnHit) {
    reasons.push(`${rpm.toFixed(1)} requests/min is above the warning threshold (${rpmWarn()}).`);
  }
  if (epmCriticalHit) {
    reasons.push(`${epm.toFixed(1)} errors/min — the provider may be rate-limiting or down.`);
  } else if (epmWarnHit) {
    reasons.push(`${epm.toFixed(1)} errors/min — check the provider error budget.`);
  }

  const byModel = [...agg.byModel]
    .map(([model, m]) => ({
      model,
      ...m,
      estimatedCostUsd: estimateCostUsd(m.promptTokens, m.outputTokens),
    }))
    .sort((a, b) => b.requests - a.requests);

  return {
    today: {
      date: agg.date,
      requests: agg.requests,
      errors: agg.errors,
      promptTokens: agg.promptTokens,
      outputTokens: agg.outputTokens,
      estimatedCostUsd: estimateCostUsd(agg.promptTokens, agg.outputTokens),
    },
    byModel,
    rate: {
      requestsPerMinute: Math.round(rpm * 10) / 10,
      errorsPerMinute: Math.round(epm * 10) / 10,
      tokensPerMinute: Math.round(tokens / 5),
      level,
      reasons,
      thresholds: { rpmWarn: rpmWarn(), rpmCritical: rpmCritical(), errorsWarn: errorsPerMinWarn(), errorsCritical: errorsPerMinCritical() },
    },
    pricing: { inputUsdPerMillion: inputPricePerMillion(), outputUsdPerMillion: outputPricePerMillion() },
    lastFlushError,
  };
}

/** Long-lived safety net: flush aggregates even when traffic pauses. */
if (!("WebSocketPair" in globalThis)) setInterval(() => void flushDaily(), 60_000);

/** Flushes pending usage aggregates now (used by serverless runtimes). */
export function flushUsageNow(): Promise<void> {
  return flushDaily();
}
export const _dayMs = DAY_MS; // retained for tests
