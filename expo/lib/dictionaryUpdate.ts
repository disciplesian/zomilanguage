import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  activeDictionaryRows,
  activeDictionaryVersion,
  applyRemoteDataset,
} from '@/constants/dictionaryData';

/**
 * Over-the-air dictionary updates: at startup the app applies the dataset
 * cached from a previous check (works offline), then asks
 * /api/dictionary/latest for a newer published version and persists it for
 * the next launch — so dictionary updates reach users without an app store
 * release.
 */

const STORAGE_KEY = '@zomi_dictionary_dataset';

const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL || process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url && url.length > 0) return url.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://zomilanguage-backend.rork.app';
};

interface LatestResponse {
  available?: boolean;
  version?: number;
  payload?: string;
}

/** Runs the startup update check and returns the active dataset version. */
export async function checkDictionaryUpdate(): Promise<number> {
  // 1. Cached dataset from a previous check — instant and offline-safe.
  try {
    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { version?: number; entries?: unknown };
      applyRemoteDataset(Number(cached.version ?? 0), cached.entries);
    }
  } catch {
    // Corrupt cache — ignore and fall back to the bundled dataset.
  }

  // 2. Fresh server check for a newer published version.
  try {
    const res = await fetch(`${getBaseUrl()}/api/dictionary/latest`);
    if (res.ok) {
      const body = (await res.json()) as LatestResponse;
      if (body.available === true && typeof body.payload === 'string') {
        const parsed = JSON.parse(body.payload) as { entries?: unknown };
        const version = Number(body.version ?? 0);
        if (applyRemoteDataset(version, parsed.entries)) {
          try {
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ version, entries: activeDictionaryRows() })
            );
          } catch {
            // Storage write failed — the in-memory dataset still works.
          }
        }
      }
    }
  } catch {
    // Offline — the cached or bundled dataset still works.
  }

  return activeDictionaryVersion();
}
