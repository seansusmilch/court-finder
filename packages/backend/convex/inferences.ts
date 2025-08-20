import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const getByScan = internalQuery({
  args: {
    scanId: v.id('scans'),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.getByScan] scanId', args.scanId);
    return await ctx.db
      .query('inferences')
      .withIndex('by_scan', (q) => q.eq('scanId', args.scanId))
      .collect();
  },
});

export const getLatestByTile = internalQuery({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.getLatestByTile] tile', args);
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tile', (q) =>
        q
          .eq('z', args.z)
          .eq('x', args.x)
          .eq('y', args.y)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
    if (!matches.length) return null;
    // Return the most recent by requestedAt
    matches.sort(
      (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
    );
    return matches[0];
  },
});

export const create = internalMutation({
  args: {
    scanId: v.id('scans'),
    z: v.number(),
    x: v.number(),
    y: v.number(),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.create] creating inference', {
      scanId: args.scanId,
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
    });
    const id = await ctx.db.insert('inferences', {
      scanId: args.scanId,
      z: args.z,
      x: args.x,
      y: args.y,
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      requestedAt: Date.now(),
      response: args.response,
    });
    console.log('[inferences.create] created', { id });
    return id;
  },
});
