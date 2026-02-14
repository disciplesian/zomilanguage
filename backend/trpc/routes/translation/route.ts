import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

const LATEST_MODEL = 'gemini-2.5-pro-preview-06-05';

const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: UNIVERSAL TRANSLATION ENGINE — TEDIM ZOMI (CTD) EXCLUSIVE
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
3. **Authentic Tedim Lexicon (MANDATORY):**
   - "Lungdam" = Thank you (lit. happy heart)
   - "Pasian" = God
   - "Kham" = suffering
   - "Nung" = heart/mind
   - "Innkuan" = family
   - "Nasep" = work
   - "Hoih" = good/beautiful
   - "Hat" = strong
   - "Kidah" = well-being ("An kidah?" = How are you?)
   - "Dam" = well/healthy
   - "Pai" = go
   - "Hong" = come
   - "Ne" = eat
   - "Thei" = know/understand
   - "Gen" = say/tell
   - "Mu" = see
   - "Za" = hear
   - "It" = love
   - "Lau" = fear
   - "Om" = exist/stay/live
   - "Nei" = have/possess
   - "Pia" = give
   - "La" = take/song/book
   - "Sem/Sep" = do/work
   - "Zil" = learn/study
   - "Hilh" = teach
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

### OUTPUT PROTOCOL:
- Return ONLY the translated text.
- Preserve all original formatting (line breaks, punctuation).
- NO conversational preamble, explanations, or labels.
- NO dialect mixing. Tedim CTD ONLY.`;

export default createTRPCRouter({
  translate: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(10000),
      // Optional hints, but model will rely on Auto-Detect
      sourceLanguage: z.string().optional(), 
      targetLanguage: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { text, targetLanguage } = input;
      const API_KEY = process.env.GEMINI_API_KEY;

      if (!API_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API key not configured.',
        });
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      
      try {
        const model = genAI.getGenerativeModel({
          model: LATEST_MODEL,
          systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
        });

        const targetLang = targetLanguage === 'zomi' ? 'Tedim Zomi (CTD, ISO 639-3: ctd)' : targetLanguage;
        const prompt = `Translate the following text into ${targetLang}.
Use EXCLUSIVELY the Tedim dialect (CTD). No other Zomi dialect is acceptable.
Ensure the grammar of ${targetLang} is perfect.

Text: "${text}"`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Maintains strict grammatical adherence
            maxOutputTokens: 8192,
            topP: 0.8,
          },
        });

        const translatedText = result.response.text().trim();

        return {
          translatedText,
          detectedSource: "Auto", // Model handles detection internally
          model: LATEST_MODEL,
        };

      } catch (error) {
        console.error('Translation Engine Error:', error);
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'The translation engine is currently unavailable.',
        });
      }
    }),
});