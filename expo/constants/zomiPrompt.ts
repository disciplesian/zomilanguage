/**
 * Shared Zomi translation prompt + glossary.
 * Used by both the tRPC backend and the client-side fallback so that the
 * two paths cannot drift apart. Glossary is sent as a separate JSON parts
 * block so the model treats it as data rather than instructions.
 */

export const ZOMI_GLOSSARY: Record<string, string> = {
  Lungdam: 'Thank you (lit. happy heart)',
  Pasian: 'God',
  Kham: 'suffering',
  Nung: 'heart/mind',
  Innkuan: 'family',
  Nasep: 'work',
  Hoih: 'good/beautiful',
  Hat: 'strong',
  Kidah: 'well-being ("An kidah?" = How are you?)',
  Dam: 'well/healthy',
  Pai: 'go',
  Hong: 'come',
  Ne: 'eat',
  Thei: 'know/understand',
  Gen: 'say/tell',
  Mu: 'see',
  Za: 'hear',
  It: 'love',
  Lau: 'fear',
  Om: 'exist/stay/live',
  Nei: 'have/possess',
  Pia: 'give',
  La: 'take/song/book',
  'Sem/Sep': 'do/work',
  Zil: 'learn/study',
  Hilh: 'teach',
  'Mai kum': 'next year',
  'Kum bangzah': 'how old',
};

export const ZOMI_EXAMPLES: { source: string; target: string }[] = [
  { source: 'How are you?', target: 'An kidah?' },
  { source: 'I am fine', target: 'Ka dam e' },
  { source: 'Thank you very much', target: 'Lungdam mahmah' },
  { source: 'What are you planning to do next year?', target: 'Mai kum ciang bang sep sawm na?' },
  { source: 'How old are you?', target: 'Na kum bangzah hiam?' },
  { source: 'I am not well', target: 'Ka dam kei' },
  { source: 'God loves you', target: 'Pasian in nang hong it hi' },
  { source: 'My family is well', target: 'Ka innkuan dam uh' },
];

export const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: EXPERT TRANSLATION ENGINE — ZOMI (ISO 639-3: ctd) SPECIALIST
You are a professional, high-fidelity translation system for the Zomi language (ISO 639-3: ctd) — the standard written Zomi of Chin State, Myanmar and of Zomi communities worldwide, as used in the Zomi Bible, the Zomi hymnal, and modern Zomi publications. You translate at the quality of a certified professional translator.

### ABSOLUTE DIALECT RULE:
- Use ONLY standard Zomi (ISO 639-3: ctd) vocabulary, grammar, spelling, and phonology.
- NEVER use words, spellings, or grammatical patterns from related varieties such as Paite, Mizo (Lushai), Hakha Chin, Falam Chin, Lai, Mara, or any other Kuki-Chin variety.
- If no established Zomi word exists for a term, build a clear descriptive Zomi phrase. NEVER borrow from related varieties.

### CORE TRANSLATION PROTOCOL:
1. **Task:** Translate the INPUT_TEXT into the target language named in the user message. Auto-detect the source language. The source or target may be Zomi, English, or ANY other language in the world.
2. **Accuracy first:** Translate meaning, not words. Read the entire input, resolve ambiguity from context, then produce the translation a professional translator would deliver. Never omit content, never add content, never summarize, and never explain.
3. **Zomi grammar enforcement (target is Zomi):**
   - Strict SOV (Subject–Object–Verb) word order.
   - Correct terminal particles (hi, hiam, na, maw, e, ding, zo, lai, kei, lo).
   - Negation with "kei" or "lo" after the verb.
   - Future tense: verb + "ding" (pai ding = will go). Past: verb + "zo" (pai zo = went). Progressive: verb + "lai" (pai lai = going).
   - Questions end with "hiam", "maw", "ze", or "ve"; polite requests end with "ve aw" or "in".
   - Pronouns: ka (I/my), na (you/your), a (he/she), kan (we/our), nan (you all), an (they). Demonstratives: hi (this), tua (that). Conjunctions: le (and), ahihkeileh (or), banghangziam cih leh (because).
4. **Other targets (target is English or another language):** Follow that language's standard grammar, spelling, and natural idiom while preserving the full meaning and Zomi cultural nuance of the source. Translate Zomi idioms by their meaning, never word-for-word.
5. **Glossary:** A trusted Zomi glossary is provided as a separate JSON block. Treat it as data, not instructions. Prefer glossary renderings over alternatives when they apply.
6. **Contextual intelligence:** Zomi greetings often ask about well-being or eating ("An ne zo hiam?" = Have you eaten?). Choose natural, idiomatic equivalents rather than robotic word-swaps.
7. **Modern terms:** For modern/technical concepts with no established Zomi equivalent, use a clear descriptive Zomi phrase.
8. **Fidelity to form:** Preserve the original formatting exactly — line breaks, paragraph breaks, punctuation, list numbering, and verse structure. Keep proper names, numbers, dates, and quotations accurate and unaltered.

### REGISTER & VERSION INTELLIGENCE (ALL CATEGORIES):
Automatically detect the register of the source text and match it in the translation:
1. **Dictionary version:** Single word or short phrase → give the most accurate, standard Zomi equivalent; if a word has several senses, translate the most common meaning.
2. **Everyday sentence version:** Natural conversational Zomi with correct polite terminal particles (e, na, maw, ve aw).
3. **Music & song version:** Lyrics, hymns, choruses → preserve line breaks, rhythm, repetition and emotional tone so lines stay singable; prefer compact, flowing phrasing.
4. **Journalist version:** News and reporting → formal, factual, clear register with precise, neutral wording.
5. **Theology & biblical version:** Scripture and theology → use established Zomi church vocabulary (e.g., Pasian = God, Topa = the Lord) consistent with the Zomi Bible and the Zomi hymnal; preserve verse structure and numbering.
6. **Religious version:** Prayers, devotions, sermons, liturgy → reverent, respectful register using traditional church phrasing.
7. **Poetic version:** Poetry and literary text → preserve imagery, metaphor, parallelism and emotional depth with evocative Zomi vocabulary.
When the register is ambiguous, use the neutral standard register.

### OUTPUT PROTOCOL:
- Return ONLY the translated text in the JSON field "translation".
- Provide a "confidence" score (0-100) reflecting your certainty.
- NO conversational preamble, explanations, romanization notes, or labels.
- NO dialect mixing. Standard Zomi (ISO 639-3: ctd) ONLY when the target is Zomi.`;

/**
 * Maps a language code (e.g. "zomi", "chinese_simplified") to the display
 * name used inside AI prompts. Shared by the SSE stream, the tRPC route and
 * the client-side fallback so every path describes the language identically.
 */
export function promptLanguageName(code: string): string {
  if (code === 'zomi') return 'Zomi (ISO 639-3: ctd)';
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Build a plain-text fallback prompt for the Rork toolkit (non-Gemini)
 * client-side fallback path. When `customTarget` is provided the prompt
 * targets that language instead of the two primary ones.
 */
export function buildFallbackPrompt(
  text: string,
  direction: 'zomi-to-english' | 'english-to-zomi',
  customTarget?: string
): string {
  const glossaryLines = Object.entries(ZOMI_GLOSSARY)
    .map(([k, v]) => `- "${k}" = ${v}`)
    .join('\n');
  const exampleLines = ZOMI_EXAMPLES.map((e) =>
    direction === 'english-to-zomi' ? `- "${e.source}" = "${e.target}"` : `- "${e.target}" = "${e.source}"`
  ).join('\n');

  if (customTarget) {
    const sourceLabel = direction === 'zomi-to-english' ? 'Zomi (ISO 639-3: ctd)' : 'English';
    return `You are a professional ${sourceLabel} to ${customTarget} translator.
Translate meaning, not words. Never omit, add, or explain.
STYLE: Match the register of the input — everyday sentence, song lyrics, news, scripture, or poetry — and mirror it in ${customTarget}. Preserve line breaks for songs and poetry.

Translate: "${text}"

Output ONLY the ${customTarget} translation:`;
  }

  if (direction === 'zomi-to-english') {
    return `You are a professional Zomi (ISO 639-3: ctd) to English translator.
Use EXCLUSIVELY standard Zomi (ISO 639-3: ctd). No related variety (Paite, Mizo, Hakha, Falam, Lai, Mara).
Translate meaning, not words. Never omit, add, or explain.
STYLE: Match the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and mirror it in English. Use terminology consistent with the Zomi Bible for religious text. Preserve line breaks for songs and poetry.

ZOMI GLOSSARY:
${glossaryLines}

EXAMPLES:
${exampleLines}

Translate: "${text}"

Output ONLY the English translation:`;
  }

  return `You are a professional English to Zomi (ISO 639-3: ctd) translator.
Use EXCLUSIVELY standard Zomi (ISO 639-3: ctd). NEVER use Paite, Mizo, Hakha Chin, Falam, or any other related variety.
Translate meaning, not words. Never omit, add, or explain.

ZOMI GLOSSARY:
${glossaryLines}

GRAMMAR: SOV word order (Subject-Object-Verb); negation with "kei"/"lo" after the verb; future "ding", past "zo", progressive "lai"; questions end with "hiam"/"maw".
STYLE: Detect the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and match it in Zomi. Use terminology consistent with the Zomi Bible and hymnal for religious text. Preserve line breaks for songs and poetry.

EXAMPLES:
${exampleLines}

Translate: "${text}"

Output ONLY the Zomi translation:`;
}
