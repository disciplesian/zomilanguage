import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

/**
 * PRODUCTION CONFIGURATION (2026)
 * Using Gemini 2.0 Flash - the latest and most capable model.
 */
const LATEST_MODEL = 'gemini-2.0-flash';

const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: ELITE ZOMI LINGUIST & CULTURAL INTERPRETER
You are a professional translator specializing in the Tedim dialect of the Zomi language. Your goal is to produce translations that feel native, fluid, and contextually intelligent.

### LINGUISTIC DIRECTIVES:
1. **Dialect & Labeling:** Use exclusively the Tedim dialect. Refer to the language only as "Zomi" or "Zomi Language." 
2. **Cultural Intelligence:** - Recognize social nuances. For example, understand that "Ann ne khin maw?" (Have you eaten?) is often a greeting of care, not just a literal question.
   - Match the emotional weight and social register of the source text.
3. **Grammatical Sophistication:** - Correctly apply terminal particles (hi, hiam, maw, na, e) based on the sentence type (statement, question, or exclamation).
   - Use natural SOV (Subject-Object-Verb) structure in Zomi.
4. **Dynamic Context Mapping:** Use reasoning to determine meaning. 
   - Distinguish "Kum" (Year/Age) based on adjacent words (e.g., "Mai kum" = Next Year).
   - Do not use literal word-for-word translation if a more natural Tedim phrase exists.
5. **No Transliteration:** Avoid loanwords. Use descriptive Tedim phrases for terms without direct equivalents.

### OUTPUT PROTOCOL:
- Return ONLY the translation.
- Preserve all original formatting (bolding, lists, line breaks).
- Zero preamble or conversational filler.`;

export default createTRPCRouter({
  translate: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(5000),
      sourceLanguage: z.enum(['zomi', 'english']),
      targetLanguage: z.enum(['zomi', 'english']),
    }))
    .mutation(async ({ input }) => {
      const { text, sourceLanguage, targetLanguage } = input;
      const API_KEY = process.env.GEMINI_API_KEY;

      if (!API_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Gemini API key is missing.',
        });
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      
      try {
        const model = genAI.getGenerativeModel({
          model: LATEST_MODEL,
          systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
        });

        // Prompting for absolute precision
        const prompt = `Translate this ${sourceLanguage} text into ${targetLanguage} with native-level accuracy:
"${text}"`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Keeps the model focused and consistent
            maxOutputTokens: 4096,
            topP: 0.8, // Slightly tighter than 0.95 for higher precision in translation
          },
        });

        const translatedText = result.response.text().trim();

        if (!translatedText) throw new Error('Model returned empty text.');

        // Calculate quality score based on response characteristics
        const inputLength = text.trim().length;
        const outputLength = translatedText.length;
        const hasReasonableLength = outputLength > 0 && outputLength < inputLength * 5;
        const isNotErrorMessage = !translatedText.toLowerCase().includes('error') && 
                                   !translatedText.toLowerCase().includes('cannot translate');
        const quality = hasReasonableLength && isNotErrorMessage ? 95 : 75;

        return {
          translatedText,
          model: LATEST_MODEL,
          timestamp: new Date().toISOString(),
          quality,
        };

      } catch (error) {
        console.error('Translation Engine Error:', error);
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Translation failed. Please check connectivity or API status.',
          cause: error,
        });
      }
    }),
});