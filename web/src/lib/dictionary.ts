import raw from './dictionary.json';

/**
 * The bundled English → Zomi dictionary (10,620 verified entries).
 * Source dataset: English, Part of Speech, Zomi — all entries human-verified.
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
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { entry: DictionaryEntry; score: number; index: number }[] = [];
  for (let i = 0; i < DICTIONARY_ENTRIES.length; i++) {
    const e = DICTIONARY_ENTRIES[i];
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

/** True when the query has an exact English or Zomi match (gates the AI fallback). */
export function hasExactMatch(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return DICTIONARY_ENTRIES.some(
    (e) => e.english.toLowerCase() === q || e.zomi.toLowerCase() === q
  );
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
  for (const e of DICTIONARY_ENTRIES) {
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
