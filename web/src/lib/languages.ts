/**
 * Language catalog for the translator's target-language picker.
 *
 * `code` is the stable identifier sent to the backend; `tts` is the BCP-47
 * tag used for browser speech synthesis. Zomi and English are always pinned
 * at the top of the picker; everything else follows alphabetically.
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

/** Additional target languages, sorted by display name. */
export const OTHER_LANGUAGES: LanguageOption[] = [
  { code: 'amharic', label: 'Amharic', native: 'አማርኛ', tts: 'am' },
  { code: 'arabic', label: 'Arabic', native: 'العربية', tts: 'ar' },
  { code: 'bengali', label: 'Bengali', native: 'বাংলা', tts: 'bn' },
  { code: 'burmese', label: 'Burmese', native: 'မြန်မာ', tts: 'my' },
  { code: 'chinese_simplified', label: 'Chinese (Simplified)', native: '简体中文', tts: 'zh-CN' },
  { code: 'chinese_traditional', label: 'Chinese (Traditional)', native: '繁體中文', tts: 'zh-TW' },
  { code: 'dutch', label: 'Dutch', native: 'Nederlands', tts: 'nl' },
  { code: 'filipino', label: 'Filipino', native: 'Filipino', tts: 'fil' },
  { code: 'french', label: 'French', native: 'Français', tts: 'fr' },
  { code: 'german', label: 'German', native: 'Deutsch', tts: 'de' },
  { code: 'greek', label: 'Greek', native: 'Ελληνικά', tts: 'el' },
  { code: 'hausa', label: 'Hausa', native: 'Hausa', tts: 'ha' },
  { code: 'hebrew', label: 'Hebrew', native: 'עברית', tts: 'he' },
  { code: 'hindi', label: 'Hindi', native: 'हिन्दी', tts: 'hi' },
  { code: 'indonesian', label: 'Indonesian', native: 'Bahasa Indonesia', tts: 'id' },
  { code: 'italian', label: 'Italian', native: 'Italiano', tts: 'it' },
  { code: 'japanese', label: 'Japanese', native: '日本語', tts: 'ja' },
  { code: 'khmer', label: 'Khmer', native: 'ខ្មែរ', tts: 'km' },
  { code: 'korean', label: 'Korean', native: '한국어', tts: 'ko' },
  { code: 'lao', label: 'Lao', native: 'ລາວ', tts: 'lo' },
  { code: 'malay', label: 'Malay', native: 'Bahasa Melayu', tts: 'ms' },
  { code: 'nepali', label: 'Nepali', native: 'नेपाली', tts: 'ne' },
  { code: 'persian', label: 'Persian', native: 'فارسی', tts: 'fa' },
  { code: 'polish', label: 'Polish', native: 'Polski', tts: 'pl' },
  { code: 'portuguese', label: 'Portuguese', native: 'Português', tts: 'pt' },
  { code: 'russian', label: 'Russian', native: 'Русский', tts: 'ru' },
  { code: 'sinhala', label: 'Sinhala', native: 'සිංහල', tts: 'si' },
  { code: 'somali', label: 'Somali', native: 'Soomaali', tts: 'so' },
  { code: 'spanish', label: 'Spanish', native: 'Español', tts: 'es' },
  { code: 'swahili', label: 'Swahili', native: 'Kiswahili', tts: 'sw' },
  { code: 'tamil', label: 'Tamil', native: 'தமிழ்', tts: 'ta' },
  { code: 'thai', label: 'Thai', native: 'ไทย', tts: 'th' },
  { code: 'turkish', label: 'Turkish', native: 'Türkçe', tts: 'tr' },
  { code: 'ukrainian', label: 'Ukrainian', native: 'Українська', tts: 'uk' },
  { code: 'urdu', label: 'Urdu', native: 'اردو', tts: 'ur' },
  { code: 'vietnamese', label: 'Vietnamese', native: 'Tiếng Việt', tts: 'vi' },
  { code: 'yoruba', label: 'Yoruba', native: 'Yorùbá', tts: 'yo' },
];

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
