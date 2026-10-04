/**
 * Server-side lookup against the bundled verified English ⇄ Zomi dictionary.
 * Powers two wins in /translate/stream:
 *  1. Fast path — an exact word/short-phrase match is answered immediately
 *     from the human-verified dataset with zero model latency.
 *  2. Grounding — matched entries are injected into the model prompt as
 *     authoritative data, so AI translations agree with the verified dataset.
 */
import dictionaryJson from "../constants/dictionary.json";

/** One verified entry row. */
export interface VerifiedMatch {
  english: string;
  pos: string;
  zomi: string;
}

interface DictionaryPayload {
  version: number;
  count: number;
  entries: string[][];
}

const payload = dictionaryJson as DictionaryPayload;

/** English key → entries sharing that headword. */
const byEnglish = new Map<string, VerifiedMatch[]>();
/** Zomi key → entries sharing that Zomi rendering. */
const byZomi = new Map<string, VerifiedMatch[]>();

function push(map: Map<string, VerifiedMatch[]>, key: string, match: VerifiedMatch): void {
  const list = map.get(key);
  if (list) list.push(match);
  else map.set(key, [match]);
}

for (const row of payload.entries) {
  if (!Array.isArray(row) || row.length < 4) continue;
  const [english, pos, zomi] = row;
  if (typeof english !== "string" || typeof zomi !== "string") continue;
  const match: VerifiedMatch = { english, pos: pos ?? "", zomi };
  const ek = english.trim().toLowerCase();
  const zk = zomi.trim().toLowerCase();
  if (ek) push(byEnglish, ek, match);
  if (zk) push(byZomi, zk, match);
}

/** Longest phrase accepted by the fast path (a dictionary headword, not a sentence). */
const MAX_PHRASE_WORDS = 5;

/**
 * Normalizes input for dictionary lookup: collapses whitespace, drops
 * surrounding quotes and trailing sentence punctuation. Returns null when the
 * text cannot be a headword — multi-clause sentences, too many words, or
 * internal sentence punctuation.
 */
function normalizePhrase(text: string): string | null {
  const t = text
    .trim()
    .replace(/^["'\u201c\u2018]+|["'\u201c\u2018]+$/g, "")
    .replace(/[.!?…]+\s*$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!t || t.length > 80) return null;
  const words = t.split(" ");
  if (words.length > MAX_PHRASE_WORDS) return null;
  // Internal sentence punctuation means this is a sentence, not a headword.
  if (/[.;:!?]/.test(t)) return null;
  return t;
}

export interface VerifiedLookup {
  /** Which side of the pair matched the input. */
  side: "english" | "zomi";
  /** All entries sharing the matched key, dataset order. */
  matches: VerifiedMatch[];
}

/**
 * Exact-case-insensitive lookup of a word or short phrase against the
 * verified dataset, trying the English headword side first. Returns null
 * when the input is not a clean headword or has no verified entry.
 */
export function lookupVerified(text: string): VerifiedLookup | null {
  const key = normalizePhrase(text);
  if (!key) return null;
  const english = byEnglish.get(key);
  if (english && english.length > 0) return { side: "english", matches: english };
  const zomi = byZomi.get(key);
  if (zomi && zomi.length > 0) return { side: "zomi", matches: zomi };
  return null;
}

/** Version of the bundled verified dataset backing these lookups. */
export function verifiedDictionaryVersion(): number {
  return payload.version;
}
