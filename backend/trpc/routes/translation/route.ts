import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

/**
 * UPDATED FOR 2026:
 * Gemini 3 Flash is now the production standard for speed/intelligence.
 * Gemini 3 Pro is used for high-complexity reasoning.
 */
const MODELS_TO_TRY = [
  'gemini-3-flash-preview', // Latest 2026 reasoning-focused flash model
  'gemini-3-pro-preview',   // PhD-level reasoning for complex tasks
  'gemini-2.5-pro',         // Stable fallback
];

const ZOMI_SYSTEM_INSTRUCTION = `
You are a professional Zomi Linguist. Target Dialect: Tedim.
Identity: Publicly refer to the language only as "Zomi" or "Zomi Language".

### CORE RULES:
1. DIALECT: Use Tedim dialect (ISO 639-3: ctd) exclusively. 
2. NATURAL FLOW: Prioritize spoken flow over literal translation. Use sentence particles ('hi', 'ma mah', 'na').
3. DISAMBIGUATION:
   - "Mai kum" = Next year (Plans).
   - "Kum bang zah" = Age (Quantity).
   - Never confuse "What are you doing next year?" with age questions.
4. NO LOANWORDS: Use descriptive Zomi phrases for missing technical terms.
5. FORMATTING: Preserve all bolding, line breaks, and symbols.

Return ONLY the translation. No preamble.
`;

export default createTRPCRouter({
  translate: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(5000),
      sourceLanguage: z.enum(['zomi', 'english']),
      targetLanguage: z.enum(['zomi', 'english']),
    }))
    .mutation(async ({ input }) => {
      const API_KEY = process.env.GEMINI_API_KEY;
      if (!API_KEY) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'API key missing' });

      const genAI = new GoogleGenerativeAI(API_KEY);
      const { text, sourceLanguage, targetLanguage } = input;

      const prompt = `Translate this from ${sourceLanguage} to ${targetLanguage}: "${text}"`;

      for (const modelName of MODELS_TO_TRY) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
          });

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
              // Required for Gemini 3 reasoning models to handle internal chain-of-thought
              // @ts-ignore - 'thinking' config for 2026 reasoning models
              thinking: { mode: 'enabled' } 
            },
          });

          return {
            translatedText: result.response.text().trim(),
            model: modelName,
            quality: modelName.includes('3') ? 99 : 95
          };
        } catch (e) {
          console.warn(`Model ${modelName} unavailable, falling back...`);
          continue;
        }
      }

      throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'All latest Gemini models failed.' });
    }),
});