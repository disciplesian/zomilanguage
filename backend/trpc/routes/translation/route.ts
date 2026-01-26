import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

/**
 * PRODUCTION CONFIGURATION (2026)
 * Using Gemini 2.0 Flash - optimized for Zomi translation accuracy.
 */
const LATEST_MODEL = 'gemini-2.0-flash';

const ZOMI_SYSTEM_INSTRUCTION = `You are a Tedim Zomi language expert. Output ONLY the direct translation.

**CRITICAL TEDIM ZOMI VOCABULARY:**
- "Mai kum" = Next year (NOT age-related)
- "Kum bangzah" = How old (age question)
- "ciang" = yet/still/afterward
- "bang" = what
- "sep" = do/work
- "sawm" = want/plan
- "na" = you (subject marker)
- "ka" = I (subject marker)
- "hiam/maw" = question particle
- "ding" = will/future marker
- "lai" = progressive/still
- "zo" = completed/past
- "hi" = is/am/are (copula)
- "kei/lo" = negation

**SENTENCE PATTERNS:**
- "Mai kum ciang bang sep sawm na?" = What are you planning to do next year?
- "Na kum bangzah hiam?" = How old are you?
- "Bang sep sawm na?" = What do you want to do?
- "Koi ah pai ding na?" = Where will you go?

**GRAMMAR RULES:**
- SOV word order (Subject-Object-Verb)
- Question words: bang (what), koi (where), tua (who), bangzah (how many/old), banghang (why)
- Time markers come before the verb phrase

**OUTPUT:**
Return ONLY the translation. No explanations. No alternatives. Just the direct translation.`;

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

        const prompt = sourceLanguage === 'zomi' 
          ? `Translate this Tedim Zomi text to English. Direct translation only:\n"${text}"`
          : `Translate this English text to Tedim Zomi. Direct translation only:\n"${text}"`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 4096,
            topP: 0.7,
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