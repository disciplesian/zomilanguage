import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { getDB } from "@/backend/db/client";
import Surreal from 'surrealdb.js';

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  let db: Surreal | null = null;
  
  return {
    req: opts.req,
    db,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const dbProcedure = t.procedure.use(async ({ ctx, next }) => {
  let db: Surreal;
  if (!ctx.db) {
    try {
      db = await getDB();
    } catch (error) {
      console.error('dbProcedure: Database connection failed:', error);
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: 'Database not available. Please try again later.' 
      });
    }
  } else {
    db = ctx.db;
  }
  return next({
    ctx: {
      ...ctx,
      db,
    },
  });
});
