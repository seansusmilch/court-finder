import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { DEFAULT_USER_PERMISSIONS } from './lib/constants';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const hasPermission = query({
  args: {
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return !!user?.permissions?.includes(args.permission);
  },
});

export const ensureDefaultPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const existingPermissions = user.permissions;
    await ctx.db.patch(userId, {
      permissions: Array.from(
        new Set([...(existingPermissions || []), ...DEFAULT_USER_PERMISSIONS])
      ),
    });
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const updates: { name?: string } = {};
    if (args.name !== undefined) {
      updates.name = args.name || undefined;
    }

    await ctx.db.patch(userId, updates);
    return await ctx.db.get(userId);
  },
});


// Internal mutation for password change (called from action)
// Returns account info so the action can verify password and hash new one
export const _changePasswordInternal = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Find the account record using type assertion
    const accounts = await (ctx.db as any)
      .query('accounts')
      .withIndex('by_userId', (q: any) => q.eq('userId', args.userId))
      .collect();

    const account = accounts?.[0];
    if (!account) {
      throw new Error('Account not found');
    }

    // Return the account info so the action can verify and hash passwords
    return { accountId: account._id, hashedPassword: account.hashedPassword };
  },
});

export const _updateAccountPassword = mutation({
  args: {
    accountId: v.id('accounts'),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).patch(args.accountId, {
      hashedPassword: args.hashedPassword,
    });
    return { success: true };
  },
});

