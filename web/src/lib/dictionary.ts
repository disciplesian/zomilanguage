import raw from './dictionary.json';

/**
 * The bundled English → Zomi dictionary (33,444 entries; the original 10,620 are
 * human-verified, expanded from the community dictionary archive).
 * Source dataset: English, Part of Speech, Zomi, Category.
 */

export type DictionaryCategory =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'pronoun'
  | 'conjunction'
  | 'interjection'
  | 'prefix'
  | 'particle'
  | 'article'
  | 'other';

export interface DictionaryEntry {
  english: string;
  /** Raw part of speech exactly as recorded in the dataset (e.g. "pas. part."). */
  pos: string;
  zomi: string;
  category: DictionaryCategory;
}

interface RawDictionary {
  version: number;
  count: number;
  entries: [string, string, string, string][];
}

const data = raw as RawDictionary;

export const DICTIONARY_ENTRIES: DictionaryEntry[] = data.entries.map(
  ([english, pos, zomi, category]) => ({ english, pos, zomi, category: category as DictionaryCategory })
);

export const DICTIONARY_COUNT: number = data.count;

/** The dataset actually used for search at runtime: starts as the bundled
 *  entries and is replaced when a newer version arrives from
 *  /api/dictionary/latest (over-the-air dictionary updates). */
let activeEntries: DictionaryEntry[] = DICTIONARY_ENTRIES;
let activeVersion: number = data.version;

export function activeDictionaryCount(): number {
  return activeEntries.length;
}

export function activeDictionaryVersion(): number {
  return activeVersion;
}

/** Repairs Windows-1252 smart quotes that arrive as C1 control characters
 *  (they render as invisible boxes) and straightens curly quotes so typed
 *  apostrophes match ("ka pa'"). */
function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0091\u0092\u2018\u2019]/g, "'")
    .replace(/[\u0093\u0094\u201c\u201d]/g, '"');
}

/** Replaces the active dataset when the remote version is newer than the
 *  current one. Returns true when the dataset was applied. */
export function applyRemoteDataset(version: number, entries: unknown): boolean {
  if (!Array.isArray(entries) || entries.length === 0 || version <= activeVersion) return false;
  const mapped: DictionaryEntry[] = [];
  for (const row of entries) {
    if (!Array.isArray(row) || row.length < 3) continue;
    mapped.push({
      english: cleanText(row[0]),
      pos: String(row[1] ?? ''),
      zomi: cleanText(row[2]),
      category: (typeof row[3] === 'string' ? row[3] : 'other') as DictionaryCategory,
    });
  }
  if (mapped.length === 0) return false;
  activeEntries = mapped;
  activeVersion = version;
  browseCache = null;
  searchIndex = null;
  return true;
}

// ---------------------------------------------------------------------------
// Fast search index: pre-normalized keys so each keystroke is a cheap scan,
// plus exact-match maps for instant word translation.
// ---------------------------------------------------------------------------

/** Lowercases and strips tone marks so "Pasiân" matches "pasian". */
export function fold(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/[\u2018\u2019\u02BC`]/g, "'");
}

/** Individual Zomi renderings of an entry ("khial, dik lo" → ["khial", "dik lo"]). */
export function zomiParts(zomi: string): string[] {
  return zomi
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/]/)
    .map((s) => s.trim().replace(/[.!?]+$/, ''))
    .filter((s) => s.length > 0 && s.length <= 40 && s.split(' ').length <= 5);
}

interface SearchIndex {
  english: string[];
  zomi: string[];
  exactEnglish: Map<string, number[]>;
  exactZomi: Map<string, number[]>;
}

let searchIndex: SearchIndex | null = null;

function index(): SearchIndex {
  if (searchIndex) return searchIndex;
  const english: string[] = new Array(activeEntries.length);
  const zomi: string[] = new Array(activeEntries.length);
  const exactEnglish = new Map<string, number[]>();
  const ranked = new Map<string, [number, number][]>();
  for (let i = 0; i < activeEntries.length; i++) {
    const e = activeEntries[i];
    const en = fold(e.english);
    english[i] = en;
    zomi[i] = fold(e.zomi);
    const list = exactEnglish.get(en);
    if (list) list.push(i);
    else exactEnglish.set(en, [i]);
    if (!/^[a-z][a-z' -]*$/i.test(e.english.trim())) continue;
    zomiParts(e.zomi).forEach((part, position) => {
      const key = fold(part);
      const r = ranked.get(key);
      if (r) r.push([position, i]);
      else ranked.set(key, [[position, i]]);
    });
  }
  // Popularity proxy: common words have many derived headwords
  // ("water", "waterfall", …), so they outrank rare synonyms.
  const sorted = [...english].sort();
  const lowerBound = (key: string): number => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < key) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const popCache = new Map<number, number>();
  const popularity = (i: number): number => {
    const cached = popCache.get(i);
    if (cached !== undefined) return cached;
    const w = english[i];
    const v = w.length < 3 ? lowerBound(w + '\u0001') - lowerBound(w) : lowerBound(w + '\uffff') - lowerBound(w);
    popCache.set(i, v);
    return v;
  };
  const exactZomi = new Map<string, number[]>();
  for (const [key, list] of ranked) {
    exactZomi.set(
      key,
      list.sort((a, b) => a[0] - b[0] || popularity(b[1]) - popularity(a[1]) || a[1] - b[1]).map((x) => x[1])
    );
  }
  searchIndex = { english, zomi, exactEnglish, exactZomi };
  return searchIndex;
}

/** Builds the index during idle time so the first keystroke is instant. */
export function warmUpDictionary(): void {
  const run = (): void => {
    index();
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run);
  else window.setTimeout(run, 50);
}

/**
 * Instant on-device translation of a dictionary word or short phrase.
 * Returns null for sentences and for words not in the verified dictionary.
 */
export function instantTranslation(
  text: string,
  zomiToEnglish: boolean
): { text: string; alternatives: string[] } | null {
  const q = fold(text)
    .replace(/^["'“”‘’\s]+|["'“”‘’.!?…\s]+$/g, '')
    .replace(/\s+/g, ' ');
  if (!q || q.length > 80 || q.split(' ').length > 5 || /[.;:!?]/.test(q)) return null;
  const idx = index();
  const candidates: string[] = [];
  if (zomiToEnglish) {
    const hits = idx.exactZomi.get(q);
    if (!hits) return null;
    for (const i of hits) candidates.push(activeEntries[i].english);
  } else {
    const hits = idx.exactEnglish.get(q);
    if (!hits) return null;
    for (const i of hits) {
      const parts = activeEntries[i].zomi
        .replace(/\([^)]*\)/g, ' ')
        .split(/[,;]/)
        .map((s) => s.trim().replace(/\s+/g, ' '))
        .filter((s) => s.length > 0 && s.length <= 40);
      candidates.push(...(parts.length > 0 ? parts : [activeEntries[i].zomi]));
    }
  }
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const k = c.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length === 0) return null;
  return { text: unique[0], alternatives: unique.slice(1, 3) };
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const CACHE_KEY = 'zomi-dictionary-dataset-v1';

/** Applies the dataset cached by a previous update check (works offline). */
export function loadCachedDictionary(): boolean {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { version?: number; entries?: unknown };
    return applyRemoteDataset(Number(parsed.version ?? 0), parsed.entries);
  } catch {
    return false;
  }
}

/** Persists the active dataset so the next visit starts up-to-date offline. */
export function cacheDictionary(): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: activeVersion,
        entries: activeEntries.map((e) => [e.english, e.pos, e.zomi, e.category]),
      })
    );
  } catch {
    // Storage quota exceeded — the in-memory dataset still works.
  }
}

/** Chip color per category, tuned for the dark portal theme. */
export const CATEGORY_COLORS: Record<DictionaryCategory, string> = {
  noun: '#63C0FF',
  verb: '#00F0FF',
  adjective: '#B98CFF',
  adverb: '#FFB84D',
  preposition: '#FF8FA3',
  pronoun: '#7EE8A2',
  conjunction: '#FFD166',
  interjection: '#FF7B72',
  prefix: '#9CD1FF',
  particle: '#C9B8FF',
  article: '#A0D2DB',
  other: '#9BA3AF',
};

/** Label for the POS chip (falls back to the category name). */
export function posLabel(entry: DictionaryEntry): string {
  return entry.pos || entry.category;
}

/**
 * Rank dictionary matches for a query. Lower score = better:
 * 0 exact English · 1 English prefix · 2 English contains
 * 3 exact Zomi · 4 Zomi prefix · 5 Zomi contains
 */
export function searchDictionary(query: string, limit = 60): DictionaryEntry[] {
  const q = fold(query);
  if (!q) return [];
  const idx = index();
  const scored: { score: number; index: number }[] = [];
  const used = new Set<number>();
  for (const i of idx.exactEnglish.get(q) ?? []) if (!used.has(i)) { used.add(i); scored.push({ score: 0, index: i }); }
  for (const i of idx.exactZomi.get(q) ?? []) if (!used.has(i)) { used.add(i); scored.push({ score: 1, index: i }); }
  const short = q.length < 2;
  for (let i = 0; i < idx.english.length; i++) {
    if (used.has(i)) continue;
    const en = idx.english[i];
    const zo = idx.zomi[i];
    let score = -1;
    if (en.startsWith(q)) score = 2;
    else if (zo.startsWith(q)) score = 3;
    else if (!short && en.includes(q)) score = 4;
    else if (!short && zo.includes(q)) score = 5;
    if (score >= 0) scored.push({ score, index: i });
  }
  if (scored.length === 0 && q.length >= 4) {
    for (let i = 0; i < idx.english.length && scored.length < limit; i++) {
      const en = idx.english[i];
      if (en[0] === q[0] && withinOneEdit(en, q)) scored.push({ score: 6, index: i });
    }
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      idx.english[a.index].length - idx.english[b.index].length ||
      a.index - b.index
  );
  return scored.slice(0, limit).map((m) => activeEntries[m.index]);
}

/** True when the query has an exact English or Zomi match (gates the AI fallback). */
export function hasExactMatch(query: string): boolean {
  const q = fold(query);
  if (!q) return true;
  const idx = index();
  return idx.exactEnglish.has(q) || idx.exactZomi.has(q) || idx.zomi.includes(q);
}

export interface SearchSuggestion {
  /** Full headword that completes the query. */
  text: string;
  /** The other language's translation, shown beside the headword. */
  hint: string;
  /** Language of the matched headword: 'en' or 'zo'. */
  lang: 'en' | 'zo';
}

/**
 * Real-time completions for the search bar, ranked: exact English → exact
 * Zomi → English prefix → Zomi prefix → English contains → Zomi contains.
 * Headwords equal to the typed query are skipped so every suggestion
 * advances the query toward a full word.
 */
export function suggestTerms(query: string, limit = 8): SearchSuggestion[] {
  const q = fold(query);
  if (!q) return [];
  const idx = index();
  const long = q.length >= 2;
  const best = new Map<string, { s: SearchSuggestion; score: number; index: number }>();
  for (let i = 0; i < idx.english.length; i++) {
    const en = idx.english[i];
    const zo = idx.zomi[i];
    const enScore = en === q ? 0 : en.startsWith(q) ? 2 : long && en.includes(q) ? 4 : -1;
    const zoScore = zo === q ? 1 : zo.startsWith(q) ? 3 : long && zo.includes(q) ? 5 : -1;
    if (enScore < 0 && zoScore < 0) continue;
    const e = activeEntries[i];
    const candidates: [string, string, 'en' | 'zo', number][] = [
      [e.english, e.zomi, 'en', enScore],
      [e.zomi, e.english, 'zo', zoScore],
    ];
    for (const [text, hint, lang, score] of candidates) {
      if (score < 0 || fold(text) === q) continue;
      const key = text.toLowerCase();
      const prev = best.get(key);
      if (prev && prev.score <= score) continue;
      best.set(key, { s: { text, hint, lang }, score, index: i });
    }
  }
  return Array.from(best.values())
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((m) => m.s);
}

export interface BrowseSection {
  letter: string;
  entries: DictionaryEntry[];
}

let browseCache: BrowseSection[] | null = null;

/**
 * All entries grouped by first letter (A–Z, then # for digits/symbols), each
 * group sorted alphabetically. Computed once and cached — powers offline browsing.
 */
export function browseSections(): BrowseSection[] {
  if (browseCache) return browseCache;
  const buckets = new Map<string, DictionaryEntry[]>();
  for (const e of activeEntries) {
    const first = e.english.trim().toLowerCase();
    const letter = first && /[a-z]/.test(first[0]) ? first[0].toUpperCase() : '#';
    const bucket = buckets.get(letter);
    if (bucket) bucket.push(e);
    else buckets.set(letter, [e]);
  }
  const sections = Array.from(buckets.entries())
    .map(([letter, entries]) => ({
      letter,
      entries: entries.sort((a, b) =>
        a.english.toLowerCase().localeCompare(b.english.toLowerCase())
      ),
    }))
    .sort((a, b) =>
      a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter.localeCompare(b.letter)
    );
  browseCache = sections;
  return sections;
}

/** Available browse letters, in index order. */
export function browseLetters(): string[] {
  return browseSections().map((s) => s.letter);
}

/** Alphabetically sorted entries whose English headword starts with the letter. */
export function entriesForLetter(letter: string): DictionaryEntry[] {
  return browseSections().find((s) => s.letter === letter)?.entries ?? [];
}

/** Short plain-language description of each grammatical category. */
export const CATEGORY_DESCRIPTIONS: Record<DictionaryCategory, string> = {
  noun: 'Names a person, place, thing, or idea.',
  verb: 'Describes an action or a state of being.',
  adjective: 'Describes or modifies a noun.',
  adverb: 'Modifies a verb, adjective, or another adverb.',
  preposition: 'Shows the relationship between a noun and another word.',
  pronoun: 'Stands in place of a noun.',
  conjunction: 'Joins words, phrases, or clauses together.',
  interjection: 'Expresses a sudden emotion or reaction.',
  prefix: 'Attaches to the start of a word to change its meaning.',
  particle: 'A small function word that carries grammatical meaning.',
  article: 'Introduces a noun (a, an, the).',
  other: 'A word that does not fit the standard grammatical categories.',
};

/**
 * Entries related to the given one, ranked by shared English prefix, shared
 * Zomi prefix, and same grammatical category. Computed locally over the
 * verified dataset, so it works fully offline.
 */
export function relatedEntries(entry: DictionaryEntry, limit = 6): DictionaryEntry[] {
  const en = entry.english.toLowerCase();
  const zo = entry.zomi.toLowerCase();
  const prefixLen = (a: string, b: string): number => {
    let n = 0;
    const max = Math.min(a.length, b.length, 8);
    while (n < max && a[n] === b[n]) n++;
    return n >= 2 ? n : 0;
  };
  const seen = new Set([en]);
  const scored: { entry: DictionaryEntry; score: number }[] = [];
  for (const e of activeEntries) {
    const eEn = e.english.toLowerCase();
    if (seen.has(eEn)) continue;
    const score =
      prefixLen(en, eEn) * 3 +
      prefixLen(zo, e.zomi.toLowerCase()) * 2 +
      (e.category === entry.category ? 1 : 0);
    if (score <= 1) continue;
    seen.add(eEn);
    scored.push({ entry: e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => m.entry);
}
