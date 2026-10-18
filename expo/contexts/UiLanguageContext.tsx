import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';

import zomiStrings from '@/constants/uiStrings.json';

/** Interface language for menus and buttons (translation direction is separate). */
export type UiLanguage = 'en' | 'zo';

const STORAGE_KEY = '@zomi_ui_language';
const ZOMI: Record<string, string> = zomiStrings;

export const [UiLanguageProvider, useUiLanguage] = createContextHook(() => {
  const [language, setLanguageState] = useState<UiLanguage>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'zo') setLanguageState(saved);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  /** Interface string in the chosen language, falling back to English. */
  const t = useCallback(
    (english: string): string => (language === 'zo' ? ZOMI[english] || english : english),
    [language]
  );

  return useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
});
