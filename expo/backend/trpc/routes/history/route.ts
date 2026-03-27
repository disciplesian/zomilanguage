import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { TranslationHistory } from '@/backend/db/schema';

const historyRouter = createTRPCRouter({
  list: dbProcedure
    .input(z.object({
      deviceId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      type: z.enum(['text', 'image', 'document', 'audio']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM translation_history WHERE userId = $userId';
      const params: Record<string, unknown> = { userId: input.deviceId };

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

  favorites: dbProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query<[TranslationHistory[]]>(
        'SELECT * FROM translation_history WHERE userId = $userId AND isFavorite = true ORDER BY createdAt DESC',
        { userId: input.deviceId }
      );
      return result[0] || [];
    }),

  add: dbProcedure
    .input(z.object({
      deviceId: z.string(),
      sourceText: z.string(),
      translatedText: z.string(),
      sourceLanguage: z.enum(['zomi', 'english']),
      targetLanguage: z.enum(['zomi', 'english']),
      translationType: z.enum(['text', 'image', 'document', 'audio']),
      fileName: z.string().optional(),
      fileThumbnail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { deviceId, ...rest } = input;
      const result = await ctx.db.create('translation_history', {
        ...rest,
        userId: deviceId,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      });

      await ctx.db.query(
        'UPDATE user_stats SET translationsCount += 1, updatedAt = $now WHERE userId = $userId',
        { userId: deviceId, now: new Date().toISOString() }
      );

      return result;
    }),

  toggleFavorite: dbProcedure
    .input(z.object({ 
      id: z.string(),
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query<[TranslationHistory[]]>(
        'SELECT * FROM translation_history WHERE id = $id AND userId = $userId LIMIT 1',
        { id: input.id, userId: input.deviceId }
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

  delete: dbProcedure
    .input(z.object({ 
      id: z.string(),
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'DELETE FROM translation_history WHERE id = $id AND userId = $userId',
        { id: input.id, userId: input.deviceId }
      );
      return { success: true };
    }),

  clear: dbProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'DELETE FROM translation_history WHERE userId = $userId',
        { userId: input.deviceId }
      );
      return { success: true };
    }),
});

export default historyRouter;
