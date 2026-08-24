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
  };
}

/** The bundled dataset as normalized rows (basis for exports). */
export function currentDatasetEntries(): string[][] {
  return DICTIONARY_ENTRIES.map((e) => [e.english, e.pos, e.zomi, e.category]);
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
