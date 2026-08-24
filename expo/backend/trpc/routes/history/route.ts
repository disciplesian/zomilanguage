import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { TranslationHistory } from '@/backend/db/schema';

/** Raw translation_history row (snake_case columns from Postgres). */
interface HistoryRow {
  id: string;
  user_id: string;
  source_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  translation_type: string;
  is_favorite: boolean;
  file_name: string | null;
  file_thumbnail: string | null;
  created_at: string;
}

function mapHistoryRow(row: HistoryRow): TranslationHistory {
  return {
    id: row.id,
    userId: row.user_id,
    sourceText: row.source_text,
    translatedText: row.translated_text,
    sourceLanguage: row.source_language as TranslationHistory['sourceLanguage'],
    targetLanguage: row.target_language as TranslationHistory['targetLanguage'],
    translationType: row.translation_type as TranslationHistory['translationType'],
    isFavorite: row.is_favorite,
    fileName: row.file_name ?? undefined,
    fileThumbnail: row.file_thumbnail ?? undefined,
    createdAt: row.created_at,
  };
}

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
      let q = ctx.db.client.from('translation_history').select('*').eq('user_id', input.deviceId);

      if (input.type) {
        q = q.eq('translation_type', input.type);
      }

      if (input.search) {
        // Strip PostgREST filter syntax characters from user input.
        const s = input.search.replace(/[%,()]/g, ' ').trim();
        if (s) {
          q = q.or(`source_text.ilike.%${s}%,translated_text.ilike.%${s}%`);
        }
      }

      const { data, error } = await q
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);
      if (error) throw new Error(error.message);
      return ((data ?? []) as HistoryRow[]).map(mapHistoryRow);
    }),

  favorites: dbProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db.client
        .from('translation_history')
        .select('*')
        .eq('user_id', input.deviceId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as HistoryRow[]).map(mapHistoryRow);
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
      const { data, error } = await ctx.db.client
        .from('translation_history')
        .insert({
          user_id: deviceId,
          source_text: rest.sourceText,
          translated_text: rest.translatedText,
          source_language: rest.sourceLanguage,
          target_language: rest.targetLanguage,
          translation_type: rest.translationType,
          is_favorite: false,
          ...(rest.fileName ? { file_name: rest.fileName } : {}),
          ...(rest.fileThumbnail ? { file_thumbnail: rest.fileThumbnail } : {}),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      try {
        await ctx.db.rpc('bump_user_stats', {
          p_user_id: deviceId,
          p_translations: 1,
          p_contributions: 0,
          p_points: 0,
        });
      } catch {
        // stats are best-effort
      }

      return mapHistoryRow(data as HistoryRow);
    }),

  toggleFavorite: dbProcedure
    .input(z.object({
      id: z.string(),
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db.client
        .from('translation_history')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', input.deviceId)
        .maybeSingle();
      if (error) throw new Error(error.message);

      const item = (data ?? null) as HistoryRow | null;
      if (!item) {
        throw new Error('Not found');
      }

      const next = !item.is_favorite;
      const { error: updateError } = await ctx.db.client
        .from('translation_history')
        .update({ is_favorite: next })
        .eq('id', input.id)
        .eq('user_id', input.deviceId);
      if (updateError) throw new Error(updateError.message);

      return { success: true, isFavorite: next };
    }),

  delete: dbProcedure
    .input(z.object({
      id: z.string(),
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.client
        .from('translation_history')
        .delete()
        .eq('id', input.id)
        .eq('user_id', input.deviceId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  clear: dbProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.client
        .from('translation_history')
        .delete()
        .eq('user_id', input.deviceId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});

export default historyRouter;
