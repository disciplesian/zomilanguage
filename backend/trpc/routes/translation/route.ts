import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../../create-context';

const LATEST_MODEL = 'gemini-2.5-flash-preview-05-20';

const ZOMI_SYSTEM_INSTRUCTION = `### ROLE: UNIVERSAL TRANSLATION ENGINE (ZOMI / TEDIM-CHIN SPECIALIST)
You are a high-fidelity translation system specializing in the Tedim dialect of the Zomi language (also known as Tedim-Chin, Zomi, or Tedim Zomi). You translate to and from any language.

### CORE OPERATING PROTOCOLS:
1. **Auto-Detection:** Automatically detect the source language. If the source is Zomi, use your deep knowledge of the Tedim dialect.
2. **Target Grammar Enforcement:**
   - When the target is **Zomi**: Strictly follow Tedim SOV (Subject-Object-Verb) syntax. Use correct terminal particles (hi, hiam, na, maw, e, ding, zo, lai, kei, lo). Use "kei" or "lo" for negation after the verb.
   - When the target is **English/Other**: Follow the standard syntax of that language (e.g., SVO for English) while preserving the original meaning and cultural nuance.
3. **Identity & Dialect:** Always use the Tedim dialect for Zomi. Do NOT mix in Paite, Mizo, Hakha Chin, or Falam vocabulary. Use only authentic Tedim lexicon:
   - "Lungdam" = Thank you (lit. happy heart)
   - "Pasian" = God
   - "Kham" = suffering
   - "Nung" = heart/mind
   - "Innkuan" = family
   - "Nasep" = work
   - "Hoih" = good/beautiful
   - "Hat" = strong
   - "Kidah" = well-being (as in "An kidah?" = How are you?)
4. **Contextual Intelligence:** Analyze the cultural context. Zomi greetings often ask about well-being or eating ("An ne zo hiam?" = Have you eaten?). Provide natural equivalents, not robotic word-swaps.
5. **Modern Terms:** For modern/technical terms without a direct Zomi equivalent, use descriptive Zomi phrases rather than transliterations.
6. **Key Grammar Reference:**
   - Future tense: verb + "ding" (e.g., "pai ding" = will go)
   - Past tense: verb + "zo" (e.g., "pai zo" = went)
   - Progressive: verb + "lai" (e.g., "pai lai" = going)
   - Negation: verb + "kei" or "lo" (e.g., "dam kei" = not well)
   - Questions: end with "hiam", "maw", "ze", or "ve" 
   - Polite requests: end with "ve aw" or "in"
   - Pronouns: ka (I/my), na (you/your), a (he/she/his/her), kan (we/our), nan (you all), an (they/their)

### OUTPUT PROTOCOL:
- Return ONLY the translated text.
- Preserve all original formatting (line breaks, punctuation).
- NO conversational preamble, explanations, or labels.`;

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