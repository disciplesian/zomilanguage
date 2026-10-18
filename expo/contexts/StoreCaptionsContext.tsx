import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Google Play listing locale codes the admin can write screenshot captions for. */
export const STORE_LOCALES: { code: string; label: string }[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-CA', label: 'English (Canada)' },
];

/** The default listing locale; its captions are the fallback for other locales. */
export const DEFAULT_STORE_LOCALE = 'en-US';

/** Captions keyed by locale, then by screenshot key. */
export type CaptionsByLocale = Record<string, Record<string, string>>;

const STORAGE_KEY = '@zomi_store_captions_v1';
const SAVE_DELAY_MS = 400;

const DEFAULT_CAPTIONS: CaptionsByLocale = {
  [DEFAULT_STORE_LOCALE]: {
    '01-translator': 'Instant Zomi translation',
    '02-glossary': 'Offline Zomi dictionary',
    '03-pronunciation': 'Say it right',
    '04-settings': 'Made your own',
  },
};

/**
 * Store Release screenshot captions, stored per locale and persisted on device.
 * Writes are debounced so typing never blocks on storage.
 */
export const [StoreCaptionsProvider, useStoreCaptions] = createContextHook(() => {
  const [captions, setCaptions] = useState<CaptionsByLocale>(DEFAULT_CAPTIONS);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as CaptionsByLocale;
          if (parsed && typeof parsed === 'object') {
            setCaptions({ ...DEFAULT_CAPTIONS, ...parsed });
          }
        }
      } catch (error) {
        console.log('[StoreCaptions] Failed to load captions', error instanceof Error ? error.message : 'unknown');
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(captions)).catch((error: unknown) => {
        console.log('[StoreCaptions] Failed to save captions', error instanceof Error ? error.message : 'unknown');
      });
    }, SAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [captions, isLoaded]);

  const setCaption = useCallback((locale: string, screenshotKey: string, text: string) => {
    setCaptions((prev) => ({
      ...prev,
      [locale]: { ...(prev[locale] ?? {}), [screenshotKey]: text },
    }));
  }, []);

  const getCaption = useCallback(
    (locale: string, screenshotKey: string): string => captions[locale]?.[screenshotKey] ?? '',
    [captions],
  );

  /** Number of screenshots with a non-empty caption in the given locale. */
  const countFilled = useCallback(
    (locale: string, keys: string[]): number =>
      keys.filter((k) => (captions[locale]?.[k] ?? '').trim().length > 0).length,
    [captions],
  );

  return { captions, isLoaded, setCaption, getCaption, countFilled };
});
