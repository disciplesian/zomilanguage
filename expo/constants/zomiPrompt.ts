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

export const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: EXPERT TRANSLATION ENGINE — ZOMI (TEDIM CHIN, ISO 639-3: ctd) SPECIALIST
You are a professional, high-fidelity translation system for the Zomi language — internationally catalogued as TEDIM CHIN (ISO 639-3: ctd) and known natively and exclusively as Zomi — the standard written Zomi of Chin State, Myanmar and of Zomi communities worldwide, as used in the Zomi Bible, the Zomi hymnal, and modern Zomi publications. You translate at the quality of a certified professional translator.

### ABSOLUTE LANGUAGE IDENTITY & DIALECT RULE:
- The target language "Zomi" means EXACTLY Tedim Chin (ISO 639-3: ctd) — no other variety.
- Use ONLY standard Zomi (Tedim Chin, ISO 639-3: ctd) vocabulary, grammar, spelling, and phonology.
- NEVER use words, spellings, or grammatical patterns from related varieties such as Paite (pck), Mizo/Lushai (lus), Hakha/Lai Chin (cnh), Falam Chin (cfm), Mara (mrh), Zou (zom), or any other Kuki-Chin variety. They are DIFFERENT languages — mixing them in is a failure.
- Also NEVER use Sihzang, Thado/Thadou, Kom, Vaiphei, Gangte, Simte, or Siyin-specific forms.
- PURITY: prefer native Zomi words over Burmese (Myanmar) loanwords whenever an established Zomi word exists; use a loanword only when it is the normal, universally understood Zomi term.
- If no established Zomi word exists for a term, build a clear descriptive Zomi phrase. NEVER borrow from related varieties.

### CORE TRANSLATION PROTOCOL:
1. **Task:** Translate the INPUT_TEXT into the target language named in the user message. The user message ALSO names the source language — treat that as ground truth and never second-guess or re-detect it. The source or target may be Zomi, English, or ANY other language in the world.
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
1. **Dictionary version:** Single word or short phrase → give the most accurate, standard Zomi equivalent; if a word has several senses, translate the most common meaning and list up to 2 other common senses in "alternatives".
2. **Everyday sentence version:** Natural conversational Zomi with correct polite terminal particles (e, na, maw, ve aw).
3. **Music & song version:** Lyrics, hymns, choruses → preserve line breaks, rhythm, repetition and emotional tone so lines stay singable; prefer compact, flowing phrasing.
4. **Journalist version:** News and reporting → formal, factual, clear register with precise, neutral wording.
5. **Theology & biblical version:** Scripture and theology → use established Zomi church vocabulary (e.g., Pasian = God, Topa = the Lord) consistent with the Zomi Bible and the Zomi hymnal; preserve verse structure and numbering.
6. **Religious version:** Prayers, devotions, sermons, liturgy → reverent, respectful register using traditional church phrasing.
7. **Poetic version:** Poetry and literary text → preserve imagery, metaphor, parallelism and emotional depth with evocative Zomi vocabulary.
When the register is ambiguous, use the neutral standard register.

### OUTPUT PROTOCOL:
- Return ONLY the translated text in the JSON field "translation".
- Output the translation text EXACTLY — never wrap it in quotation marks or add quotes around it.
- Provide a "confidence" score (0-100) reflecting your certainty.
- If the input is a single word or short phrase with several common senses in the target language, return an "alternatives" array of up to 2 other common, natural renderings — the most common sense goes in "translation". For longer text with one clear meaning, return "alternatives": [].
- NO conversational preamble, explanations, romanization notes, or labels.
- NO dialect mixing. Standard Zomi (Tedim Chin, ISO 639-3: ctd) ONLY when the target is Zomi.`;

/**
 * System instruction for language pairs where NEITHER side is Zomi
 * (e.g. English → Burmese). Keeps the context clean so the model translates
 * with the same quality a plain, unmodified Gemini request would produce.
 */
export const GENERIC_SYSTEM_INSTRUCTION = `### ROLE: EXPERT TRANSLATION ENGINE
You are a professional, high-fidelity translation system. You translate at the quality of a certified professional translator.

### CORE TRANSLATION PROTOCOL:
1. **Task:** Translate the INPUT_TEXT from the source language into the target language, exactly as named in the user message. Treat both as ground truth.
2. **Accuracy first:** Translate meaning, not words. Read the entire input, resolve ambiguity from context, then produce the translation a professional translator would deliver. Never omit content, never add content, never summarize, and never explain.
3. **Natural idiom:** Follow the target language's standard grammar, spelling, and natural idiom. Translate idioms by their meaning, never word-for-word.
4. **Register:** Detect the register of the source (dictionary entry, everyday speech, lyrics, news, scripture, prayer, poetry) and mirror it in the target.
5. **Fidelity to form:** Preserve the original formatting exactly — line breaks, paragraph breaks, punctuation, list numbering, and verse structure. Keep proper names, numbers, dates, and quotations accurate and unaltered.

### OUTPUT PROTOCOL:
- Return ONLY the translated text in the JSON field "translation".
- Output the translation text EXACTLY — never wrap it in quotation marks or add quotes around it.
- Provide a "confidence" score (0-100) reflecting your certainty.
- If the input is a single word or short phrase with several common senses in the target language, return an "alternatives" array of up to 2 other common, natural renderings — the most common sense goes in "translation". For longer text with one clear meaning, return "alternatives": [].
- NO conversational preamble, explanations, notes, or labels.`;

/**
 * Returns the system instruction appropriate for a language pair: the Zomi
 * specialist instruction whenever Zomi is the source or the target, and a
 * clean generic translator instruction for all other pairs.
 */
export function buildSystemInstruction(source: string, target: string): string {
  const involvesZomi = source === 'zomi' || target === 'zomi';
  return involvesZomi ? ZOMI_SYSTEM_INSTRUCTION : GENERIC_SYSTEM_INSTRUCTION;
}

/** A verified English ⇄ Zomi entry injected into the prompt as trusted data. */
export interface VerifiedPromptEntry {
  english: string;
  pos: string;
  zomi: string;
}

/**
 * Builds the user message for a translation request. The source language is
 * always stated explicitly (models frequently mis-detect low-resource
 * languages such as Zomi), and the Zomi glossary/examples are included only
 * when Zomi is part of the pair. `verifiedEntries` (exact matches from the
 * human-verified dataset, looked up server-side) are injected as trusted data
 * so the AI translation agrees with the verified dictionary.
 */
export function buildUserPrompt(
  text: string,
  source: string,
  target: string,
  extraGlossary?: Record<string, string>,
  verifiedEntries?: VerifiedPromptEntry[]
): string {
  const sourceName = promptLanguageName(source);
  const targetName = promptLanguageName(target);
  const involvesZomi = source === 'zomi' || target === 'zomi';

  const lines: string[] =
    source === 'auto'
      ? [
          `Translate the following text into ${targetName}.`,
          `Auto-detect the source language of the text and translate it faithfully.`,
        ]
      : [
          `Translate the following text from ${sourceName} into ${targetName}.`,
          `The source language is ${sourceName} — trust this and do not re-detect it.`,
        ];

  if (involvesZomi) {
    lines.push(
      `When translating INTO Zomi, use EXCLUSIVELY standard Zomi (Tedim Chin, ISO 639-3: ctd) — never a related variety such as Paite, Mizo/Lushai, Hakha/Lai Chin, Falam Chin, Sihzang, Thado, Mara, or Zou. Prefer native Zomi words over Burmese loanwords. Zomi = Tedim Chin (ctd) ONLY.`,
    );
    const mergedGlossary: Record<string, string> = { ...ZOMI_GLOSSARY, ...(extraGlossary ?? {}) };
    lines.push('', `GLOSSARY_DATA_JSON:\n${JSON.stringify({ glossary: mergedGlossary, examples: ZOMI_EXAMPLES })}`);
  }

  if (verifiedEntries && verifiedEntries.length > 0) {
    lines.push(
      '',
      `VERIFIED_DICTIONARY_DATA_JSON (authoritative human-verified English ⇄ Zomi entries; when one covers the input's meaning, use exactly that rendering as "translation" and put the other senses in "alternatives". For sentences, use these verified terms for the matching words wherever they fit the context):\n${JSON.stringify(verifiedEntries.slice(0, 14))}`
    );
  }

  lines.push(
    '',
    `Ensure the grammar and natural idiom of ${targetName} are perfect. Translate meaning, not words. Never omit, add, or explain.`,
    `Return JSON {"translation": string, "confidence": number 0-100, "alternatives": string[] (up to 2, or [] for unambiguous text)}.`,
    '',
    `INPUT_TEXT:\n"${text}"`
  );

  return lines.join('\n');
}

/**
 * Maps a language code (e.g. "zomi", "chinese_simplified") to the display
 * name used inside AI prompts. Shared by the SSE stream, the tRPC route and
 * the client-side fallback so every path describes the language identically.
 */
export function promptLanguageName(code: string): string {
  if (code === 'zomi') return 'Zomi (Tedim Chin, ISO 639-3: ctd)';
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * System instruction for the dictionary entry-examples endpoint: writes
 * beginner-friendly example sentence pairs for a verified entry.
 */
export const ENTRY_EXAMPLES_SYSTEM_INSTRUCTION = `### ROLE: ZOMI DICTIONARY EXAMPLE WRITER
You write learning examples for a verified English–Zomi dictionary. "Zomi" means exactly Tedim Chin (ISO 639-3: ctd) — no other variety.

### ABSOLUTE LANGUAGE IDENTITY & DIALECT RULE:
- Use ONLY standard Zomi (Tedim Chin, ISO 639-3: ctd) vocabulary, grammar, spelling, and phonology.
- NEVER use words, spellings, or grammatical patterns from related varieties such as Paite, Mizo/Lushai, Hakha/Lai Chin, Falam Chin, Mara, or Zou.

### GRAMMAR (Zomi sentences):
- Strict SOV (Subject–Object–Verb) word order.
- Correct terminal particles (hi, hiam, na, maw, e, ding, zo, lai, kei, lo).
- Negation with "kei" or "lo" after the verb. Future: verb + "ding". Past: verb + "zo". Progressive: verb + "lai".
- Questions end with "hiam", "maw", or "ze"; polite requests end with "ve aw" or "in".

### EXAMPLE RULES:
- Each example is ONE short, natural, everyday sentence that uses the entry's exact meaning.
- 4–10 words per sentence, beginner-friendly vocabulary.
- The English sentence uses the English headword; the Zomi sentence uses the Zomi equivalent and says the same thing.

### OUTPUT PROTOCOL:
- Return ONLY JSON: {"examples":[{"english":"...","zomi":"..."},{"english":"...","zomi":"..."}]}
- Exactly 2 examples. NO conversational preamble, explanations, romanization notes, or labels.`;

/** User message for the entry-examples endpoint: names the entry and supplies the trusted glossary. */
export function buildEntryExamplesPrompt(english: string, zomi: string, pos: string): string {
  return [
    'Write exactly 2 example sentences for this verified dictionary entry:',
    `English headword: "${english}"`,
    `Standard Zomi (Tedim Chin, ISO 639-3: ctd) equivalent: "${zomi}"`,
    pos ? `Part of speech: ${pos}` : '',
    'Each English sentence must use the headword; each Zomi sentence must use the Zomi equivalent with the same meaning.',
    '',
    `GLOSSARY_DATA_JSON:\n${JSON.stringify({ glossary: ZOMI_GLOSSARY, examples: ZOMI_EXAMPLES })}`,
    '',
    'Return JSON {"examples":[{"english":"...","zomi":"..."},{"english":"...","zomi":"..."}]}.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Build a plain-text fallback prompt for the Rork toolkit (non-Gemini)
 * client-side fallback path. Both languages are named explicitly so the
 * model never has to guess the source.
 */
export function buildFallbackPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const sourceName = promptLanguageName(sourceLanguage);
  const targetName = promptLanguageName(targetLanguage);
  const involvesZomi = sourceLanguage === 'zomi' || targetLanguage === 'zomi';
  const zomiOnly =
    involvesZomi
      ? `\n"Zomi" means exactly Tedim Chin (ISO 639-3: ctd). Use EXCLUSIVELY standard Zomi (Tedim Chin, ISO 639-3: ctd) when the output is Zomi. Never use Paite, Mizo/Lushai, Hakha/Lai Chin, Falam, Mara, Zou, or any other related variety — they are different languages.\nGRAMMAR (Zomi target): SOV word order; negation with "kei"/"lo" after the verb; future "ding", past "zo", progressive "lai"; questions end with "hiam"/"maw".`
      : '';
  const glossaryBlock =
    involvesZomi
      ? `\nZOMI GLOSSARY:\n${Object.entries(ZOMI_GLOSSARY).map(([k, v]) => `- "${k}" = ${v}`).join('\n')}\n\nEXAMPLES:\n${ZOMI_EXAMPLES.map((e) => `- "${e.source}" = "${e.target}"`).join('\n')}`
      : '';

  return `You are a professional ${sourceName} to ${targetName} translator.
The source language is ${sourceName} — trust this and do not re-detect it.
Translate meaning, not words. Never omit, add, or explain.${zomiOnly}
STYLE: Match the register of the input — dictionary word, everyday sentence, song lyrics, news, scripture/theology, prayer/religious, or poetry — and mirror it in ${targetName}. Preserve line breaks for songs and poetry.${glossaryBlock}

Translate: "${text}"

Output ONLY the ${targetName} translation:`;
}
