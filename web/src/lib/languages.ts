/**
 * Language catalog for the translator's target-language picker.
 *
 * `code` is the stable identifier sent to the backend; `tts` is the BCP-47
 * tag used for browser speech synthesis. Translation is currently offered in
 * two directions only — Zomi ⇄ English — so the catalog contains just those
 * two.
 */
export interface LanguageOption {
  code: string;
  label: string;
  native: string;
  tts: string;
}

export const ZOMI_LANGUAGE: LanguageOption = {
  code: 'zomi',
  label: 'Zomi',
  native: 'Zou',
  tts: 'zomi',
};

export const ENGLISH_LANGUAGE: LanguageOption = {
  code: 'english',
  label: 'English',
  native: 'English',
  tts: 'en',
};

/** The two primary languages pinned at the top of the picker. */
export const PRIMARY_LANGUAGES: LanguageOption[] = [ZOMI_LANGUAGE, ENGLISH_LANGUAGE];

/**
 * Additional target languages. TEMPORARILY EMPTY: translation is limited to
 * Zomi ⇄ English only. Restore the full list here when other directions are
 * enabled again.
 */
export const OTHER_LANGUAGES: LanguageOption[] = [];

/** Every supported target language, primary languages first. */
export const ALL_LANGUAGES: LanguageOption[] = [...PRIMARY_LANGUAGES, ...OTHER_LANGUAGES];

const BY_CODE = new Map<string, LanguageOption>(ALL_LANGUAGES.map((l) => [l.code, l]));

/** Looks up a language option by its code. */
export function getLanguage(code: string): LanguageOption | undefined {
  return BY_CODE.get(code);
}

/** Display name for a language code; falls back to a prettified code. */
export function languageLabel(code: string): string {
  const lang = BY_CODE.get(code);
  if (lang) return lang.label;
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** BCP-47 tag for speech synthesis; falls back to US English. */
export function languageTtsCode(code: string): string {
  const tag = BY_CODE.get(code)?.tts;
  if (!tag || tag === 'zomi') return 'en-US';
  return tag;
}

/** True when the code is one of the two primary languages. */
export function isPrimaryLanguage(code: string): boolean {
  return code === 'zomi' || code === 'english';
}
