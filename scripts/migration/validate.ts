import { v } from 'convex/values';
import { query } from '../_generated/server';

export const validateMigration = query({
  args: {},
  handler: async (ctx) => {
    const migrationRecords = await ctx.db.query('user_migration').collect();
    const newUsers = await ctx.db.query('users').collect();

    const stats = {
      totalOldUsers: migrationRecords.length,
      totalNewUsers: newUsers.length,
      successfullyMigrated: 0,
      pending: 0,
      failed: 0,
      failedRecords: [] as Array<{
        oldUserId: string;
        email: string;
        failureReason: string | null;
      }>,
    };

    for (const record of migrationRecords) {
      switch (record.status) {
        case 'migrated':
          stats.successfullyMigrated++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'failed':
          stats.failed++;
          stats.failedRecords.push({
            oldUserId: record.oldUserId,
            email: record.email,
            failureReason: record.failureReason || 'Unknown error',
          });
          break;
      }
    }

    return stats;
  },
});
