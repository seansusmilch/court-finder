import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import {
  DEFAULT_USER_PERMISSIONS,
  PERMISSIONS,
  PLAN_TIERS,
} from './lib/constants';

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

const requireAdminUser = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const user = await ctx.db.get(userId);
  if (!user?.permissions?.includes(PERMISSIONS.ADMIN.ACCESS)) {
    throw new Error('Insufficient permissions');
  }

  return { userId, user };
};

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);

    const users = await ctx.db.query('users').collect();
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAnonymous: user.isAnonymous,
      permissions: user.permissions,
      planTier:
        user.planTier === PLAN_TIERS.PRO ? PLAN_TIERS.PRO : PLAN_TIERS.FREE,
    }));
  },
});

export const updatePlanTier = mutation({
  args: {
    userId: v.id('users'),
    planTier: v.union(v.literal(PLAN_TIERS.FREE), v.literal(PLAN_TIERS.PRO)),
  },
  handler: async (ctx, args) => {
    const { userId: adminUserId } = await requireAdminUser(ctx);
    const startTs = Date.now();
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    await ctx.db.patch(args.userId, { planTier: args.planTier });

    console.log('user_plan_tier:updated', {
      startTs,
      durationMs: Date.now() - startTs,
      adminUserId,
      userId: args.userId,
      previousPlanTier:
        targetUser.planTier === PLAN_TIERS.PRO
          ? PLAN_TIERS.PRO
          : PLAN_TIERS.FREE,
      planTier: args.planTier,
    });

    return {
      userId: args.userId,
      planTier: args.planTier,
    };
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfileImage = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete old image if it exists
    if (user.image) {
      await ctx.storage.delete(user.image);
    }

    await ctx.db.patch(userId, { image: args.storageId });
    return await ctx.db.get(userId);
  },
});

export const getProfileImageUrl = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const targetUserId = args.userId || (await getAuthUserId(ctx));
    if (!targetUserId) {
      return null;
    }

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.image) {
      return null;
    }

    return await ctx.storage.getUrl(user.image);
  },
});

export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.image) {
      await ctx.storage.delete(user.image);
      await ctx.db.patch(userId, { image: undefined });
    }

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
