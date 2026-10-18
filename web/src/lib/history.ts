import { useSyncExternalStore } from 'react';

/** One saved translation shown in History (stored in this browser). */
export interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: 'zomi' | 'english';
  targetLanguage: 'zomi' | 'english';
  createdAt: number;
  isFavorite: boolean;
}

const KEY = 'zomi_history_v1';
const MAX_ITEMS = 200;

let items: HistoryItem[] = load();
const listeners = new Set<() => void>();

function load(): HistoryItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function commit(next: HistoryItem[]): void {
  items = next.slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full — in-memory history still works this session
  }
  listeners.forEach((l) => l());
}

const keyOf = (text: string, target: string): string => `${target}::${text.trim().toLowerCase()}`;

export const history = {
  all: (): HistoryItem[] => items,
  save(entry: Omit<HistoryItem, 'id' | 'createdAt' | 'isFavorite'>): void {
    const k = keyOf(entry.sourceText, entry.targetLanguage);
    const existing = items.find((i) => keyOf(i.sourceText, i.targetLanguage) === k);
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    commit([
      { ...entry, id, createdAt: Date.now(), isFavorite: existing?.isFavorite ?? false },
      ...items.filter((i) => keyOf(i.sourceText, i.targetLanguage) !== k),
    ]);
  },
  lookup(text: string, target: string): HistoryItem | undefined {
    const k = keyOf(text, target);
    return items.find((i) => keyOf(i.sourceText, i.targetLanguage) === k);
  },
  remove(id: string): void {
    commit(items.filter((i) => i.id !== id));
  },
  toggleFavorite(id: string): void {
    commit(items.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)));
  },
  clear(): void {
    commit([]);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** React hook returning the live history list. */
export function useHistory(): HistoryItem[] {
  return useSyncExternalStore(history.subscribe, history.all, history.all);
}
