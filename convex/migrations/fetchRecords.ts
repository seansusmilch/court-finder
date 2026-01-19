import { v } from 'convex/values';
import { query } from '../_generated/server';

export const fetchRecords = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query('user_migration').collect();
    return records;
  },
});
