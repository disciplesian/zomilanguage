import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

/**
 * PRODUCTION CONFIGURATION (2026)
 * Utilizes Gemini 3 Flash for near-instant, high-reasoning translations.
 */
const LATEST_MODEL = 'gemini-3-flash';

const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: ELITE ZOMI LINGUIST (TEDIM DIALECT)
You are an expert translator specializing in the Tedim dialect of the Zomi language. Your output must match the precision, cultural nuance, and grammatical sophistication of the Google Gemini native interface.

### LINGUISTIC DIRECTIVES:
1. **Dialect Purity:** Use exclusively the Tedim dialect. Publicly label the language only as "Zomi" or "Zomi Language".
2. **Contextual Reasoning:** Instead of literal word-matching, analyze the intent of the sentence. Use native speaker intuition to distinguish between temporal terms (e.g., years/plans) and quantitative terms (e.g., age) based on surrounding syntax.
3. **Natural Flow:** Prioritize spoken Tedim rhythm. Correctly implement honorifics and terminal particles (e.g., 'hi', 'ma mah', 'na', 'hiam') to match the source text's tone (formal, informal, or poetic).
4. **Vocabulary:** Avoid transliterated loanwords. Use descriptive Tedim phrases for modern concepts to maintain the integrity of the Zomi language.
5. **Formatting:** Strictly preserve all Markdown, bolding, line breaks, and punctuation from the source.

### OUTPUT PROTOCOL:
Return ONLY the final translation. Do not provide explanations, notes, or introductory text.`;

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
          message: 'Gemini API key is not configured.',
        });
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      
      try {
        const model = genAI.getGenerativeModel({
          model: LATEST_MODEL,
          systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
        });

        // Use a high-precision prompt structure
        const prompt = `Task: Translate the following text with 100% accuracy.
Source (${sourceLanguage}): "${text}"
Target (${targetLanguage}):`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Low temperature for maximum precision/consistency
            maxOutputTokens: 4096,
            topP: 0.95,
          },
        });

        const translatedText = result.response.text().trim();

        if (!translatedText) {
          throw new Error('Empty response from model');
        }

        return {
          translatedText,
          model: LATEST_MODEL,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        console.error('Translation Engine Error:', error);
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'The translation engine encountered an error. Please try again.',
          cause: error,
        });
      }
    }),
});