import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../create-context';
import type { TranslationHistory } from '@/backend/db/schema';

const historyRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      type: z.enum(['text', 'image', 'document', 'audio']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM translation_history WHERE userId = $userId';
      const params: Record<string, unknown> = { userId: ctx.userId };

      if (input.type) {
        query += ' AND translationType = $type';
        params.type = input.type;
      }

      if (input.search) {
        query += ' AND (sourceText CONTAINS $search OR translatedText CONTAINS $search)';
        params.search = input.search;
      }

      query += ' ORDER BY createdAt DESC LIMIT $limit START $offset';
      params.limit = input.limit;
      params.offset = input.offset;

      const result = await ctx.db.query<[TranslationHistory[]]>(query, params);
      return result[0] || [];
    }),

  favorites: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db.query<[TranslationHistory[]]>(
        'SELECT * FROM translation_history WHERE userId = $userId AND isFavorite = true ORDER BY createdAt DESC',
        { userId: ctx.userId }
      );
      return result[0] || [];
    }),

  add: protectedProcedure
    .input(z.object({
      sourceText: z.string(),
      translatedText: z.string(),
      sourceLanguage: z.enum(['zomi', 'english']),
      targetLanguage: z.enum(['zomi', 'english']),
      translationType: z.enum(['text', 'image', 'document', 'audio']),
      fileName: z.string().optional(),
      fileThumbnail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.create('translation_history', {
        ...input,
        userId: ctx.userId,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      });

      await ctx.db.query(
        'UPDATE user_stats SET translationsCount += 1, updatedAt = $now WHERE userId = $userId',
        { userId: ctx.userId, now: new Date().toISOString() }
      );

      return result;
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query<[TranslationHistory[]]>(
        'SELECT * FROM translation_history WHERE id = $id AND userId = $userId LIMIT 1',
        { id: input.id, userId: ctx.userId }
      );

      const item = result[0]?.[0];
      if (!item) {
        throw new Error('Not found');
      }

      await ctx.db.query(
        'UPDATE translation_history SET isFavorite = $favorite WHERE id = $id',
        { id: input.id, favorite: !item.isFavorite }
      );

      return { success: true, isFavorite: !item.isFavorite };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'DELETE FROM translation_history WHERE id = $id AND userId = $userId',
        { id: input.id, userId: ctx.userId }
      );
      return { success: true };
    }),

  clear: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.query(
        'DELETE FROM translation_history WHERE userId = $userId',
        { userId: ctx.userId }
      );
      return { success: true };
    }),
});

export default historyRouter;
