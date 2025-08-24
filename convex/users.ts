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
