import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { DEFAULT_USER_PERMISSIONS } from './lib/constants';
import {
  ensureCurrentUserRecord,
  getCurrentUser,
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

export const exportForClerkMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();

    return users
      .filter((user) => !user.externalId && user.email)
      .map((user) => {
        const [firstName, ...lastNameParts] = (user.name || '').trim().split(/\s+/);
        return {
          userId: user._id,
          email: user.email!,
          firstName: firstName || undefined,
          lastName: lastNameParts.join(' ') || undefined,
          role: user.role || ROLES.USER,
        };
      });
  },
});

export const clerkMigrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    const emailCounts = new Map<string, number>();

    for (const user of users) {
      if (!user.email) continue;
      const email = user.email.toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    }

    return {
      totalUsers: users.length,
      linkedToClerk: users.filter((user) => !!user.externalId).length,
      awaitingClerkLink: users.filter((user) => !user.externalId && !!user.email).length,
      missingEmail: users.filter((user) => !user.email).length,
      duplicateEmails: [...emailCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([email, count]) => ({ email, count })),
    };
  },
});

export const upsertFromClerk = internalMutation({
  args: {
    id: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    role: v.optional(ROLE_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const email = args.emailVerified === true ? args.email?.toLowerCase() : undefined;
    const now = Date.now();
    const byExternalId = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.id))
      .unique();
    const existing =
      byExternalId ||
      (email
        ? await ctx.db
            .query('users')
            .withIndex('email', (q) => q.eq('email', email))
            .unique()
        : null);

    if (existing?.externalId && existing.externalId !== args.id) {
      throw new Error('Email is already linked to another Clerk user');
    }

    const name = [args.firstName, args.lastName].filter(Boolean).join(' ') || undefined;
    // Do not create an unlinked row before verification: it would prevent the
    // later verified event from linking the original legacy account.
    if (!existing && !email) return null;

    const role = args.role || existing?.role ||
      (existing?.permissions?.includes('admin.access') ? ROLES.ADMIN : ROLES.USER);
    const updates = {
      externalId: args.id,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      emailVerified: args.emailVerified ?? existing?.emailVerified,
      isAnonymous: false,
      permissions: args.role === undefined
        ? Array.from(new Set([...(existing?.permissions || []), ...ROLE_PERMISSIONS[role]]))
        : [...ROLE_PERMISSIONS[role]],
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
        updatedAt: Date.now(),
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
