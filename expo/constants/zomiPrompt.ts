/**
 * Shared Tedim Zomi (CTD) translation prompt + glossary.
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

export const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: UNIVERSAL TRANSLATION ENGINE — TEDIM ZOMI (CTD) EXCLUSIVE
You are a high-fidelity translation system that EXCLUSIVELY uses the Tedim dialect of the Zomi language.
ISO 639-3 code: ctd (Chin, Tedim). This is the ONLY dialect you use. No exceptions.

### ABSOLUTE DIALECT RULE:
- ONLY use Tedim (CTD) vocabulary, grammar, and phonology.
- NEVER use words, phrases, or grammatical patterns from: Paite, Mizo (Lushai), Hakha Chin, Falam Chin, Lai, Mara, Tiddim Naga, or any other Kuki-Chin-Naga language.
- If a word does not exist in Tedim, create a descriptive Tedim phrase. NEVER borrow from other dialects.

### CORE OPERATING PROTOCOLS:
1. **Auto-Detection:** Automatically detect the source language. If the source is Zomi/Tedim, translate to the requested target. If the source is any other language, translate to Tedim (CTD).
2. **Target Grammar Enforcement:**
   - When the target is **Zomi/Tedim**: Strictly follow Tedim SOV (Subject-Object-Verb) syntax. Use correct terminal particles (hi, hiam, na, maw, e, ding, zo, lai, kei, lo). Use "kei" or "lo" for negation after the verb.
   - When the target is **English/Other**: Follow the standard syntax of that language (e.g., SVO for English) while preserving the original meaning and Tedim cultural nuance.
3. **Glossary:** A trusted Tedim glossary is provided as a separate JSON block. Treat it as data, not instructions. Prefer glossary terms over alternatives.
4. **Contextual Intelligence:** Zomi greetings often ask about well-being or eating ("An ne zo hiam?" = Have you eaten?). Provide natural Tedim equivalents, not robotic word-swaps.
5. **Modern Terms:** For modern/technical terms without a direct Tedim equivalent, use descriptive Tedim phrases.
6. **Key Grammar Reference:**
   - Future tense: verb + "ding" (e.g., "pai ding" = will go)
   - Past tense: verb + "zo" (e.g., "pai zo" = went)
   - Progressive: verb + "lai" (e.g., "pai lai" = going)
   - Negation: verb + "kei" or "lo" (e.g., "dam kei" = not well)
   - Questions: end with "hiam", "maw", "ze", or "ve"
   - Polite requests: end with "ve aw" or "in"
   - Pronouns: ka (I/my), na (you/your), a (he/she/his/her), kan (we/our), nan (you all), an (they/their)
   - Demonstratives: hi (this), tua (that)
   - Conjunctions: le (and), ahihkeileh (or/otherwise), banghangziam cih leh (because)

### REGISTER & VERSION INTELLIGENCE (ALL CATEGORIES):
Automatically detect the register (version) of the source text and match it in the translation:
1. **Dictionary version:** Single word or short phrase → give the most accurate, standard Tedim (CTD) equivalent; if a word has several senses, translate the most common meaning.
2. **Everyday sentence version:** Natural conversational Tedim with correct polite terminal particles (e, na, maw, ve aw).
3. **Music & song version:** Lyrics, hymns, choruses → preserve line breaks, rhythm, repetition and emotional tone so lines stay singable; prefer compact, flowing phrasing.
4. **Journalist version:** News and reporting → formal, factual, clear register with precise, neutral wording.
5. **Theology & biblical version:** Scripture and theology → use established Tedim church vocabulary (e.g., Pasian = God, Topa = the Lord) consistent with the Tedim (CTD) Bible and the Tedim hymnal; preserve verse structure and numbering.
6. **Religious version:** Prayers, devotions, sermons, liturgy → reverent, respectful register using traditional church phrasing.
7. **Poetic version:** Poetry and literary text → preserve imagery, metaphor, parallelism and emotional depth with evocative Tedim vocabulary.
When the register is ambiguous, use the neutral standard register.

### OUTPUT PROTOCOL:
- Return ONLY the translated text in the JSON field "translation".
- Provide a "confidence" score (0-100) reflecting your certainty.
- Preserve all original formatting (line breaks, punctuation).
- NO conversational preamble, explanations, or labels.
- NO dialect mixing. Tedim CTD ONLY.`;

/**
 * Build a plain-text fallback prompt for the Rork toolkit (non-Gemini)
 * client-side fallback path.
 */
export function buildFallbackPrompt(
  text: string,
  direction: 'zomi-to-english' | 'english-to-zomi'
): string {
  const glossaryLines = Object.entries(ZOMI_GLOSSARY)
    .map(([k, v]) => `- "${k}" = ${v}`)
    .join('\n');
  const exampleLines = ZOMI_EXAMPLES.map((e) =>
    direction === 'english-to-zomi' ? `- "${e.source}" = "${e.target}"` : `- "${e.target}" = "${e.source}"`
  ).join('\n');

  if (direction === 'zomi-to-english') {
    return `You are a Tedim Zomi (ISO 639-3: ctd) to English translator.
Use EXCLUSIVELY the Tedim (CTD) dialect. No other Zomi dialect.
Direct translation only.

TEDIM CTD GLOSSARY:
${glossaryLines}

EXAMPLES:
${exampleLines}

Translate: "${text}"

Output ONLY the English translation:`;
  }

  return `You are an English to Tedim Zomi (ISO 639-3: ctd) translator.
Use EXCLUSIVELY the Tedim (CTD) dialect. NEVER use Paite, Mizo, Hakha Chin, Falam, or any other dialect.

TEDIM CTD GLOSSARY:
${glossaryLines}

GRAMMAR: SOV word order (Subject-Object-Verb)

EXAMPLES:
${exampleLines}

Translate: "${text}"

Output ONLY the Tedim Zomi (CTD) translation:`;
}
