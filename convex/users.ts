import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { DEFAULT_USER_PERMISSIONS } from './lib/constants';
import {
  ensureCurrentUserRecord,
  getCurrentUser,
  getCurrentUserId,
  requireCurrentUser,
} from './lib/auth';

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: [...DEFAULT_USER_PERMISSIONS],
  [ROLES.ADMIN]: [...DEFAULT_USER_PERMISSIONS, 'admin.access'],
} as const;

const ROLE_VALIDATOR = v.union(v.literal(ROLES.USER), v.literal(ROLES.ADMIN));

export const upsertFromClerk = internalMutation({
  args: {
    id: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(ROLE_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.id))
      .unique();

    const name = [args.firstName, args.lastName].filter(Boolean).join(' ') || undefined;
    const role = args.role || ROLES.USER;
    const updates = {
      externalId: args.id,
      name,
      email: args.email,
      imageUrl: args.imageUrl,
      emailVerified: !!args.email,
      isAnonymous: false,
      permissions: [...ROLE_PERMISSIONS[role]],
      role,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert('users', {
      ...updates,
      createdAt: now,
    });
  },
});

export const deleteFromClerk = internalMutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.id))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const hasPermission = query({
  args: {
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return !!user?.permissions?.includes(args.permission);
  },
});

export const ensureDefaultPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ensureCurrentUserRecord(ctx);
    if (!user) return null;
    await ctx.db.patch(user._id, {
      permissions: Array.from(
        new Set([...(user.permissions || []), ...DEFAULT_USER_PERMISSIONS])
      ),
      role: user.role || 'user',
      updatedAt: Date.now(),
    });
    return await ctx.db.get(user._id);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const updates: { name?: string } = {};
    if (args.name !== undefined) {
      updates.name = args.name || undefined;
    }

    await ctx.db.patch(user._id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(user._id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfileImage = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Delete old image if it exists
    if (user.image) {
      await ctx.storage.delete(user.image);
    }

    await ctx.db.patch(user._id, { image: args.storageId, updatedAt: Date.now() });
    return await ctx.db.get(user._id);
  },
});

export const getProfileImageUrl = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const targetUserId = args.userId || (await getCurrentUserId(ctx));
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
    const user = await requireCurrentUser(ctx);

    if (user.image) {
      await ctx.storage.delete(user.image);
      await ctx.db.patch(user._id, { image: undefined, updatedAt: Date.now() });
    }

    return await ctx.db.get(user._id);
  },
});
