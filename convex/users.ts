import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import {
  ensureCurrentUserRecord,
  getCurrentUser,
  roleHasPermissionForIdentity,
} from './lib/auth';

export const upsertFromClerk = internalMutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.id))
      .unique();

    if (existing) return existing._id;
    return await ctx.db.insert('users', { externalId: args.id });
  },
});

export const listForClerkMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.map((user) => ({
      userId: user._id,
      externalId: user.externalId ?? null,
      email: user.email ?? null,
    }));
  },
});

export const applyClerkMigrationLinks = internalMutation({
  args: {
    links: v.array(
      v.object({
        userId: v.id('users'),
        clerkUserId: v.string(),
      })
    ),
    cleanupLegacyFields: v.boolean(),
  },
  handler: async (ctx, args) => {
    const linksByUserId = new Map(
      args.links.map((link) => [link.userId, link.clerkUserId])
    );
    const users = await ctx.db.query('users').collect();

    for (const user of users) {
      const clerkUserId = user.externalId || linksByUserId.get(user._id);
      if (!clerkUserId && args.cleanupLegacyFields) {
        throw new Error(`User ${user._id} has no Clerk migration match`);
      }

      if (!clerkUserId) continue;

      if (user.externalId && user.externalId !== clerkUserId) {
        throw new Error(`User ${user._id} is already linked to another Clerk user`);
      }

      if (args.cleanupLegacyFields) {
        await ctx.db.replace(user._id, { externalId: clerkUserId });
      } else if (!user.externalId) {
        await ctx.db.patch(user._id, { externalId: clerkUserId });
      }
    }

    return {
      linkedCount: args.links.length,
      cleanedCount: args.cleanupLegacyFields ? users.length : 0,
    };
  },
});

export const disconnectFromClerk = internalMutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.id))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        externalId: undefined,
      });
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    return roleHasPermissionForIdentity(identity, args.permission);
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureCurrentUserRecord(ctx);
  },
});
