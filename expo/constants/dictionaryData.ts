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

export const DICTIONARY_ENTRIES: DictionaryEntry[] = data.entries.map(([english, pos, zomi, category]) => ({
  english,
  pos,
  zomi,
  category: category as DictionaryCategory,
}));

export const DICTIONARY_COUNT: number = data.count;

/** The dataset actually used for search at runtime: starts as the bundled
 *  entries and is replaced when a newer version arrives from
 *  /api/dictionary/latest (over-the-air dictionary updates). */
let activeEntries: DictionaryEntry[] = DICTIONARY_ENTRIES;
let activeVersion: number = data.version;

/** Picks `count` random entries from the active dataset via partial
 *  Fisher–Yates — used for the Dictionary page's discovery cards. */
export function randomEntries(count: number): DictionaryEntry[] {
  const pool = activeEntries;
  const n = Math.min(count, pool.length);
  const used = new Set<number>();
  const picked: DictionaryEntry[] = [];
  while (picked.length < n) {
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]!);
  }
  return picked;
}

export function activeDictionaryCount(): number {
  return activeEntries.length;
}

export function activeDictionaryVersion(): number {
  return activeVersion;
}

/** The active dataset as normalized rows (for persistence). */
export function activeDictionaryRows(): string[][] {
  return activeEntries.map((e) => [e.english, e.pos, e.zomi, e.category]);
}

/** Replaces the active dataset when the remote version is newer than the
 *  current one. Returns true when the dataset was applied. */
export function applyRemoteDataset(version: number, entries: unknown): boolean {
  if (!Array.isArray(entries) || entries.length === 0 || version <= activeVersion) return false;
  const mapped: DictionaryEntry[] = [];
  for (const row of entries) {
    if (!Array.isArray(row) || row.length < 3) continue;
    mapped.push({
      english: String(row[0]),
      pos: String(row[1] ?? ''),
      zomi: String(row[2]),
      category: (typeof row[3] === 'string' ? row[3] : 'other') as DictionaryCategory,
    });
  }
  if (mapped.length === 0) return false;
  activeEntries = mapped;
  activeVersion = version;
  browseCache = null;
  return true;
}

/** Chip color per category, tuned for the dark glass theme. */
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

/** Short label for a category chip (falls back to the raw POS). */
export function categoryLabel(entry: DictionaryEntry): string {
  const labels: Record<DictionaryCategory, string> = {
    noun: 'noun',
    verb: 'verb',
    adjective: 'adj.',
    adverb: 'adv.',
    preposition: 'prep.',
    pronoun: 'pron.',
    conjunction: 'conj.',
    interjection: 'interj.',
    prefix: 'prefix',
    particle: 'particle',
    article: 'article',
    other: 'word',
  };
  return entry.pos || labels[entry.category];
}

export interface ScoredMatch {
  entry: DictionaryEntry;
  score: number;
  index: number;
}

/**
 * Rank dictionary matches for a query. Lower score = better:
 * 0 exact English · 1 English prefix · 2 English contains
 * 3 exact Zomi · 4 Zomi prefix · 5 Zomi contains
 */
export function searchDictionary(query: string, limit = 60): DictionaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: ScoredMatch[] = [];
  for (let i = 0; i < activeEntries.length; i++) {
    const e = activeEntries[i];
    const en = e.english.toLowerCase();
    const zo = e.zomi.toLowerCase();
    let score = -1;
    if (en === q) score = 0;
    else if (en.startsWith(q)) score = 1;
    else if (en.includes(q)) score = 2;
    else if (zo === q) score = 3;
    else if (zo.startsWith(q)) score = 4;
    else if (zo.includes(q)) score = 5;
    if (score >= 0) scored.push({ entry: e, score, index: i });
  }
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.slice(0, limit).map((m) => m.entry);
}

/** True when the query has an exact English or Zomi match (used to gate AI fallback). */
export function hasExactMatch(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return activeEntries.some(
    (e) => e.english.toLowerCase() === q || e.zomi.toLowerCase() === q
  );
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
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const best = new Map<string, { s: SearchSuggestion; score: number; index: number }>();
  for (let i = 0; i < activeEntries.length; i++) {
    const e = activeEntries[i];
    const en = e.english.toLowerCase();
    const zo = e.zomi.toLowerCase();
    const candidates: [string, string, 'en' | 'zo', number][] = [
      [e.english, e.zomi, 'en', en === q ? 0 : en.startsWith(q) ? 2 : en.includes(q) ? 4 : -1],
      [e.zomi, e.english, 'zo', zo === q ? 1 : zo.startsWith(q) ? 3 : zo.includes(q) ? 5 : -1],
    ];
    for (const [text, hint, lang, score] of candidates) {
      if (score < 0 || text.toLowerCase() === q) continue;
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
