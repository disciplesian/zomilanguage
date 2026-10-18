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

/** Ranked Zomi-side candidates before final ordering (segment position, dataset order). */
const zomiRank = new Map<string, { match: VerifiedMatch; position: number; order: number }[]>();

/**
 * Splits a Zomi rendering list ("khial, dik lo, maan lo") into individual
 * lookup keys, so every listed Zomi word is reachable for Zomi → English.
 * Parentheticals and long explanatory segments are skipped.
 */
export function zomiSegments(zomi: string): string[] {
  return zomi
    .replace(/\([^)]*\)/g, " ")
    .split(/[,;\/]/)
    .map((s) => s.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ").toLowerCase())
    .filter((s) => s.length > 0 && s.length <= 40 && s.split(" ").length <= MAX_PHRASE_WORDS_INDEX);
}

const MAX_PHRASE_WORDS_INDEX = 5;

let order = 0;
for (const row of payload.entries) {
  if (!Array.isArray(row) || row.length < 4) continue;
  const [english, pos, zomi] = row;
  if (typeof english !== "string" || typeof zomi !== "string") continue;
  const match: VerifiedMatch = { english, pos: pos ?? "", zomi };
  const ek = english.trim().toLowerCase();
  if (ek) push(byEnglish, ek, match);
  // Only real English headwords (letters, spaces, apostrophes, hyphens) can
  // answer a Zomi → English lookup — never numeric or symbol rows.
  if (!/^[a-z][a-z' -]*$/i.test(english.trim())) continue;
  zomiSegments(zomi).forEach((seg, position) => {
    const list = zomiRank.get(seg);
    const item = { match, position, order: order++ };
    if (list) list.push(item);
    else zomiRank.set(seg, [item]);
  });
}
/**
 * Headword popularity proxy: how many dictionary headwords start with this
 * English word ("water" → water, waterfall, watermelon…). Common everyday
 * words have many derived entries, so they outrank rare synonyms
 * ("tui" → "water", not "aqua").
 */
const sortedEnglish = payload.entries
  .map((r) => (typeof r[0] === "string" ? r[0].trim().toLowerCase() : ""))
  .filter(Boolean)
  .sort();
function lowerBound(arr: string[], key: string): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export function headwordPopularity(word: string): number {
  const w = word.trim().toLowerCase();
  if (!w) return 0;
  if (w.length < 3) return lowerBound(sortedEnglish, w + "\u0000") - lowerBound(sortedEnglish, w);
  return lowerBound(sortedEnglish, w + "\uffff") - lowerBound(sortedEnglish, w);
}
const popularityCache = new Map<string, number>();
function popularity(word: string): number {
  let v = popularityCache.get(word);
  if (v === undefined) {
    v = headwordPopularity(word);
    popularityCache.set(word, v);
  }
  return v;
}

for (const [key, list] of zomiRank) {
  list.sort(
    (a, b) =>
      a.position - b.position ||
      popularity(b.match.english) - popularity(a.match.english) ||
      a.order - b.order
  );
  byZomi.set(
    key,
    list.map((i) => i.match)
  );
}
zomiRank.clear();

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

/**
 * Direction-aware lookup: only returns a match from the side that matches the
 * requested source language, so an English word is never "translated" from
 * the Zomi index (and vice versa).
 */
export function lookupVerifiedFor(text: string, source: string): VerifiedLookup | null {
  const key = normalizePhrase(text);
  if (!key) return null;
  if (source === "english" || source === "auto") {
    const english = byEnglish.get(key);
    if (english && english.length > 0) return { side: "english", matches: english };
  }
  if (source === "zomi" || source === "auto") {
    const zomi = byZomi.get(key);
    if (zomi && zomi.length > 0) return { side: "zomi", matches: zomi };
  }
  return null;
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "you", "your", "our", "his", "her", "its",
  "this", "that", "with", "from", "have", "has", "had", "will", "would", "can", "could",
  "not", "but", "they", "them", "she", "him", "who", "what", "when", "where", "how",
  "there", "here", "been", "being", "into", "onto", "than", "then", "also", "very",
]);

/**
 * Sentence grounding: verified entries for the individual content words (and
 * two-word phrases) of a sentence, so the model reuses dictionary terms.
 * Capped to keep the prompt small and the first token fast.
 */
export function groundingFor(text: string, source: string, limit = 14): VerifiedMatch[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}'\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: VerifiedMatch[] = [];
  const seen = new Set<string>();
  const index = source === "zomi" ? byZomi : byEnglish;
  const add = (key: string): boolean => {
    if (seen.has(key)) return false;
    const hit = index.get(key);
    if (!hit || hit.length === 0) return false;
    seen.add(key);
    out.push(hit[0]);
    return true;
  };
  for (let i = 0; i < words.length && out.length < limit; i++) {
    if (i + 1 < words.length && add(`${words[i]} ${words[i + 1]}`)) continue;
    const w = words[i];
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    add(w);
  }
  return out;
}

/** Version of the bundled verified dataset backing these lookups. */
export function verifiedDictionaryVersion(): number {
  return payload.version;
}
