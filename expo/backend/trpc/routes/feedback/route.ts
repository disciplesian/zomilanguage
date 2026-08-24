import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { Feedback } from '@/backend/db/schema';

/** Raw feedback row (snake_case columns from Postgres). */
interface FeedbackRow {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  content: string;
  device_info: string | null;
  app_version: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapFeedbackRow(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    type: row.type as Feedback['type'],
    title: row.title,
    content: row.content,
    deviceInfo: row.device_info ?? undefined,
    appVersion: row.app_version ?? undefined,
    status: row.status as Feedback['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const feedbackRouter = createTRPCRouter({
  submit: dbProcedure
    .input(z.object({
      deviceId: z.string().optional(),
      type: z.enum(['bug', 'feature', 'translation', 'general']),
      title: z.string().min(3).max(200),
      content: z.string().min(10).max(2000),
      deviceInfo: z.string().optional(),
      appVersion: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { deviceId, ...rest } = input;
      const { data, error } = await ctx.db.client
        .from('feedback')
        .insert({
          user_id: deviceId || 'anonymous',
          type: rest.type,
          title: rest.title,
          content: rest.content,
          device_info: rest.deviceInfo ?? null,
          app_version: rest.appVersion ?? null,
          status: 'new',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapFeedbackRow(data as FeedbackRow);
    }),

  list: dbProcedure
    .input(z.object({
      status: z.enum(['new', 'in_progress', 'resolved', 'closed']).optional(),
      type: z.enum(['bug', 'feature', 'translation', 'general']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db.client.from('feedback').select('*');
      if (input.status) q = q.eq('status', input.status);
      if (input.type) q = q.eq('type', input.type);
      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as FeedbackRow[]).map(mapFeedbackRow);
    }),

  updateStatus: dbProcedure
    .input(z.object({
      feedbackId: z.string(),
      status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.client
        .from('feedback')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.feedbackId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});

export default feedbackRouter;
