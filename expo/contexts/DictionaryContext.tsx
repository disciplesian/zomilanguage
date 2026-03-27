import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { DictionaryEntry } from '@/backend/db/schema';

const FAVORITES_KEY = '@zomi_dict_favorites';
const SEARCH_HISTORY_KEY = '@zomi_dict_search_history';
const CACHED_ENTRIES_KEY = '@zomi_dict_cached_entries';

const MAX_HISTORY = 30;
const MAX_CACHED = 100;

let asyncStorageModule: typeof import('@react-native-async-storage/async-storage').default | null = null;

const getAsyncStorage = async () => {
  if (asyncStorageModule) return asyncStorageModule;
  try {
    const module = await import('@react-native-async-storage/async-storage');
    asyncStorageModule = module.default;
    return asyncStorageModule;
  } catch {
    return null;
  }
};

const safeGet = async (key: string): Promise<string | null> => {
  try {
    const storage = await getAsyncStorage();
    if (!storage) return null;
    return await storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = async (key: string, value: string): Promise<void> => {
  try {
    const storage = await getAsyncStorage();
    if (!storage) return;
    await storage.setItem(key, value);
  } catch {
    console.log('[DictContext] Storage set failed for', key);
  }
};

export interface FavoriteEntry {
  id: string;
  english: string;
  zomi: string;
  pos?: string;
  savedAt: string;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
}

export const [DictionaryProvider, useDictionary] = createContextHook(() => {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [cachedEntries, setCachedEntries] = useState<Record<string, DictionaryEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSearch, setPendingSearch] = useState<string>('');
  const initRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const load = async () => {
      try {
        const [favsRaw, historyRaw, cachedRaw] = await Promise.all([
          safeGet(FAVORITES_KEY),
          safeGet(SEARCH_HISTORY_KEY),
          safeGet(CACHED_ENTRIES_KEY),
        ]);

        if (!mountedRef.current) return;

        if (favsRaw) {
          try { setFavorites(JSON.parse(favsRaw)); } catch {}
        }
        if (historyRaw) {
          try { setSearchHistory(JSON.parse(historyRaw)); } catch {}
        }
        if (cachedRaw) {
          try { setCachedEntries(JSON.parse(cachedRaw)); } catch {}
        }
      } catch {
        console.log('[DictContext] Load failed');
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    setTimeout(load, 50);
  }, []);

  const addFavorite = useCallback((entry: { id: string; english: string; zomi: string; pos?: string }) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === entry.id)) return prev;
      const updated = [{ ...entry, savedAt: new Date().toISOString() }, ...prev];
      safeSet(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((entryId: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== entryId);
      safeSet(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((entryId: string) => {
    return favorites.some(f => f.id === entryId);
  }, [favorites]);

  const addSearchHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.query.toLowerCase() !== trimmed.toLowerCase());
      const updated = [{ query: trimmed, timestamp: new Date().toISOString() }, ...filtered].slice(0, MAX_HISTORY);
      safeSet(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    safeSet(SEARCH_HISTORY_KEY, JSON.stringify([]));
  }, []);

  const cacheEntry = useCallback((entry: DictionaryEntry) => {
    setCachedEntries(prev => {
      const updated = { ...prev, [entry.id]: entry };
      const keys = Object.keys(updated);
      if (keys.length > MAX_CACHED) {
        const toRemove = keys.slice(0, keys.length - MAX_CACHED);
        toRemove.forEach(k => delete updated[k]);
      }
      safeSet(CACHED_ENTRIES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getCachedEntry = useCallback((id: string): DictionaryEntry | null => {
    return cachedEntries[id] || null;
  }, [cachedEntries]);

  const triggerSearch = useCallback((query: string) => {
    setPendingSearch(query);
  }, []);

  const clearPendingSearch = useCallback(() => {
    setPendingSearch('');
  }, []);

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  return {
    favorites,
    searchHistory,
    isLoading,
    pendingSearch,
    addFavorite,
    removeFavorite,
    isFavorite,
    addSearchHistory,
    clearSearchHistory,
    cacheEntry,
    getCachedEntry,
    triggerSearch,
    clearPendingSearch,
    favoriteIds,
  };
});

export function useDictionaryFavoriteCheck(entryId: string) {
  const { favoriteIds } = useDictionary();
  return useMemo(() => favoriteIds.has(entryId), [favoriteIds, entryId]);
}
