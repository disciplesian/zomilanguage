import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { WordContribution } from '@/backend/db/schema';

const wordsRouter = createTRPCRouter({
  list: dbProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let query = 'SELECT *, (SELECT name FROM user WHERE id = userId) as contributorName FROM word_contribution WHERE true';
      const params: Record<string, unknown> = {};

      if (input.status) {
        query += ' AND status = $status';
        params.status = input.status;
      } else {
        query += ' AND status = $approved';
        params.approved = 'approved';
      }

      query += ' ORDER BY createdAt DESC LIMIT $limit';
      params.limit = input.limit;

      const result = await ctx.db.query<[(WordContribution & { contributorName: string })[]]>(query, params);
      return result[0] || [];
    }),

  pending: dbProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db.query<[(WordContribution & { contributorName: string })[]]>(
        'SELECT *, (SELECT name FROM user WHERE id = userId) as contributorName FROM word_contribution WHERE status = $pending ORDER BY createdAt ASC',
        { pending: 'pending' }
      );
      return result[0] || [];
    }),

  submit: dbProcedure
    .input(z.object({
      deviceId: z.string(),
      zomi: z.string().min(1).max(100),
      english: z.string().min(1).max(200),
      pronunciation: z.string().max(100).optional(),
      example: z.string().max(500).optional(),
      partOfSpeech: z.string().max(50).optional(),
      category: z.string().max(50).optional(),
      dialectSpecific: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { deviceId, ...rest } = input;
      const result = await ctx.db.create('word_contribution', {
        ...rest,
        userId: deviceId,
        status: 'pending',
        votes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await ctx.db.query(
        'UPDATE user_stats SET contributionsCount += 1, points += 15, updatedAt = $now WHERE userId = $userId',
        { userId: deviceId, now: new Date().toISOString() }
      );

      return result;
    }),

  vote: dbProcedure
    .input(z.object({ wordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'UPDATE word_contribution SET votes += 1 WHERE id = $wordId',
        { wordId: input.wordId }
      );
      return { success: true };
    }),

  moderate: dbProcedure
    .input(z.object({
      wordId: z.string(),
      status: z.enum(['approved', 'rejected']),
      note: z.string().optional(),
      moderatorId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'UPDATE word_contribution SET status = $status, moderatorNote = $note, moderatorId = $moderatorId, updatedAt = $now WHERE id = $wordId',
        {
          wordId: input.wordId,
          status: input.status,
          note: input.note,
          moderatorId: input.moderatorId || 'system',
          now: new Date().toISOString(),
        }
      );

      if (input.moderatorId) {
        await ctx.db.create('moderation_action', {
          moderatorId: input.moderatorId,
          targetType: 'word',
          targetId: input.wordId,
          action: input.status === 'approved' ? 'approve' : 'reject',
          reason: input.note,
          createdAt: new Date().toISOString(),
        });
      }

      return { success: true };
    }),

  search: dbProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query<[WordContribution[]]>(
        'SELECT * FROM word_contribution WHERE status = $approved AND (zomi CONTAINS $query OR english CONTAINS $query) LIMIT 20',
        { approved: 'approved', query: input.query }
      );
      return result[0] || [];
    }),
});

export default wordsRouter;
