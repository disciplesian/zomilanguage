import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../../create-context';
import type { Feedback } from '@/backend/db/schema';

const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      type: z.enum(['bug', 'feature', 'translation', 'general']),
      title: z.string().min(3).max(200),
      content: z.string().min(10).max(2000),
      deviceInfo: z.string().optional(),
      appVersion: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.create('feedback', {
        ...input,
        userId: ctx.userId,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return result;
    }),

  list: adminProcedure
    .input(z.object({
      status: z.enum(['new', 'in_progress', 'resolved', 'closed']).optional(),
      type: z.enum(['bug', 'feature', 'translation', 'general']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM feedback WHERE true';
      const params: Record<string, unknown> = {};

      if (input.status) {
        query += ' AND status = $status';
        params.status = input.status;
      }

      if (input.type) {
        query += ' AND type = $type';
        params.type = input.type;
      }

      query += ' ORDER BY createdAt DESC LIMIT $limit';
      params.limit = input.limit;

      const result = await ctx.db.query<[Feedback[]]>(query, params);
      return result[0] || [];
    }),

  updateStatus: adminProcedure
    .input(z.object({
      feedbackId: z.string(),
      status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'UPDATE feedback SET status = $status, updatedAt = $now WHERE id = $feedbackId',
        {
          feedbackId: input.feedbackId,
          status: input.status,
          now: new Date().toISOString(),
        }
      );

      return { success: true };
    }),
});

export default feedbackRouter;
