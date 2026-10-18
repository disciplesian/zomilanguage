/**
 * Abuse protection + shared translation memory for the free tier.
 *
 * Everything here is in-process and privacy-light: device ids and network
 * addresses are only held in memory for rate limiting (minutes), never logged
 * or linked to translated text. The translation memory stores text pairs only,
 * never who asked.
 */

const MINUTE_MS = 60_000;

function envNumber(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Guest requests allowed per minute, per device and per network. */
export const RATE_LIMIT_PER_MINUTE = envNumber("GUEST_RPM_LIMIT", 20);
/** Longest text a guest may send in one request (characters). */
export const GUEST_MAX_CHARS = envNumber("GUEST_MAX_CHARS", 500);
/** Longest text a signed-in user may send in one request (characters). */
export const MEMBER_MAX_CHARS = 5000;

// ---------------------------------------------------------------------------
// Rate limiting (sliding one-minute window)
// ---------------------------------------------------------------------------

const hits = new Map<string, number[]>();

function hit(key: string, now: number): number {
  const cutoff = now - MINUTE_MS;
  const list = (hits.get(key) ?? []).filter((t) => t > cutoff);
  list.push(now);
  hits.set(key, list);
  return list.length;
}

/** Records one request and returns true when the caller is over the limit. */
export function isRateLimited(keys: string[], limit = RATE_LIMIT_PER_MINUTE): boolean {
  const now = Date.now();
  let limited = false;
  for (const key of keys) {
    if (!key) continue;
    if (hit(key, now) > limit) limited = true;
  }
  return limited;
}

/** Workers forbid timers at global scope; isolates are short-lived there anyway. */
const isWorkerRuntime = "WebSocketPair" in globalThis;

if (!isWorkerRuntime) setInterval(() => {
  const cutoff = Date.now() - MINUTE_MS;
  for (const [key, list] of hits) {
    const fresh = list.filter((t) => t > cutoff);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}, MINUTE_MS);

// ---------------------------------------------------------------------------
// Admin block list
// ---------------------------------------------------------------------------

export interface BlockEntry {
  value: string;
  kind: "device" | "network";
  note: string;
  createdAt: string;
}

let blocked = new Map<string, BlockEntry>();
let blockListLoadedAt = 0;
let blockListInFlight: Promise<void> | null = null;

/** How long an instance trusts its copy before re-reading the shared list. */
const BLOCK_LIST_TTL_MS = 30_000;
/** Cap on how long a cold instance waits for its first copy. */
const BLOCK_LIST_FIRST_LOAD_WAIT_MS = 400;

/**
 * Keeps this instance's copy of the persisted block list fresh. Many server
 * instances run at once, so blocks/unblocks made through any of them reach
 * the others within BLOCK_LIST_TTL_MS. The first load on a cold instance is
 * awaited briefly so a blocked client can't slip through right after a
 * restart; later refreshes run in the background (zero added latency).
 */
export async function loadBlockList(loader: () => Promise<BlockEntry[]>): Promise<void> {
  const isStale = Date.now() - blockListLoadedAt > BLOCK_LIST_TTL_MS;
  if (!isStale) return;
  const isFirstLoad = blockListLoadedAt === 0;
  if (!blockListInFlight) {
    blockListInFlight = (async () => {
      try {
        const next = new Map<string, BlockEntry>();
        for (const entry of await loader()) next.set(entry.value, entry);
        blocked = next;
      } catch {
        // Store unavailable — keep the current in-memory list.
      } finally {
        blockListLoadedAt = Date.now();
        blockListInFlight = null;
      }
    })();
  }
  if (isFirstLoad) {
    await Promise.race([
      blockListInFlight,
      new Promise<void>((resolve) => setTimeout(resolve, BLOCK_LIST_FIRST_LOAD_WAIT_MS)),
    ]);
  }
}

export function isBlocked(values: string[]): boolean {
  return values.some((v) => v && blocked.has(v));
}

export function addBlock(entry: BlockEntry): void {
  blocked.set(entry.value, entry);
}

export function removeBlock(value: string): void {
  blocked.delete(value);
}

export function listBlocks(): BlockEntry[] {
  return [...blocked.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------------------
// Global safety brake: guest AI calls per 10 minutes
// ---------------------------------------------------------------------------

const BRAKE_WINDOW_MS = 10 * MINUTE_MS;
const guestModelCalls: number[] = [];

/** Guest AI calls allowed per 10 minutes before guests fall back to dictionary-only. */
export function brakeThreshold(): number {
  return envNumber("GUEST_BRAKE_PER_10MIN", 600);
}

export function recordGuestModelCall(): void {
  const now = Date.now();
  guestModelCalls.push(now);
  const cutoff = now - BRAKE_WINDOW_MS;
  while (guestModelCalls.length > 0 && guestModelCalls[0] < cutoff) guestModelCalls.shift();
}

export function guestCallsInWindow(): number {
  const cutoff = Date.now() - BRAKE_WINDOW_MS;
  while (guestModelCalls.length > 0 && guestModelCalls[0] < cutoff) guestModelCalls.shift();
  return guestModelCalls.length;
}

/** True when total guest AI usage spiked far above normal. */
export function safetyBrakeEngaged(): boolean {
  return guestCallsInWindow() >= brakeThreshold();
}

// ---------------------------------------------------------------------------
// Shared translation memory (text only, never who asked)
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  text: string;
  model: string;
  confidence: number;
  alternatives: string[];
  storedAt: number;
}

const MEMORY_TTL_MS = 24 * 60 * MINUTE_MS;
const MEMORY_MAX = 5000;
const memory = new Map<string, MemoryEntry>();

function memoryKey(text: string, source: string, target: string): string {
  return `${source}>${target}|${text.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

export function recallTranslation(text: string, source: string, target: string): MemoryEntry | null {
  const key = memoryKey(text, source, target);
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > MEMORY_TTL_MS) {
    memory.delete(key);
    return null;
  }
  // LRU touch
  memory.delete(key);
  memory.set(key, entry);
  return entry;
}

export function rememberTranslation(
  text: string,
  source: string,
  target: string,
  entry: Omit<MemoryEntry, "storedAt">
): void {
  if (!entry.text.trim() || entry.confidence < 70) return;
  const key = memoryKey(text, source, target);
  memory.set(key, { ...entry, storedAt: Date.now() });
  while (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

/** Drops a remembered translation (used when an admin corrects the dictionary). */
export function forgetAllTranslations(): void {
  memory.clear();
}

export function guardSnapshot(): {
  blockedCount: number;
  memorySize: number;
  guestCallsLast10Min: number;
  brakeThreshold: number;
  brakeEngaged: boolean;
  rateLimitPerMinute: number;
  guestMaxChars: number;
} {
  return {
    blockedCount: blocked.size,
    memorySize: memory.size,
    guestCallsLast10Min: guestCallsInWindow(),
    brakeThreshold: brakeThreshold(),
    brakeEngaged: safetyBrakeEngaged(),
    rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
    guestMaxChars: GUEST_MAX_CHARS,
  };
}
