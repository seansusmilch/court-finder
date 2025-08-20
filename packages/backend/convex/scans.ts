import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const findByCenter = internalQuery({
  args: {
    centerLat: v.number(),
    centerLong: v.number(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[scans.findByCenter] args', args);
    return await ctx.db
      .query('scans')
      .withIndex('by_center_query', (q) =>
        q
          .eq('centerLat', args.centerLat)
          .eq('centerLong', args.centerLong)
          .eq('query', args.query)
      )
      .collect();
  },
});

export const create = internalMutation({
  args: {
    centerLat: v.number(),
    centerLong: v.number(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[scans.create] creating scan', args);
    const id = await ctx.db.insert('scans', {
      centerLat: args.centerLat,
      centerLong: args.centerLong,
      query: args.query,
      createdAt: Date.now(),
    });
    console.log('[scans.create] created', { id });
    return id;
  },
});
