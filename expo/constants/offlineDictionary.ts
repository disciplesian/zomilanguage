/**
 * Bundled offline Zomi ⇄ English vocabulary.
 *
 * Works with no connection at all: when every network path fails, the
 * translator falls back to this dictionary so common words and phrases still
 * translate offline. Entries are grounded in the app's trusted glossary,
 * example translations, and documented Zomi grammar (see zomiPrompt.ts) plus
 * core standard vocabulary — accuracy over quantity.
 */

export type OfflinePos =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'pronoun'
  | 'particle'
  | 'phrase'
  | 'number'
  | 'question';

export interface OfflineEntry {
  /** Standard Zomi (ISO 639-3: ctd) rendering. */
  zomi: string;
  /** English meaning(s); variants separated by ";". */
  english: string;
  pos?: OfflinePos;
  /** Usage note shown alongside offline results. */
  note?: string;
}

export const OFFLINE_DICTIONARY: OfflineEntry[] = [
  // ── Core words (from the app's trusted glossary) ────────────────────────
  { zomi: 'Lungdam', english: 'Thank you', pos: 'phrase', note: 'lit. happy heart' },
  { zomi: 'Pasian', english: 'God', pos: 'noun' },
  { zomi: 'Topa', english: 'the Lord', pos: 'noun' },
  { zomi: 'Kham', english: 'suffering', pos: 'noun' },
  { zomi: 'Nung', english: 'heart; mind', pos: 'noun' },
  { zomi: 'Innkuan', english: 'family', pos: 'noun' },
  { zomi: 'Nasep', english: 'work; job', pos: 'noun' },
  { zomi: 'Hoih', english: 'good; beautiful', pos: 'adjective' },
  { zomi: 'Hat', english: 'strong', pos: 'adjective' },
  { zomi: 'Kidah', english: 'well-being', pos: 'noun', note: '"An kidah?" = How are you?' },
  { zomi: 'Dam', english: 'well; healthy', pos: 'adjective' },
  { zomi: 'Pai', english: 'go', pos: 'verb' },
  { zomi: 'Hong', english: 'come', pos: 'verb', note: 'also marks motion toward the speaker' },
  { zomi: 'Ne', english: 'eat', pos: 'verb' },
  { zomi: 'Thei', english: 'know; understand', pos: 'verb' },
  { zomi: 'Gen', english: 'say; tell', pos: 'verb' },
  { zomi: 'Mu', english: 'see', pos: 'verb' },
  { zomi: 'Za', english: 'hear', pos: 'verb' },
  { zomi: 'It', english: 'love', pos: 'verb' },
  { zomi: 'Lau', english: 'fear; be afraid', pos: 'verb' },
  { zomi: 'Om', english: 'exist; stay; live', pos: 'verb' },
  { zomi: 'Nei', english: 'have; possess', pos: 'verb' },
  { zomi: 'Pia', english: 'give', pos: 'verb' },
  { zomi: 'La', english: 'take; song; book', pos: 'verb' },
  { zomi: 'Sep', english: 'do; work', pos: 'verb' },
  { zomi: 'Zil', english: 'learn; study', pos: 'verb' },
  { zomi: 'Hilh', english: 'teach', pos: 'verb' },
  { zomi: 'Tui', english: 'water', pos: 'noun' },
  { zomi: 'Pa', english: 'father', pos: 'noun' },
  { zomi: 'Nu', english: 'mother', pos: 'noun' },
  { zomi: 'Mipa', english: 'man; male', pos: 'noun' },
  { zomi: 'Nupui', english: 'woman; female', pos: 'noun' },

  // ── Pronouns & function words (documented in the Zomi grammar) ──────────
  { zomi: 'ka', english: 'I; my', pos: 'pronoun' },
  { zomi: 'na', english: 'you; your', pos: 'pronoun' },
  { zomi: 'a', english: 'he; she; it', pos: 'pronoun' },
  { zomi: 'kan', english: 'we; our', pos: 'pronoun' },
  { zomi: 'nan', english: 'you all; your (plural)', pos: 'pronoun' },
  { zomi: 'an', english: 'they; their', pos: 'pronoun' },
  { zomi: 'hi', english: 'this', pos: 'pronoun' },
  { zomi: 'tua', english: 'that', pos: 'pronoun' },
  { zomi: 'le', english: 'and', pos: 'particle' },
  { zomi: 'ahihkeileh', english: 'or', pos: 'particle' },
  { zomi: 'banghangziam cih leh', english: 'because', pos: 'particle' },
  { zomi: 'kei', english: 'not', pos: 'particle', note: 'negation after the verb ("Ka dam kei" = I am not well)' },
  { zomi: 'lo', english: 'not', pos: 'particle', note: 'negation after the verb' },
  { zomi: 'ding', english: 'will; going to', pos: 'particle', note: 'future marker after the verb ("pai ding" = will go)' },
  { zomi: 'zo', english: 'already', pos: 'particle', note: 'past/completive marker after the verb ("pai zo" = went)' },
  { zomi: 'lai', english: 'currently', pos: 'particle', note: 'progressive marker ("pai lai" = is going)' },
  { zomi: 'hiam', english: '(question marker)', pos: 'question', note: 'turns a statement into a yes/no question' },
  { zomi: 'maw', english: '(question marker)', pos: 'question' },
  { zomi: 've aw', english: 'please', pos: 'particle', note: 'polite request ending' },
  { zomi: 'e', english: '(statement marker)', pos: 'particle', note: 'plain statement ending ("Ka dam e" = I am fine)' },
  { zomi: 'in', english: '(agent marker)', pos: 'particle', note: 'marks the doer of an action ("Pasian in" = by God)' },
  { zomi: 'uh', english: '(they/plural marker)', pos: 'particle', note: '"Ka innkuan dam uh" = My family is well' },
  { zomi: 'bangzah', english: 'how much; how many', pos: 'question' },
  { zomi: 'bang', english: 'what; which', pos: 'question' },
  { zomi: 'bang hangziam', english: 'why', pos: 'question' },
  { zomi: 'khiak', english: 'where', pos: 'question' },
  { zomi: 'kum', english: 'year', pos: 'noun' },
  { zomi: 'ni', english: 'day; sun', pos: 'noun' },
  { zomi: 'kha', english: 'month; moon', pos: 'noun' },
  { zomi: 'tu', english: 'who', pos: 'question' },
  { zomi: 'bang ciangin', english: 'how; in what way', pos: 'question' },
  { zomi: 'tua ciangin', english: 'then; at that time', pos: 'particle' },
  { zomi: 'hih ciangin', english: 'now; at this time', pos: 'particle' },

  // ── Numbers (standard Zomi numerals) ────────────────────────────────────
  { zomi: 'khat', english: 'one', pos: 'number' },
  { zomi: 'nih', english: 'two', pos: 'number' },
  { zomi: 'thum', english: 'three', pos: 'number' },
  { zomi: 'li', english: 'four', pos: 'number' },
  { zomi: 'ngaa', english: 'five', pos: 'number' },
  { zomi: 'ruk', english: 'six', pos: 'number' },
  { zomi: 'sari', english: 'seven', pos: 'number' },
  { zomi: 'riat', english: 'eight', pos: 'number' },
  { zomi: 'gua', english: 'nine', pos: 'number' },

  // ── Common phrases (from the app's trusted examples) ────────────────────
  { zomi: 'An kidah?', english: 'How are you?', pos: 'phrase' },
  { zomi: 'Ka dam e', english: 'I am fine', pos: 'phrase' },
  { zomi: 'Ka dam kei', english: 'I am not well', pos: 'phrase' },
  { zomi: 'Lungdam mahmah', english: 'Thank you very much', pos: 'phrase' },
  { zomi: 'Pasian in nang hong it hi', english: 'God loves you', pos: 'phrase' },
  { zomi: 'Ka innkuan dam uh', english: 'My family is well', pos: 'phrase' },
  { zomi: 'Na kum bangzah hiam?', english: 'How old are you?', pos: 'phrase' },
  { zomi: 'An ne zo hiam?', english: 'Have you eaten?', pos: 'phrase', note: 'common Zomi greeting' },
  { zomi: 'Mai kum', english: 'next year', pos: 'phrase' },
  { zomi: 'Mai kum ciang bang sep sawm na?', english: 'What are you planning to do next year?', pos: 'phrase' },
  { zomi: 'Pasian in kipilhna pia hi', english: 'God bless you', pos: 'phrase' },
  { zomi: 'Tuapia om lo', english: 'No problem', pos: 'phrase' },
];

/** Number of bundled entries — surfaced in the offline notice. */
export const OFFLINE_ENTRY_COUNT: number = OFFLINE_DICTIONARY.length;

export interface OfflineLookupResult {
  /** The matched dictionary entry. */
  entry: OfflineEntry;
  /** The rendering in the requested target language. */
  translation: string;
  /** True when the match came from the user's personal glossary. */
  fromUserGlossary: boolean;
}

/** Normalize input for matching: trim, lowercase, drop trailing punctuation. */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Look up common vocabulary offline. Only serves the Zomi ⇄ English pair
 * (custom target languages need the AI backend). The user's personal
 * glossary terms (zomi → english) are searched alongside the bundled
 * dictionary so saved vocabulary also works offline.
 */
export function offlineLookup(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  userGlossary?: Record<string, string>
): OfflineLookupResult | null {
  const pairIsZomiEnglish =
    (sourceLanguage === 'zomi' && targetLanguage === 'english') ||
    (sourceLanguage === 'english' && targetLanguage === 'zomi');
  if (!pairIsZomiEnglish) return null;

  const q = normalize(text);
  if (!q) return null;

  if (sourceLanguage === 'zomi') {
    // Zomi → English: check the user's saved glossary first, then bundled.
    if (userGlossary) {
      for (const [term, meaning] of Object.entries(userGlossary)) {
        if (normalize(term) === q && meaning.trim()) {
          return { entry: { zomi: term, english: meaning }, translation: meaning.trim(), fromUserGlossary: true };
        }
      }
    }
    const entry = OFFLINE_DICTIONARY.find((e) => normalize(e.zomi) === q);
    if (entry) return { entry, translation: entry.english, fromUserGlossary: false };
    return null;
  }

  // English → Zomi: match any English variant ("heart; mind").
  const entry = OFFLINE_DICTIONARY.find((e) =>
    e.english.split(';').some((variant) => normalize(variant) === q)
  );
  if (entry) return { entry, translation: entry.zomi, fromUserGlossary: false };
  if (userGlossary) {
    for (const [term, meaning] of Object.entries(userGlossary)) {
      if (normalize(meaning) === q && term.trim()) {
        return { entry: { zomi: term, english: meaning }, translation: term.trim(), fromUserGlossary: true };
      }
    }
  }
  return null;
}
