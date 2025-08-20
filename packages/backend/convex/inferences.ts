import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';

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
    // With uniqueness, there should be at most one. If multiple, pick newest.
    matches.sort(
      (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
    );
    return matches[0];
  },
});

export const upsert = internalMutation({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.upsert] upserting', {
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      z: args.z,
      x: args.x,
      y: args.y,
    });
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
    if (matches.length > 0) {
      matches.sort(
        (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
      );
      const latest = matches[0];
      await ctx.db.patch(latest._id, {
        imageUrl: args.imageUrl,
        response: args.response,
        requestedAt: Date.now(),
      });
      return latest._id;
    }
    const id = await ctx.db.insert('inferences', {
      z: args.z,
      x: args.x,
      y: args.y,
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      requestedAt: Date.now(),
      response: args.response,
    });
    return id;
  },
});

export const getMany = internalQuery({
  args: { ids: v.array(v.id('inferences')) },
  handler: async (ctx, args) => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter(Boolean);
  },
});
