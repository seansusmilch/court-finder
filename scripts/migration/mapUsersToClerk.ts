import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

export const mapUserToClerk = internalMutation({
  args: {
    oldUserId: v.id('users'),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const migrationRecords = await ctx.db
      .query('user_migration')
      .withIndex('by_old_user', (q) => q.eq('oldUserId', args.oldUserId))
      .collect();

    for (const record of migrationRecords) {
      await ctx.db.patch(record._id, {
        clerkUserId: args.clerkUserId,
        status: 'migrated',
        migratedAt: Date.now(),
      });
    }

    return { success: true, count: migrationRecords.length };
  },
});

export const mapUsersBulk = internalMutation({
  args: {
    mappings: v.array(
      v.object({
        oldUserId: v.id('users'),
        clerkUserId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let successCount = 0;

    for (const mapping of args.mappings) {
      const migrationRecords = await ctx.db
        .query('user_migration')
        .withIndex('by_old_user', (q) =>
          q.eq('oldUserId', mapping.oldUserId)
        )
        .collect();

      for (const record of migrationRecords) {
        await ctx.db.patch(record._id, {
          clerkUserId: mapping.clerkUserId,
          status: 'migrated',
          migratedAt: Date.now(),
        });
        successCount++;
      }
    }

    return { success: true, count: successCount };
  },
});
