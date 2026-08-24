import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { UserStats } from '@/backend/db/schema';

/** Raw user_stats row (snake_case columns from Postgres). */
interface StatsRow {
  user_id: string;
  translations_count: number;
  contributions_count: number;
  posts_count: number;
  replies_count: number;
  points: number;
  updated_at: string;
}

function mapStatsRow(row: StatsRow): UserStats {
  return {
    userId: row.user_id,
    translationsCount: row.translations_count,
    contributionsCount: row.contributions_count,
    postsCount: row.posts_count,
    repliesCount: row.replies_count,
    points: row.points,
    updatedAt: row.updated_at,
  };
}

const statsRouter = createTRPCRouter({
  leaderboard: dbProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db.client
        .from('user_stats')
        .select('*')
        .order('points', { ascending: false })
        .limit(input.limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as StatsRow[]).map(mapStatsRow);
    }),

  myStats: dbProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.db.client
        .from('user_stats')
        .select('*')
        .eq('user_id', input.deviceId)
        .maybeSingle();
      const existing = (data ?? null) as StatsRow | null;
      if (existing) return mapStatsRow(existing);

      const { data: created, error } = await ctx.db.client
        .from('user_stats')
        .insert({
          user_id: input.deviceId,
          translations_count: 0,
          contributions_count: 0,
          posts_count: 0,
          replies_count: 0,
          points: 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapStatsRow(created as StatsRow);
    }),
});

export default statsRouter;
