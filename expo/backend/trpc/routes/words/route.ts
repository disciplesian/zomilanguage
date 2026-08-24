import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { WordContribution } from '@/backend/db/schema';

/** Raw word_contribution row (snake_case columns from Postgres). */
interface WordRow {
  id: string;
  user_id: string;
  zomi: string;
  english: string;
  pronunciation: string | null;
  example: string | null;
  part_of_speech: string | null;
  category: string | null;
  dialect_specific: string | null;
  status: string;
  votes: number;
  moderator_note: string | null;
  moderator_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapWordRow(row: WordRow): WordContribution {
  return {
    id: row.id,
    userId: row.user_id,
    zomi: row.zomi,
    english: row.english,
    pronunciation: row.pronunciation ?? undefined,
    example: row.example ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined,
    category: row.category ?? undefined,
    dialectSpecific: row.dialect_specific ?? undefined,
    status: row.status as WordContribution['status'],
    votes: row.votes,
    moderatorNote: row.moderator_note ?? undefined,
    moderatorId: row.moderator_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Strips PostgREST filter syntax characters from user search input. */
function sanitizeSearch(value: string): string {
  return value.replace(/[%,()]/g, ' ').trim();
}

const wordsRouter = createTRPCRouter({
  list: dbProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db.client.from('word_contribution').select('*');
      q = input.status ? q.eq('status', input.status) : q.eq('status', 'approved');
      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as WordRow[]).map(mapWordRow);
    }),

  pending: dbProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.db.client
        .from('word_contribution')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as WordRow[]).map(mapWordRow);
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
      const { data, error } = await ctx.db.client
        .from('word_contribution')
        .insert({
          user_id: deviceId,
          zomi: rest.zomi,
          english: rest.english,
          pronunciation: rest.pronunciation ?? null,
          example: rest.example ?? null,
          part_of_speech: rest.partOfSpeech ?? null,
          category: rest.category ?? null,
          dialect_specific: rest.dialectSpecific ?? null,
          status: 'pending',
          votes: 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      try {
        await ctx.db.rpc('bump_user_stats', {
          p_user_id: deviceId,
          p_translations: 0,
          p_contributions: 1,
          p_points: 15,
        });
      } catch {
        // stats are best-effort
      }

      return mapWordRow(data as WordRow);
    }),

  vote: dbProcedure
    .input(z.object({ wordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data } = await ctx.db.client
        .from('word_contribution')
        .select('id, votes')
        .eq('id', input.wordId)
        .maybeSingle();
      const row = (data ?? null) as { id: string; votes: number } | null;
      if (row) {
        const { error } = await ctx.db.client
          .from('word_contribution')
          .update({ votes: row.votes + 1, updated_at: new Date().toISOString() })
          .eq('id', input.wordId);
        if (error) throw new Error(error.message);
      }
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
      const now = new Date().toISOString();
      const { error } = await ctx.db.client
        .from('word_contribution')
        .update({
          status: input.status,
          moderator_note: input.note ?? null,
          moderator_id: input.moderatorId || 'system',
          updated_at: now,
        })
        .eq('id', input.wordId);
      if (error) throw new Error(error.message);

      if (input.moderatorId) {
        const { error: actionError } = await ctx.db.client.from('moderation_action').insert({
          moderator_id: input.moderatorId,
          target_type: 'word',
          target_id: input.wordId,
          action: input.status === 'approved' ? 'approve' : 'reject',
          reason: input.note ?? null,
        });
        if (actionError) throw new Error(actionError.message);
      }

      return { success: true };
    }),

  search: dbProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const s = sanitizeSearch(input.query);
      if (!s) return [];
      const { data, error } = await ctx.db.client
        .from('word_contribution')
        .select('*')
        .eq('status', 'approved')
        .or(`zomi.ilike.%${s}%,english.ilike.%${s}%`)
        .limit(20);
      if (error) throw new Error(error.message);
      return ((data ?? []) as WordRow[]).map(mapWordRow);
    }),
});

export default wordsRouter;
