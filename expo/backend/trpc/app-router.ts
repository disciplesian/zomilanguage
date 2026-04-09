import { createTRPCRouter } from "./create-context";
import historyRouter from "./routes/history/route";
import wordsRouter from "./routes/words/route";
import feedbackRouter from "./routes/feedback/route";
import statsRouter from "./routes/stats/route";
import translationRouter from "./routes/translation/route";


export const appRouter = createTRPCRouter({
  history: historyRouter,
  words: wordsRouter,
  feedback: feedbackRouter,
  stats: statsRouter,
  translation: translationRouter,

});

export type AppRouter = typeof appRouter;
