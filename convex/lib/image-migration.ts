import { v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';

export const migrateProfileImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const migrationRecords = await ctx.db.query('user_migration').collect();

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: { oldUserId: string; error: string }[] = [];

    for (const record of migrationRecords) {
      if (record.status !== 'migrated') {
        skippedCount++;
        continue;
      }

      const oldUser = await ctx.db.get(record.oldUserId);
      if (!oldUser?.image) {
        skippedCount++;
        continue;
      }

      const newUser = await ctx.db
        .query('users')
        .withIndex('by_external_id', (q: any) => q.eq('externalId', record.clerkUserId))
        .unique();

      if (!newUser) {
        errors.push({ oldUserId: record.oldUserId, error: 'New user not found' });
        continue;
      }

      if (newUser.image) {
        skippedCount++;
        continue;
      }

      await ctx.db.patch(newUser._id, {
        image: oldUser.image,
      });

      migratedCount++;
      console.log(`Migrated profile image for user: ${record.email}`);
    }

    return {
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors,
    };
  },
});

export const setNewImageUrl = mutation({
  args: {
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q: any) => q.eq('externalId', userId.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      image: args.storageId,
    });

    return await ctx.db.get(user._id);
  },
});

export const getProfileImageUrl = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q: any) => q.eq('externalId', userId.subject))
      .unique();

    if (!user || !user.image) {
      return user?.imageUrl || null;
    }

    return await ctx.storage.getUrl(user.image);
  },
});
