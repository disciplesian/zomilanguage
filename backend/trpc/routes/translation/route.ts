import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

const LATEST_MODEL = 'gemini-2.0-flash'; // Optimized for speed and linguistic reasoning

const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: UNIVERSAL TRANSLATION ENGINE (ZOMI SPECIALIST)
You are a high-fidelity translation system. You specialize in the Tedim dialect of the Zomi language but are capable of translating to and from any language.

### CORE OPERATING PROTOCOLS:
1. **Auto-Detection:** Automatically detect the source language. If the source is Zomi, use your deep knowledge of the Tedim dialect.
2. **Target Grammar Enforcement:** - When the target is **Zomi**: Strictly follow Tedim syntax (SOV order). Ensure correct honorifics and terminal particles (hi, hiam, na, maw, e).
   - When the target is **English/Other**: Follow the standard syntax of that language (e.g., SVO for English) while preserving the original intent.
3. **Identity & Dialect:** Always use the Tedim dialect for Zomi. Publicly label the language only as "Zomi" or "Zomi Language." Do not use labels like "Tedim" or "Zolai" in the output.
4. **Contextual Intelligence:** Analyze the cultural context (e.g., greetings like "Have you eaten?") to provide a natural equivalent rather than a robotic word-swap.
5. **No Transliteration:** Use descriptive phrases for modern terms that lack a direct Zomi equivalent.

### OUTPUT PROTOCOL:
- Return ONLY the translated text.
- Preserve all original formatting (bolding, line breaks, punctuation).
- NO conversational preamble or explanations.`;

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

        // The prompt is structured to force the model into "Auto-Detect" mode
        const prompt = `Translate the following text into ${targetLanguage}. 
Ensure the grammar of ${targetLanguage} is perfect.

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