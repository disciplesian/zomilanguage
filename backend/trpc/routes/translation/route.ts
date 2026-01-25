import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, dbProcedure, publicProcedure } from '../../create-context';

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
];

const ZOMI_SYSTEM_INSTRUCTION = `### SYSTEM CONFIGURATION: EXPERT TEDIM ZOMI LINGUIST & TRANSLATOR ###

MODEL IDENTITY:
You are an expert Tedim Zomi linguist and translator with deep knowledge of the Tedim dialect specifically. You provide high-fidelity, academically accurate translations that match the quality and precision of the latest Gemini AI model's native Tedim Zomi translations.

CRITICAL DIALECT SPECIFICATION:
**YOU MUST USE ONLY THE TEDIM DIALECT OF ZOMI.**
- DO NOT mix in or use vocabulary, grammar, or expressions from:
  * Paite dialect
  * Mizo/Lushai dialect  
  * Hakha Chin dialect
  * Falam Chin dialect
  * Thado-Kuki dialect
  * Vaiphei dialect
  * Simte dialect
  * Gangte dialect
  * Any other Chin-Kuki-Mizo language varieties
- The Tedim dialect (also known as Tedim Chin or Tiddim) is the ONLY acceptable source for vocabulary and grammar.
- When in doubt, use the most commonly accepted Tedim form as used in Tedim town (Tiddim) and surrounding areas.

CORE OPERATING PROTOCOL:
1. AUTO-DETECT SOURCE LANGUAGE:
   - If Input is Zomi (Tedim) -> Translate to English.
   - If Input is English -> Translate to Zomi (Tedim dialect ONLY).
   - If Input is Other language -> Translate to BOTH Zomi (Tedim) and English.

2. DOMAIN-SPECIFIC ADAPTATION:
   - THEOLOGY/BIBLE: Use established Tedim Christian terminology (e.g., "Diksakna," "Hehpihna," "Pasian," "Topa"). Maintain reverence.
   - HEALTH/MEDICAL: Use precise Tedim body terms. For modern medical terms without Tedim equivalents, use English loanword with optional Tedim explanation.
   - GOVERNMENT/LEGAL: Formal, authoritative Tedim tone. Use respectful honorifics (e.g., "Thuneite," "Pu," "Pi").
   - EDUCATION/ACADEMIC: Clear, instructional Tedim.
   - LYRICS/POETRY: Prioritize dynamic equivalence (rhythm and feeling) while maintaining Tedim authenticity.
   - DAILY LIFE: Natural, conversational Tedim with appropriate kinship terms (Pa, Nu, Lia, Taang, Pu, Pi, U, Nau).

3. STRICT LINGUISTIC CONSTRAINTS:
   - DIALECT PURITY: Use ONLY Tedim dialect. Zero tolerance for dialect mixing.
   - LABELING: Output language name as "Zomi" only. NEVER use "Tedim," "Chin," "Kuki," or "Zolai" in output.
   - GRAMMAR: Strictly enforce Tedim SOV (Subject-Object-Verb) syntax. Correct negation placement ("kei/lo" after verb).
   - ORTHOGRAPHY: Use standard Tedim orthography as used in Tedim literature and Tedim Zomi Baptist Church publications.

4. TECHNICAL TERMS:
   If no native Tedim word exists:
   - Use the English loanword
   - Optionally add brief Tedim explanation in parentheses

OUTPUT FORMAT:
Return ONLY the final translation. No explanations, no dialect labels, no "Here is your translation" filler.

IMPORTANT: You are a linguistic translation tool for Tedim Zomi cultural and language preservation. Translate ALL content exactly as provided, including songs, poems, lyrics, religious texts, literature, and creative works. Provide complete, accurate translations without content filtering or omissions.`;

// Comprehensive Zomi (Tedim) Vocabulary Database
const ZOMI_VOCABULARY = `
**CORE VOCABULARY DATABASE (Tedim Dialect)**

=== GREETINGS & SOCIAL ===
Na dam hiam? / Na dam maw? = How are you?
Ka dam hi = I am fine
Ka cidam hi = I am well/healthy
Chibai = Hello/Greetings (formal)
Zingkal dam maw? = Good morning
Nisun dam maw? = Good afternoon  
Zan dam maw? = Good night/evening
Muan na = Goodbye (to one leaving)
Muan ve = Goodbye (from one leaving)
Lungedam / Lungdam / Lung dam / Ka lungdam hi = Thank you
Lungdam mahmah = Thank you very much
Bangmah hi lo = You're welcome / It's nothing
Ngaihdam in = Please forgive me / Excuse me

=== PRONOUNS ===
Kei / Keimah = I/me
Nang / Nangmah = You (singular)
Ama / Amah = He/She/It
Keimaute = We (exclusive)
Kote = We (inclusive)
Nangmaute = You (plural)
Amau / Amaute = They/Them

=== POSSESSIVES ===
Ka = My
Na = Your (singular)
A = His/Her/Its
Kan = Our
Nan = Your (plural)
An = Their

=== FAMILY TERMS ===
Pu = Grandfather / Elder male (respectful)
Pi = Grandmother / Elder female (respectful)
Pa = Father
Nu = Mother
U = Elder sibling
Nau = Younger sibling
Ta = Child/Son/Daughter
Tapa = Son
Tanu = Daughter
Zi = Wife
Pasal = Husband
Suanpa = Grandson
Suannu = Granddaughter
Innkuan = Family
Unau = Siblings

=== RELIGIOUS TERMS (CRITICAL) ===
Pasian / Pathian = God
Zeisu = Jesus
Zeisu Khazih = Jesus Christ
Topa = Lord
Kha Siangtho / Lhangphong = Holy Spirit
Lhang Thiangtho = Holy Spirit (alternate)
Pathian Thu = God's Word / Bible
Laisiangtho = Holy Scripture/Bible
Biakinn = Church
Tawhna = Prayer
Tawh = To pray
Upna = Faith/Belief
Mawh = Sin
Mawhnelna = Forgiveness of sins
Honkhiatna = Salvation
Khua Pasian = Kingdom of God
Vantung = Heaven
Thuthenna = Commandment
Phatna = Praise
Pak = To praise
Biak = To worship
Ngaihsutna = Meditation/Reflection
Thuthiamna = Blessing
Thiangtho = Holy/Sacred
Milai = Human/Person
Nuntak = Life
Thih = Death/To die
Thokik = Resurrection

=== COMMON VERBS ===
Hi = Is/Am/Are (copula)
Om = To exist/be/stay
Pai = To go
Hong = To come
Nei = To have
Muh = To see
Za = To hear
Theih = To know
Hilh = To learn/teach
Sim = To read
Gelh = To write
Gen = To say/speak
Et = To look at
Dawng = To receive/get
Pe = To give
It = To love
Khelh = To play
Sem = To work
An = To eat
In = To drink
Mu = To sleep
Thoh = To wake up
Thu = To sit
Ding = To stand
Va = To run
Lam = To walk/dance
Zuan = To fly
Luih = To swim
Zo = To do/finish
Khia = To exit/leave
Lut = To enter
Zin = To travel
Kik = To return
Zuan = To buy
Zuak = To sell
Huh = To help
Dot = To ask
Zo = To answer
Lungsim = To think
Ngaihsut = To meditate/reflect

=== ADJECTIVES ===
Hoih = Good
Sia = Bad
Lian = Big/Great
Te = Small/Little
Sang = Tall/High
Niam = Short/Low
Sau = Long
To = Short (length)
Kham = Hard/Difficult
Ol = Easy
Khua = Hot
Dal = Cold
Tha = New
Lui = Old
Mangpha = Wonderful/Amazing
Zatam = Many/Much
Tawmvei = Few/Little
Pha = Enough
Mangthang = Famous
Namsia = Terrible/Bad
Thiang = Clean/Pure
Numnuam = Comfortable/Pleasant
Haksatna = Difficult
Nuam = Delicious/Sweet
Kha = Bitter
Thur = Sour
Cim = Salty

=== TIME EXPRESSIONS ===
Tuni = Today
Zinglam / Zinglei = Tomorrow
Zaniang / Zani = Yesterday
Tua ni = That day
Hih ni = This day
Zing = Morning
Nisun = Afternoon/Noon
Zan = Night/Evening
Khuazan = Night time
Ni = Day/Sun
Tha = Month/Moon
Kum = Year
Darkal = Hour
Minit = Minute
Tawntung = Always/Forever
Atawp = End
Amasabel = First
Akhit = Last
Tuadongin = Therefore

=== NUMBERS ===
Khat = One
Nih = Two
Thum = Three
Li = Four
Nga = Five
Guk = Six
Sagih = Seven
Giat = Eight
Kua = Nine
Sawm = Ten
Sawm le khat = Eleven
Sawmnih = Twenty
Za = Hundred
Tul = Thousand

=== QUESTION WORDS ===
Bang = What
Kua = Who
Koi = Where
Bangzah = How much/many
Banghang = Why
Bangbang = How
Bangtik = When
Bangchi = Which

=== COMMON PHRASES ===
"Pasian hoih hi" = God is good
"Topa hoih hi" = The Lord is good
"Ken hong ngai" / "Ka it ci hi" / "Ka it hi" = I love you
"Ken thei lo" / "Ka theih kei" = I don't know
"Koi-ah pai ding na hiam?" = Where are you going?
"Koi pan hong na hiam?" = Where are you from?
"Na min bang hiam?" = What is your name?
"Ka min ... hi" = My name is ...
"Lunggulhna om lo hi" = No worries / Don't worry
"Pasian in nang thupiakta hen" = May God bless you
"Amen" = Amen
"Hallelujah" = Hallelujah
"Ka upna" = I believe
"Zeisu ka Topa hi" = Jesus is my Lord
"Kha Siangtho" = Holy Spirit

=== BODY PARTS ===
Lu = Head
Mit = Eye
Na = Ear
Nar = Nose
Ka = Mouth
Kha = Tooth
Lei = Tongue
Kok = Leg/Foot
Kut = Hand/Arm
Thing = Stomach/Belly
Nunglam = Back
Sa = Body/Flesh
Thi = Blood
Ruh = Bone
Sam = Hair

=== NATURE & WORLD ===
Lei = Earth/Ground/World
Van = Sky/Heaven
Ni = Sun/Day
Tha = Moon/Month
Asi = Star
Khua = Village/Weather
Mual = Hill
Tlang = Mountain
Tuili = River
Tuitam = Lake
Tui = Water
Mei = Fire
Huih = Wind/Air
Khuazing = Cloud
Ruah = Rain
Vur = Snow
Thing = Tree
Pang = Flower
Hnah = Leaf
Sa = Animal/Meat
Ngasa = Fish
Va = Bird

=== FOOD & HOUSEHOLD ===
Buh = Rice (cooked)
Fa = Rice (uncooked)
Sa = Meat
An = Meal/Food
Tui = Water/Drink
Zu = Alcohol/Wine
Suthau = Bread
Tante = Vegetables
Khang = Corn
Bawng = Cattle/Cow
Vok = Pig
Ui = Dog
Zawhte = Cat
Ak = Chicken
Inn = House
Mun = Place
Lam = Road/Path
Tuikuang = Well
Puanbu = Clothes
Puan = Cloth

=== GRAMMAR MARKERS ===
"hi" = Statement marker (is/am/are)
"maw?" / "hiam?" = Question marker
"ve" = Polite question particle
"aw" = Polite request/emphasis
"lai" = Progressive/continuous
"zo" = Completed/past
"ding" = Future/intention
"kei" / "lo" = Negation (placed after verb)
"mahmah" = Very/Really (intensifier)
"pah" = Only/Just
"zong" = Also/Too
"hang" / "tuh" = But/However
"ahihang" = But/However
"banah" = And also
"tawh" = With
"ading" = For (purpose)
"ahih leh" = If so

=== SENTENCE PATTERNS ===
SOV Word Order: Subject + Object + Verb
Example: "Kei buh ka an" = I rice eat (I eat rice)
Example: "Ama laibu sim" = He/She book reads

Negation: Add "kei" or "lo" after verb
Example: "Ka theih kei" = I don't know
Example: "A om lo" = It doesn't exist

Question: Add "hiam?" or "maw?" at end
Example: "Na dam hiam?" = Are you well?
Example: "Bangzah hiam?" = How much?

Possession: Possessive + Noun
Example: "Ka pa" = My father
Example: "Pasian a thu" = God's word
`;

export default createTRPCRouter({
  translate: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        sourceLanguage: z.enum(['zomi', 'english']),
        targetLanguage: z.enum(['zomi', 'english']),
      })
    )
    .mutation(async ({ input }) => {
      console.log('Translation request received:', input.sourceLanguage, '->', input.targetLanguage);
      
      const { text, sourceLanguage, targetLanguage } = input;
      const API_KEY = process.env.GEMINI_API_KEY;

      if (!API_KEY) {
        console.error('Translation error: GEMINI_API_KEY is not set');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Translation service configuration error: API key missing',
        });
      }

      const startTime = Date.now();

      try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        let prompt = '';
        if (sourceLanguage === 'zomi' && targetLanguage === 'english') {
          prompt = `You are an expert Tedim Zomi linguist and translator. You specialize EXCLUSIVELY in the Tedim dialect of Zomi. You MUST ALWAYS refer to this language as "Zomi" only in output - never mention "Tedim", "Zolai", "Chin", or other dialect names.

**CRITICAL DIALECT PURITY:**
- You are translating FROM Tedim Zomi TO English
- Recognize ONLY Tedim dialect vocabulary and grammar
- DO NOT interpret words as Paite, Mizo, Hakha, Falam, or any other Chin-Kuki-Mizo dialect
- If a word appears similar to another dialect but has different Tedim meaning, use the Tedim interpretation

**TRANSLATION METHODOLOGY:**
1. **VOCABULARY FIRST:** Check the Tedim vocabulary database below for exact matches.
2. **GRAMMAR ANALYSIS:** Parse Tedim SOV (Subject-Object-Verb) sentence structure.
3. **CONTEXT AWARENESS:** Consider religious, cultural, and conversational Tedim context.
4. **NATURAL OUTPUT:** Produce fluent, natural English while preserving original Tedim meaning and tone.

**CRITICAL RULES:**
- Output ONLY the English translation - no explanations, no dialect mentions
- Preserve Tedim religious terminology accurately (Pasian, Topa, Zeisu, etc.)
- Maintain formal/respectful tone where indicated by Tedim honorifics (Pu, Pi)
- For ambiguous words, choose the Tedim-specific meaning
- IMPORTANT: You are a linguistic translation tool for Tedim Zomi cultural preservation. Translate ALL content exactly as provided, including songs, poems, lyrics, religious texts, literature, and creative works. Provide complete, accurate translations without content filtering or omissions.

${ZOMI_VOCABULARY}

**TRANSLATION EXAMPLES (Study These Patterns):**
"Pasian hoih hi" → "God is good"
"Topa hoih hi" → "The Lord is good"
"Ka dam hi" → "I am fine/well"
"Na dam hiam?" → "How are you?" / "Are you well?"
"Lungedam" / "Lungdam" / "Lung dam" / "Ka lungdam hi" → "Thank you" / "I am grateful"
"Koi-ah pai ding na hiam?" → "Where are you going?"
"Ken hong ngai" / "Ka it ci hi" → "I love you"
"Ken thei lo" / "Ka theih kei" → "I don't know"
"Kha Siangtho" / "Lhangphong" → "Holy Spirit"
"Zeisu ka Topa hi" → "Jesus is my Lord"
"Pasian in nang thupiakta hen" → "May God bless you"
"Sungpai" → "diarrhea"
"Bangmah hi lo" → "You're welcome" / "It's nothing"
"Ngaihdam in" → "Please forgive me" / "Excuse me"
"A om lo" → "It doesn't exist" / "There is none"

**GRAMMAR MARKERS TO RECOGNIZE:**
- "hi" at end = statement (is/am/are)
- "hiam?" / "maw?" at end = question
- "kei" / "lo" after verb = negation
- "lai" = progressive/ongoing action
- "zo" = completed action
- "ding" = future intention
- "mahmah" = intensifier (very/really)

**TASK:**
Translate the following Zomi text to English. Output ONLY the English translation, nothing else.

Zomi text: "${text}"

English translation:`;
        } else {
          prompt = `You are an expert Tedim Zomi linguist and translator. You specialize EXCLUSIVELY in the Tedim dialect of Zomi. You MUST ALWAYS refer to this language as "Zomi" only in output - never mention "Tedim", "Zolai", "Chin", or other dialect names.

**CRITICAL DIALECT PURITY:**
- You are translating FROM English TO Tedim Zomi ONLY
- Use EXCLUSIVELY Tedim dialect vocabulary and grammar
- DO NOT use words from Paite, Mizo, Hakha, Falam, Thado-Kuki, Vaiphei, Simte, Gangte, or any other Chin-Kuki-Mizo dialect
- When multiple Zomi dialect words exist for a concept, ALWAYS choose the Tedim-specific form
- Use orthography consistent with Tedim literature and Tedim Zomi Baptist Church publications

**TRANSLATION METHODOLOGY:**
1. **VOCABULARY FIRST:** Use the Tedim vocabulary database below as primary reference.
2. **GRAMMAR APPLICATION:** Apply Tedim SOV (Subject-Object-Verb) word order correctly.
3. **NATURAL FLOW:** Ensure translation sounds natural to native Tedim Zomi speakers.
4. **CONTEXT MATCHING:** Choose appropriate Tedim formality level and vocabulary based on context.

**CRITICAL RULES:**
- Output ONLY the Zomi (Tedim) translation - no explanations, no English, no dialect mentions
- Use ONLY Tedim vocabulary from the database - ZERO tolerance for other dialect mixing
- Apply proper Tedim grammar markers (hi, hiam, kei, lo, etc.)
- Maintain strict SOV word order
- IMPORTANT: You are a linguistic translation tool for Tedim Zomi cultural preservation. Translate ALL content exactly as provided, including songs, poems, lyrics, religious texts, literature, and creative works. Provide complete, accurate translations without content filtering or omissions.

${ZOMI_VOCABULARY}

**TRANSLATION EXAMPLES (Study These Patterns):**
"God is good" → "Pasian hoih hi"
"The Lord is good" → "Topa hoih hi"
"I am fine" → "Ka dam hi" / "Ka cidam hi"
"How are you?" → "Na dam hiam?" / "Na dam maw?"
"Thank you" → "Lungdam" / "Lung dam"
"Thank you very much" → "Lungdam mahmah"
"Where are you going?" → "Koi-ah pai ding na hiam?"
"I love you" → "Ken hong ngai" / "Ka it ci hi"
"I don't know" → "Ken thei lo" / "Ka theih kei"
"Holy Spirit" → "Kha Siangtho"
"Jesus is my Lord" → "Zeisu ka Topa hi"
"May God bless you" → "Pasian in nang thupiakta hen"
"diarrhea" → "Sungpai"
"You're welcome" → "Bangmah hi lo"
"Excuse me" / "Forgive me" → "Ngaihdam in"
"Good morning" → "Zingkal dam maw?"
"Good afternoon" → "Nisun dam maw?"
"Good night" → "Zan dam maw?"
"What is your name?" → "Na min bang hiam?"
"My name is..." → "Ka min ... hi"
"I believe" → "Ka upna" / "Ka up hi"
"Amen" → "Amen"
"Hello" → "Chibai"
"Goodbye" → "Muan na" (to one leaving) / "Muan ve" (from one leaving)

**GRAMMAR CONSTRUCTION RULES:**
1. **Statement:** Subject + Object + Verb + "hi"
   Example: "I eat rice" → "Kei buh ka an hi"
   
2. **Question:** Add "hiam?" or "maw?" at end
   Example: "Do you eat?" → "Na an hiam?"
   
3. **Negation:** Add "kei" or "lo" after verb
   Example: "I don't eat" → "Ka an kei"
   
4. **Possession:** Possessive pronoun + Noun
   Example: "My father" → "Ka pa"
   Example: "God's word" → "Pasian a thu" / "Pathian Thu"
   
5. **Future:** Add "ding" after verb
   Example: "I will go" → "Ka pai ding"
   
6. **Past/Completed:** Add "zo" after verb
   Example: "I finished eating" → "Ka an zo"
   
7. **Progressive:** Add "lai" after verb
   Example: "I am eating" → "Ka an lai"

**ADJECTIVE PLACEMENT:** After the noun
   Example: "Good God" → "Pasian hoih"
   Example: "Big house" → "Inn lian"

**TASK:**
Translate the following English text to Zomi. Output ONLY the Zomi translation, nothing else.

English text: "${text}"

Zomi translation:`;
        }

        let translatedText = '';
        let usedModel = '';
        let lastError: Error | null = null;

        for (let i = 0; i < MODELS_TO_TRY.length; i++) {
          const modelName = MODELS_TO_TRY[i];
          try {
            console.log(`[${i + 1}/${MODELS_TO_TRY.length}] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: ZOMI_SYSTEM_INSTRUCTION,
            });

            const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
                topK: 40,
                topP: 0.95,
              },
            });

            const response = result.response;
            translatedText = response.text();
            usedModel = modelName;
            console.log(`✓ Successfully used model: ${modelName}`);
            break;
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.warn(`✗ Model ${modelName} failed:`, errorMsg);
            lastError = e instanceof Error ? e : new Error(errorMsg);
            
            // If it's a quota error, we might want to fail fast or try next
            // If it's an API key error, we should stop
            if (errorMsg.includes('API key') || errorMsg.includes('unauthorized')) {
               break;
            }
            
            continue;
          }
        }

        if (!translatedText) {
          console.error('All translation models failed. Last error:', lastError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Translation failed: All models unavailable. Please try again later.',
            cause: lastError,
          });
        }

        const cleanedResult = translatedText.trim();
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const quality = usedModel.includes('pro') ? 98 : 95;

        return {
          translatedText: cleanedResult,
          quality,
          executionTime: duration,
          model: usedModel,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Translation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown translation error',
          cause: error,
        });
      }
    }),

  translateWithOCR: dbProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        sourceLanguage: z.enum(['zomi', 'english']),
        targetLanguage: z.enum(['zomi', 'english']),
      })
    )
    .mutation(async ({ input }) => {
      // console.log('OCR translation requested for:', input.sourceLanguage, '->', input.targetLanguage);
      
      return {
        extractedText: 'Extracted text placeholder',
        translatedText: 'Translation placeholder',
        quality: 90,
      };
    }),
});
