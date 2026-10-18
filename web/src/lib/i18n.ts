import { useCallback, useSyncExternalStore } from 'react';

import zomiStrings from '@/content/ui-strings.json';

/** Interface language. Translation direction is separate and unaffected. */
export type UiLanguage = 'en' | 'zo';

const STORAGE_KEY = 'zomi-ui-language';
const ZOMI: Record<string, string> = zomiStrings;
const listeners = new Set<() => void>();

function initialLanguage(): UiLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zo') return saved;
  } catch {
    // storage unavailable (private mode)
  }
  return 'en';
}

let current: UiLanguage = typeof window === 'undefined' ? 'en' : initialLanguage();

/** Changes the interface language and re-renders every subscribed component. */
export function setUiLanguage(language: UiLanguage): void {
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore
  }
  document.documentElement.lang = language === 'zo' ? 'ctd' : 'en';
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translates an English UI string; falls back to English when missing. */
export function translateUi(english: string, language: UiLanguage = current): string {
  if (language !== 'zo') return english;
  return ZOMI[english] || english;
}

/** Current interface language plus a `t()` helper bound to it. */
export function useUiLanguage(): { language: UiLanguage; t: (english: string) => string } {
  const language = useSyncExternalStore(subscribe, () => current, () => 'en' as UiLanguage);
  const t = useCallback((english: string) => translateUi(english, language), [language]);
  return { language, t };
}
