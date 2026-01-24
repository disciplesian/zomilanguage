import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { getDB } from "@/backend/db/client";
import Surreal from 'surrealdb.js';

interface AuthPayload {
  userId: string;
  role: string;
}

const parseAuthToken = (token: string): AuthPayload | null => {
  try {
    const decoded = atob(token);
    const parsed = JSON.parse(decoded);
    if (parsed.userId && parsed.role) {
      return {
        userId: parsed.userId,
        role: parsed.role,
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  let db: Surreal | null = null;
  let userId: string | null = null;
  let userRole: 'user' | 'moderator' | 'admin' | null = null;
  
  if (token) {
    const authPayload = parseAuthToken(token);
    if (authPayload) {
      userId = authPayload.userId;
      userRole = authPayload.role as 'user' | 'moderator' | 'admin';
      console.log('Auth context parsed:', { userId, userRole });
    }
  }
  
  return {
    req: opts.req,
    db,
    userId,
    userRole,
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

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  if (!ctx.db) {
    // Try to reconnect if possible
    try {
      const db = await getDB();
      return next({
        ctx: {
          ...ctx,
          db,
          userId: ctx.userId,
          userRole: ctx.userRole!,
        },
      });
    } catch {
       throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }
  }
  return next({
    ctx: {
      ...ctx,
      db: ctx.db,
      userId: ctx.userId,
      userRole: ctx.userRole!,
    },
  });
});

export const moderatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.userRole !== 'moderator' && ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access required' });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
