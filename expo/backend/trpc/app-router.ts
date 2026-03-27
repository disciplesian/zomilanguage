import { createTRPCRouter } from "./create-context";
import historyRouter from "./routes/history/route";
import wordsRouter from "./routes/words/route";
import feedbackRouter from "./routes/feedback/route";
import statsRouter from "./routes/stats/route";
import translationRouter from "./routes/translation/route";
import dictionaryRouter from "./routes/dictionary/route";


export const appRouter = createTRPCRouter({
  history: historyRouter,
  words: wordsRouter,
  feedback: feedbackRouter,
  stats: statsRouter,
  translation: translationRouter,
  dictionary: dictionaryRouter,

});

export type AppRouter = typeof appRouter;
