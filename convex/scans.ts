import { api } from './_generated/api';
import { internalQuery, internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import { PERMISSIONS } from './lib/constants';
import { pointToTile } from './lib/tiles';

export const findByCenterTile = internalQuery({
  args: {
    centerTile: v.object({
      z: v.number(),
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    console.log('[scans.findByCenterTile] args', args);
    return await ctx.db
      .query('scans')
      .withIndex('by_center_tile', (q) => q.eq('centerTile', args.centerTile))
      .collect();
  },
});

export const create = internalMutation({
  args: {
    centerLat: v.number(),
    centerLong: v.number(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    console.log('[scans.create] creating scan', args);

    const id = await ctx.db.insert('scans', {
      centerLat: args.centerLat,
      centerLong: args.centerLong,
      centerTile: pointToTile(args.centerLat, args.centerLong),
      tiles: [],
      userId: args.userId,
    });
    console.log('[scans.create] created', { id });
    return id;
  },
});

export const updateTiles = internalMutation({
  args: {
    scanId: v.id('scans'),
    tiles: v.array(v.object({ z: v.number(), x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    console.log('[scans.updateTiles] updating', {
      scanId: args.scanId,
      count: args.tiles.length,
    });
    await ctx.db.patch(args.scanId, {
      tiles: args.tiles,
    });
    return true;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const canViewScans = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.READ,
    });
    if (!canViewScans) {
      throw new Error('Unauthorized');
    }
    const scans = await ctx.db.query('scans').collect();
    // Sort newest first
    scans.sort(
      (a, b) => (b._creationTime as number) - (a._creationTime as number)
    );
    return scans.map((s) => ({
      _id: s._id,
      centerLat: s.centerLat as number,
      centerLong: s.centerLong as number,
      tileCount: s.tiles.length,
      createdAt: s._creationTime as number,
    }));
  },
});
