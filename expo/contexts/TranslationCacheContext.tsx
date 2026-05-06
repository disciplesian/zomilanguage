import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useRef, useState } from 'react';

const CACHE_KEY = '@zomi_translation_cache_v1';
const MAX_ENTRIES = 100;

export interface CachedTranslation {
  key: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: 'zomi' | 'english';
  targetLanguage: 'zomi' | 'english';
  confidence: number;
  model: string | null;
  createdAt: number;
  isFavorite?: boolean;
}

let storage: typeof import('@react-native-async-storage/async-storage').default | null = null;
const getStorage = async () => {
  if (storage) return storage;
  try {
    const m = await import('@react-native-async-storage/async-storage');
    storage = m.default;
    return storage;
  } catch {
    return null;
  }
};

const safeGet = async (k: string) => {
  try {
    const s = await getStorage();
    return s ? await s.getItem(k) : null;
  } catch {
    return null;
  }
};
const safeSet = async (k: string, v: string) => {
  try {
    const s = await getStorage();
    if (s) await s.setItem(k, v);
  } catch {}
};

function makeKey(text: string, target: string): string {
  let h = 0x811c9dc5;
  const s = `${target}::${text.trim().toLowerCase()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export const [TranslationCacheProvider, useTranslationCache] = createContextHook(() => {
  const [entries, setEntries] = useState<CachedTranslation[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await safeGet(CACHE_KEY);
      if (!alive) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CachedTranslation[];
          if (Array.isArray(parsed)) setEntries(parsed.slice(0, MAX_ENTRIES));
        } catch {}
      }
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback((next: CachedTranslation[]) => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      safeSet(CACHE_KEY, JSON.stringify(next.slice(0, MAX_ENTRIES)));
    }, 250);
  }, []);

  const lookup = useCallback(
    (text: string, targetLanguage: string): CachedTranslation | null => {
      const k = makeKey(text, targetLanguage);
      return entries.find((e) => e.key === k) ?? null;
    },
    [entries]
  );

  const save = useCallback(
    (data: Omit<CachedTranslation, 'key' | 'createdAt'>): CachedTranslation => {
      const k = makeKey(data.sourceText, data.targetLanguage);
      const entry: CachedTranslation = { ...data, key: k, createdAt: Date.now() };
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.key !== k);
        const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
        persist(next);
        return next;
      });
      return entry;
    },
    [persist]
  );

  const toggleFavorite = useCallback(
    (key: string) => {
      setEntries((prev) => {
        const next = prev.map((e) => (e.key === key ? { ...e, isFavorite: !e.isFavorite } : e));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const remove = useCallback(
    (key: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.key !== key);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    setEntries([]);
    persist([]);
  }, [persist]);

  return { entries, hydrated, lookup, save, toggleFavorite, remove, clear };
});
