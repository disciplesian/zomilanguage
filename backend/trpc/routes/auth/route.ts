import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, dbProcedure, protectedProcedure } from '../../create-context';
import type { User } from '@/backend/db/schema';

const authRouter = createTRPCRouter({
  signup: dbProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query<[User[]]>(
        'SELECT * FROM user WHERE email = $email LIMIT 1',
        { email: input.email }
      );

      if (existing[0] && existing[0].length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      
      const result = await ctx.db.create('user', {
        email: input.email,
        passwordHash,
        name: input.name,
        role: 'user',
        isPremium: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerified: false,
      });

      const users = result as unknown as User[];
      const user = users[0];

      return {
        userId: user.id as string,
        email: user.email as string,
        name: user.name as string,
      };
    }),

  login: dbProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query<[User[]]>(
        'SELECT * FROM user WHERE email = $email LIMIT 1',
        { email: input.email }
      );

      const user = result[0]?.[0];
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isPremium: user.isPremium,
        isVerified: user.isVerified,
      };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db.query<[User[]]>(
        'SELECT * FROM user WHERE id = $userId LIMIT 1',
        { userId: ctx.userId }
      );

      const user = result[0]?.[0];
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isPremium: user.isPremium,
        isVerified: user.isVerified,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(2).optional(),
      bio: z.string().max(500).optional(),
      avatar: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.query(
        'UPDATE user SET name = $name, bio = $bio, avatar = $avatar, updatedAt = $now WHERE id = $userId',
        {
          userId: ctx.userId,
          name: input.name,
          bio: input.bio,
          avatar: input.avatar,
          now: new Date().toISOString(),
        }
      );

      return { success: true };
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.delete(`user:${ctx.userId}`);
      return { success: true };
    }),
});

export default authRouter;
