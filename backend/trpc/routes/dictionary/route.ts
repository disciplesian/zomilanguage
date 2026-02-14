import { z } from 'zod';
import { createTRPCRouter, dbProcedure } from '../../create-context';
import type { DictionaryEntry, DictionarySuggestion } from '@/backend/db/schema';

const dictionaryRouter = createTRPCRouter({
  search: dbProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const normalized = input.query.toLowerCase().trim();
      console.log('[Dictionary] Search:', normalized);

      try {
        const result = await ctx.db.query<[DictionaryEntry[]]>(
          `SELECT * FROM dictionary_entry 
           WHERE status = 'published' 
           AND (englishNormalized CONTAINS $query OR english CONTAINS $rawQuery OR zomi CONTAINS $rawQuery)
           ORDER BY 
             (englishNormalized = $query) DESC,
             (string::startsWith(englishNormalized, $query)) DESC,
             english ASC
           LIMIT $limit START $offset`,
          { query: normalized, rawQuery: input.query.trim(), limit: input.limit, offset: input.offset }
        );
        return result[0] || [];
      } catch (error) {
        console.error('[Dictionary] Search error:', error);
        return [];
      }
    }),

  suggest: dbProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(10).default(8),
    }))
    .query(async ({ ctx, input }) => {
      const normalized = input.query.toLowerCase().trim();

      try {
        const result = await ctx.db.query<[Pick<DictionaryEntry, 'id' | 'english' | 'zomi' | 'pos'>[]]>(
          `SELECT id, english, zomi, pos FROM dictionary_entry 
           WHERE status = 'published' 
           AND string::startsWith(englishNormalized, $query)
           ORDER BY english ASC
           LIMIT $limit`,
          { query: normalized, limit: input.limit }
        );
        return result[0] || [];
      } catch (error) {
        console.error('[Dictionary] Suggest error:', error);
        return [];
      }
    }),

  getById: dbProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.query<[DictionaryEntry[]]>(
          `SELECT * FROM dictionary_entry WHERE id = $id AND status = 'published'`,
          { id: input.id }
        );
        const entry = result[0]?.[0] || null;
        if (!entry) return null;

        const variants = await ctx.db.query<[{ id: string; zomiVariant: string; explanationVariant?: string; usageExampleVariant?: string }[]]>(
          `SELECT * FROM dictionary_variant WHERE entryId = $entryId ORDER BY sortOrder ASC`,
          { entryId: input.id }
        );

        return { ...entry, variants: variants[0] || [] };
      } catch (error) {
        console.error('[Dictionary] GetById error:', error);
        return null;
      }
    }),

  wordOfTheDay: dbProcedure
    .query(async ({ ctx }) => {
      try {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        const result = await ctx.db.query<[DictionaryEntry[]]>(
          `SELECT * FROM dictionary_entry WHERE status = 'published' ORDER BY createdAt ASC LIMIT 100`
        );
        const entries = result[0] || [];
        if (entries.length === 0) return null;
        return entries[dayOfYear % entries.length];
      } catch (error) {
        console.error('[Dictionary] WordOfTheDay error:', error);
        return null;
      }
    }),

  addEntry: dbProcedure
    .input(z.object({
      english: z.string().min(1).max(200),
      zomi: z.string().min(1).max(200),
      pos: z.string().max(50).optional(),
      explanation: z.string().max(1000).optional(),
      usageExample: z.string().max(500).optional(),
      sourceType: z.enum(['imported', 'admin', 'community']).default('admin'),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      const entry = await ctx.db.create('dictionary_entry', {
        english: input.english.trim(),
        englishNormalized: input.english.toLowerCase().trim(),
        zomi: input.zomi.trim(),
        pos: input.pos || '',
        explanation: input.explanation || '',
        usageExample: input.usageExample || '',
        status: input.sourceType === 'community' ? 'draft' : 'published',
        sourceType: input.sourceType,
        createdBy: input.createdBy || 'system',
        isApproved: input.sourceType !== 'community',
        createdAt: now,
        updatedAt: now,
      });
      return entry;
    }),

  submitSuggestion: dbProcedure
    .input(z.object({
      entryId: z.string().optional(),
      suggestionType: z.enum(['edit_entry', 'add_entry', 'add_variant', 'report_issue']),
      proposedChanges: z.object({
        english: z.string().optional(),
        pos: z.string().optional(),
        zomi: z.string().optional(),
        explanation: z.string().optional(),
        usageExample: z.string().optional(),
        reportReason: z.string().optional(),
      }),
      submittedBy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      const suggestion = await ctx.db.create('dictionary_suggestion', {
        entryId: input.entryId || null,
        suggestionType: input.suggestionType,
        proposedChanges: input.proposedChanges,
        status: 'submitted',
        submittedBy: input.submittedBy,
        createdAt: now,
        updatedAt: now,
      });
      return suggestion;
    }),

  listSuggestions: dbProcedure
    .input(z.object({
      status: z.enum(['submitted', 'under_review', 'approved', 'rejected']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      try {
        let query = `SELECT * FROM dictionary_suggestion`;
        const params: Record<string, unknown> = { limit: input.limit };

        if (input.status) {
          query += ` WHERE status = $status`;
          params.status = input.status;
        }

        query += ` ORDER BY createdAt DESC LIMIT $limit`;
        const result = await ctx.db.query<[DictionarySuggestion[]]>(query, params);
        return result[0] || [];
      } catch (error) {
        console.error('[Dictionary] ListSuggestions error:', error);
        return [];
      }
    }),

  moderateSuggestion: dbProcedure
    .input(z.object({
      suggestionId: z.string(),
      status: z.enum(['approved', 'rejected']),
      reviewNote: z.string().optional(),
      reviewedBy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      await ctx.db.query(
        `UPDATE dictionary_suggestion SET status = $status, reviewedBy = $reviewedBy, reviewNote = $reviewNote, updatedAt = $now WHERE id = $id`,
        {
          id: input.suggestionId,
          status: input.status,
          reviewedBy: input.reviewedBy,
          reviewNote: input.reviewNote || '',
          now,
        }
      );

      if (input.status === 'approved') {
        const suggestions = await ctx.db.query<[DictionarySuggestion[]]>(
          `SELECT * FROM dictionary_suggestion WHERE id = $id`,
          { id: input.suggestionId }
        );
        const suggestion = suggestions[0]?.[0];

        if (suggestion && suggestion.suggestionType === 'add_entry' && suggestion.proposedChanges) {
          const changes = suggestion.proposedChanges;
          if (changes.english && changes.zomi) {
            await ctx.db.create('dictionary_entry', {
              english: changes.english,
              englishNormalized: changes.english.toLowerCase().trim(),
              zomi: changes.zomi,
              pos: changes.pos || '',
              explanation: changes.explanation || '',
              usageExample: changes.usageExample || '',
              status: 'published',
              sourceType: 'community',
              createdBy: suggestion.submittedBy,
              isApproved: true,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      return { success: true };
    }),

  bulkImport: dbProcedure
    .input(z.object({
      entries: z.array(z.object({
        english: z.string().min(1),
        zomi: z.string().min(1),
        pos: z.string().optional(),
        explanation: z.string().optional(),
        usageExample: z.string().optional(),
      })).min(1).max(500),
      mode: z.enum(['add_only', 'update_only', 'upsert']).default('upsert'),
      createdBy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const entry of input.entries) {
        try {
          const normalized = entry.english.toLowerCase().trim();
          const existing = await ctx.db.query<[DictionaryEntry[]]>(
            `SELECT * FROM dictionary_entry WHERE englishNormalized = $normalized AND zomi = $zomi LIMIT 1`,
            { normalized, zomi: entry.zomi.trim() }
          );

          const exists = (existing[0] || []).length > 0;

          if (exists && input.mode === 'add_only') {
            skipped++;
            continue;
          }

          if (!exists && input.mode === 'update_only') {
            skipped++;
            continue;
          }

          if (exists) {
            const existingEntry = existing[0]![0];
            await ctx.db.query(
              `UPDATE dictionary_entry SET pos = $pos, explanation = $explanation, usageExample = $usageExample, updatedAt = $now WHERE id = $id`,
              {
                id: existingEntry.id,
                pos: entry.pos || existingEntry.pos || '',
                explanation: entry.explanation || existingEntry.explanation || '',
                usageExample: entry.usageExample || existingEntry.usageExample || '',
                now,
              }
            );
            updated++;
          } else {
            await ctx.db.create('dictionary_entry', {
              english: entry.english.trim(),
              englishNormalized: normalized,
              zomi: entry.zomi.trim(),
              pos: entry.pos || '',
              explanation: entry.explanation || '',
              usageExample: entry.usageExample || '',
              status: 'published',
              sourceType: 'imported',
              createdBy: input.createdBy,
              isApproved: true,
              createdAt: now,
              updatedAt: now,
            });
            inserted++;
          }
        } catch (err) {
          console.error('[Dictionary] Import entry error:', err);
          errors++;
        }
      }

      return { inserted, updated, skipped, errors, total: input.entries.length };
    }),

  stats: dbProcedure
    .query(async ({ ctx }) => {
      try {
        const totalResult = await ctx.db.query<[{ count: number }[]]>(
          `SELECT count() as count FROM dictionary_entry WHERE status = 'published' GROUP ALL`
        );
        const suggestionsResult = await ctx.db.query<[{ count: number }[]]>(
          `SELECT count() as count FROM dictionary_suggestion WHERE status = 'submitted' GROUP ALL`
        );
        return {
          totalEntries: totalResult[0]?.[0]?.count || 0,
          pendingSuggestions: suggestionsResult[0]?.[0]?.count || 0,
        };
      } catch {
        return { totalEntries: 0, pendingSuggestions: 0 };
      }
    }),
});

export default dictionaryRouter;
