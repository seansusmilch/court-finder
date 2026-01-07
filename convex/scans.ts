import { api, internal } from './_generated/api';
import { internalQuery, internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import {
  DEFAULT_TILE_RADIUS,
  PERMISSIONS,
  ROBOFLOW_MODEL_VERSION,
  ROBOFLOW_MODEL_NAME,
} from './lib/constants';
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
    const scans = await ctx.db
      .query('scans')
      .withIndex('by_center_tile', (q) => q.eq('centerTile', args.centerTile))
      .collect();

    console.log('query', {
      table: 'scans',
      index: 'by_center_tile',
      params: { centerTile: args.centerTile },
      found: scans.length > 0,
      count: scans.length,
      scanIds: scans.map((s) => s._id),
    });

    return scans;
  },
});

export const create = internalMutation({
  args: {
    centerLat: v.number(),
    centerLong: v.number(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const centerTile = pointToTile(args.centerLat, args.centerLong);
    const id = await ctx.db.insert('scans', {
      centerLat: args.centerLat,
      centerLong: args.centerLong,
      centerTile,
      model: ROBOFLOW_MODEL_NAME,
      version: ROBOFLOW_MODEL_VERSION,
      radius: DEFAULT_TILE_RADIUS,
      userId: args.userId,
    });

    console.log('created', {
      table: 'scans',
      scanId: id,
      data: {
        centerLat: args.centerLat,
        centerLong: args.centerLong,
        centerTile,
        model: ROBOFLOW_MODEL_NAME,
        version: ROBOFLOW_MODEL_VERSION,
        radius: DEFAULT_TILE_RADIUS,
      },
      userId: args.userId,
    });

    return id;
  },
});

export const listAll = query({
  args: {},
  handler: async (
    ctx
  ): Promise<
    Array<{
      _id: any;
      centerLat: number;
      centerLong: number;
      tileCount: number;
      createdAt: number;
    }>
  > => {
    const canViewScans = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.READ,
    });
    if (!canViewScans) {
      throw new Error('Unauthorized');
    }
    const scans = await ctx.db.query('scans').collect();
    // Sort newest first
    scans.sort((a, b) => b._creationTime - a._creationTime);
    return await Promise.all(
      scans.map(async (s) => ({
        _id: s._id,
        centerLat: s.centerLat as number,
        centerLong: s.centerLong as number,
        tileCount: await ctx
          .runQuery(internal.scans_x_tiles.getTilesForScan, {
            scanId: s._id,
          })
          .then((tiles) => tiles.length),
        createdAt: s._creationTime as number,
      }))
    );
  },
});
