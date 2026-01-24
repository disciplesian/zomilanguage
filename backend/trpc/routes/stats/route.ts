import { z } from 'zod';
import { createTRPCRouter, dbProcedure, protectedProcedure } from '../../create-context';
import type { UserStats, User } from '@/backend/db/schema';

const statsRouter = createTRPCRouter({
  leaderboard: dbProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query<[(UserStats & { user: Pick<User, 'name' | 'avatar'> })[]]>(
        'SELECT *, (SELECT name, avatar FROM user WHERE id = userId) as user FROM user_stats ORDER BY points DESC LIMIT $limit',
        { limit: input.limit }
      );
      return result[0] || [];
    }),

  myStats: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db.query<[UserStats[]]>(
        'SELECT * FROM user_stats WHERE userId = $userId LIMIT 1',
        { userId: ctx.userId }
      );

      if (!result[0] || result[0].length === 0) {
        const created = await ctx.db.create('user_stats', {
          userId: ctx.userId,
          translationsCount: 0,
          contributionsCount: 0,
          postsCount: 0,
          repliesCount: 0,
          points: 0,
          updatedAt: new Date().toISOString(),
        });
        return created;
      }

      return result[0][0];
    }),
});

export default statsRouter;
