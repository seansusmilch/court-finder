import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

export const deleteByUserId = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Use type assertion since sessions table is from authTables
    const sessions = await (ctx.db as any)
      .query('sessions')
      .withIndex('by_userId', (q: any) => q.eq('userId', args.userId))
      .collect();

    for (const session of sessions) {
      await (ctx.db as any).delete(session._id);
    }
  },
});
