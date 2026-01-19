import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

export const prepareMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oldUsers = await ctx.db.query('users').collect();

    const records = [];

    for (const user of oldUsers) {
      const record = await ctx.db.insert('user_migration', {
        oldUserId: user._id,
        clerkUserId: '',
        email: user.email || '',
        permissions: user.permissions || [],
        isAnonymous: user.isAnonymous || false,
        status: 'pending',
        failureReason: undefined,
        migratedAt: undefined,
      });
      records.push({
        id: record,
        oldUserId: user._id,
        email: user.email,
        permissions: user.permissions,
        isAnonymous: user.isAnonymous,
      });
    }

    console.log(`Created ${records.length} migration records`);
    return { count: records.length, records };
  },
});
