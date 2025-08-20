import { internalQuery, internalMutation, query } from './_generated/server';
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
      inferenceIds: [],
    });
    console.log('[scans.create] created', { id });
    return id;
  },
});

export const updateInferenceIds = internalMutation({
  args: {
    scanId: v.id('scans'),
    inferenceIds: v.array(v.id('inferences')),
  },
  handler: async (ctx, args) => {
    console.log('[scans.updateInferenceIds] updating', {
      scanId: args.scanId,
      count: args.inferenceIds.length,
    });
    await ctx.db.patch(args.scanId, { inferenceIds: args.inferenceIds });
    return true;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const scans = await ctx.db.query('scans').collect();
    // Sort newest first
    scans.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));
    return scans.map((s) => ({
      _id: s._id,
      centerLat: s.centerLat as number,
      centerLong: s.centerLong as number,
      query: s.query as string,
      createdAt: s.createdAt as number,
      inferenceCount: Array.isArray((s as any).inferenceIds)
        ? (s as any).inferenceIds.length
        : 0,
    }));
  },
});
