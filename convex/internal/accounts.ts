import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';

export const getByUserId = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Use type assertion since accounts table is from authTables
    return await (ctx.db as any)
      .query('accounts')
      .withIndex('by_userId', (q: any) => q.eq('userId', args.userId))
      .collect();
  },
});

export const updatePassword = internalMutation({
  args: {
    accountId: v.id('accounts'),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).patch(args.accountId, {
      hashedPassword: args.hashedPassword,
    });
  },
});

export const deleteAccount = internalMutation({
  args: {
    accountId: v.id('accounts'),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).delete(args.accountId);
  },
});
