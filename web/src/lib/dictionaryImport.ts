import { DICTIONARY_ENTRIES, type DictionaryCategory } from './dictionary';

/**
 * Admin dictionary dataset tooling: parse an uploaded CSV/XLSX/JSON file into
 * the normalized dictionary format (English, POS, Zomi, category), validate it,
 * and export it as the bundle file used by the Expo/iOS/Android/web apps.
 */

export interface ImportReport {
  fileName: string;
  totalRows: number;
  validCount: number;
  skippedCount: number;
  duplicateCount: number;
  categoryCounts: Partial<Record<DictionaryCategory, number>>;
  errors: string[];
  /** Normalized rows: [english, pos, zomi, category]. */
  entries: string[][];
  /** Per-entry diff result versus the currently bundled dataset. */
  diff: DatasetDiff;
}

const CATEGORY_ORDER: DictionaryCategory[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'pronoun',
  'conjunction',
  'interjection',
  'prefix',
  'particle',
  'article',
  'other',
];

function isCategory(value: string): value is DictionaryCategory {
  return (CATEGORY_ORDER as string[]).includes(value);
}

/** Maps a raw part-of-speech string (129 variants in the source data) to one
 *  of the 12 chip categories used across the apps. */
export function normalizeCategory(pos: string): DictionaryCategory {
  const p = pos.trim().toLowerCase();
  if (!p) return 'other';
  if (/pron/.test(p)) return 'pronoun';
  if (/participle|pas\. part\.|pres\. part\./.test(p)) return 'verb';
  if (/particle/.test(p)) return 'particle';
  if (/adj/.test(p)) return 'adjective';
  if (/adv/.test(p)) return 'adverb';
  if (/prep/.test(p)) return 'preposition';
  if (/conj/.test(p)) return 'conjunction';
  if (/interj/.test(p)) return 'interjection';
  if (/prefix/.test(p)) return 'prefix';
  if (/article|^art\b|^art\./.test(p)) return 'article';
  if (/verb|transitive|intransitive|^v\b|^v\.|\bvi\b|\bvt\b/.test(p)) return 'verb';
  if (/noun|^n\b|^n\./.test(p)) return 'noun';
  return 'other';
}

/** Reads an uploaded file into raw string rows (first sheet for spreadsheets). */
export async function parseImportFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) {
    return parseJsonRows(await file.text());
  }
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('Unsupported file type — upload a .csv, .xlsx or .json file.');
  }
  // SheetJS is loaded on demand so it stays out of the main bundle.
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('The file contains no sheets.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });
  return rows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []));
}

function parseJsonRows(text: string): string[][] {
  const data: unknown = JSON.parse(text);
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return data.map((row) => row.map((cell) => String(cell ?? '')));
    }
    return data.map((obj) => {
      const record = (obj ?? {}) as Record<string, unknown>;
      return ['english', 'pos', 'zomi', 'category'].map((key) =>
        record[key] == null ? '' : String(record[key])
      );
    });
  }
  const wrapped = data as { entries?: unknown };
  if (wrapped && Array.isArray(wrapped.entries)) {
    return parseJsonRows(JSON.stringify(wrapped.entries));
  }
  throw new Error('Unsupported JSON structure — expected an entries array.');
}

/** Detects a header row (English / Part of Speech / Zomi) and returns the
 *  column indices for english, pos, zomi and category. */
function detectColumns(rows: string[][]): { header: boolean; english: number; pos: number; zomi: number; category: number } {
  const first = rows.find((r) => r.some((cell) => cell.trim() !== '')) ?? [];
  const lower = first.map((cell) => cell.trim().toLowerCase());
  const findIndex = (patterns: RegExp[], fallback: number): number => {
    for (const pattern of patterns) {
      const i = lower.findIndex((cell) => pattern.test(cell));
      if (i >= 0) return i;
    }
    return fallback;
  };
  const looksLikeHeader =
    /english|word/.test(lower[0] ?? '') && lower.some((cell) => /zomi|translation/.test(cell));
  if (!looksLikeHeader) {
    return { header: false, english: 0, pos: 1, zomi: 2, category: 3 };
  }
  return {
    header: true,
    english: findIndex([/english/, /^word/], 0),
    pos: findIndex([/part of speech/, /^pos\b/, /^pos$/], 1),
    zomi: findIndex([/zomi/, /translation/], 2),
    category: findIndex([/category/], 3),
  };
}

/** Validates raw rows and builds the normalized dataset with a full report. */
export function buildImportReport(fileName: string, rows: string[][]): ImportReport {
  const cols = detectColumns(rows);
  const errors: string[] = [];
  const seen = new Set<string>();
  const entries: string[][] = [];
  const categoryCounts: Partial<Record<DictionaryCategory, number>> = {};
  let totalRows = 0;
  let skippedCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    if (cols.header && row === rows.find((r) => r.some((cell) => cell.trim() !== ''))) continue;
    if (!row.some((cell) => cell.trim() !== '')) continue;
    totalRows += 1;

    const english = (row[cols.english] ?? '').trim();
    const pos = (row[cols.pos] ?? '').trim();
    const zomi = (row[cols.zomi] ?? '').trim();
    const rawCategory = (row[cols.category] ?? '').trim().toLowerCase();

    if (!english || !zomi) {
      skippedCount += 1;
      if (errors.length < 5) errors.push(`Skipped row ${totalRows}: missing English or Zomi text.`);
      continue;
    }

    const key = `${english.toLowerCase()}|${pos.toLowerCase()}|${zomi.toLowerCase()}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);

    const category = isCategory(rawCategory) ? rawCategory : normalizeCategory(pos);
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    entries.push([english, pos, zomi, category]);
  }

  if (entries.length === 0) {
    throw new Error('No valid entries found — expected columns: English, Part of Speech, Zomi.');
  }

  return {
    fileName,
    totalRows,
    validCount: entries.length,
    skippedCount,
    duplicateCount,
    categoryCounts,
    errors,
    entries,
    diff: diffAgainstCurrent(entries),
  };
}

/** The bundled dataset as normalized rows (basis for exports). */
export function currentDatasetEntries(): string[][] {
  return DICTIONARY_ENTRIES.map((e) => [e.english, e.pos, e.zomi, e.category]);
}

/** Diff status of one imported entry versus the bundled dataset. */
export type EntryStatus = 'new' | 'changed' | 'same';

export interface DatasetDiff {
  newCount: number;
  changedCount: number;
  sameCount: number;
  removedCount: number;
  /** Up to 5 English words present in the bundle but absent from the import. */
  removedSamples: string[];
  /** Parallel to the entries array the diff was computed against. */
  statuses: EntryStatus[];
}

function rowKey(row: string[]): string {
  return `${row[0].toLowerCase()}|${row[1].toLowerCase()}|${row[2].toLowerCase()}`;
}

/** Compares a normalized entry list with the bundled dataset: entries that do
 *  not exist at all are "new", entries whose English word exists but whose POS
 *  or translation differ are "changed", and bundled entries missing from the
 *  import are counted as removed. */
export function diffAgainstCurrent(entries: string[][]): DatasetDiff {
  const existing = currentDatasetEntries();
  const existingByKey = new Set<string>();
  const existingByEnglish = new Set<string>();
  for (const row of existing) {
    existingByKey.add(rowKey(row));
    existingByEnglish.add(row[0].toLowerCase());
  }

  let newCount = 0;
  let changedCount = 0;
  let sameCount = 0;
  const statuses: EntryStatus[] = entries.map((row) => {
    if (existingByKey.has(rowKey(row))) {
      sameCount += 1;
      return 'same';
    }
    if (existingByEnglish.has(row[0].toLowerCase())) {
      changedCount += 1;
      return 'changed';
    }
    newCount += 1;
    return 'new';
  });

  const importKeys = new Set(entries.map(rowKey));
  const removedSamples: string[] = [];
  let removedCount = 0;
  for (const row of existing) {
    if (!importKeys.has(rowKey(row))) {
      removedCount += 1;
      if (removedSamples.length < 5) removedSamples.push(row[0]);
    }
  }

  return { newCount, changedCount, sameCount, removedCount, removedSamples, statuses };
}

/** Row in the manager's searchable browser view. */
export interface EntryRow {
  english: string;
  pos: string;
  zomi: string;
  category: string;
  status: EntryStatus;
}

/** Builds the browser view model for the bundled dataset or an import preview. */
export function toEntryRows(entries: string[][], statuses?: EntryStatus[]): EntryRow[] {
  return entries.map((row, i) => ({
    english: row[0],
    pos: row[1],
    zomi: row[2],
    category: row[3],
    status: statuses?.[i] ?? 'same',
  }));
}

export type StatusFilter = 'all' | 'new' | 'changed' | 'same';

/** Case-insensitive search over English and Zomi text with an optional diff
 *  status filter. Returns at most 200 rows for the preview table. */
export function filterEntryRows(
  rows: EntryRow[],
  query: string,
  statusFilter: StatusFilter
): EntryRow[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => r.english.toLowerCase().includes(q) || r.zomi.toLowerCase().includes(q))
    : rows;
  const scoped =
    statusFilter === 'all' ? filtered : filtered.filter((r) => r.status === statusFilter);
  return scoped.slice(0, 200);
}

/** Serializes rows into the exact dictionary.json format bundled in the apps. */
export function datasetToJson(entries: string[][]): string {
  return JSON.stringify({ version: 1, count: entries.length, entries });
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes rows as a CSV with a header row (English, Part of Speech, Zomi, Category). */
export function datasetToCsv(entries: string[][]): string {
  const lines = ['English,Part of Speech,Zomi,Category'];
  for (const [english, pos, zomi, category] of entries) {
    lines.push([english, pos, zomi, category].map(csvCell).join(','));
  }
  return lines.join('\n');
}

/** Triggers a browser download of the given content. */
export function downloadFile(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
