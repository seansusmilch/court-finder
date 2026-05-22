import { api, internal } from './_generated/api';
import { internalQuery, internalMutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  DEFAULT_TILE_RADIUS,
  PERMISSIONS,
  ROBOFLOW_MODEL_VERSION,
  ROBOFLOW_MODEL_NAME,
  SCAN_INITIATION_RATE_LIMIT,
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

export const consumeScanInitiation = internalMutation({
  args: {
    userId: v.id('users'),
    requestedAction: v.string(),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    const now = Date.now();
    const existing = await ctx.db
      .query('scan_rate_limits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      const rateLimitId = await ctx.db.insert('scan_rate_limits', {
        userId: args.userId,
        windowStartMs: now,
        count: 1,
      });

      console.log('scan_rate_limit:created', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId,
        limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
        count: 1,
      });

      return {
        allowed: true,
        remaining: SCAN_INITIATION_RATE_LIMIT.LIMIT - 1,
        resetAtMs: now + SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
      };
    }

    const resetAtMs =
      existing.windowStartMs + SCAN_INITIATION_RATE_LIMIT.WINDOW_MS;
    if (now >= resetAtMs) {
      await ctx.db.patch(existing._id, {
        windowStartMs: now,
        count: 1,
      });

      console.log('scan_rate_limit:reset', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId: existing._id,
        previousCount: existing.count,
        limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
        count: 1,
      });

      return {
        allowed: true,
        remaining: SCAN_INITIATION_RATE_LIMIT.LIMIT - 1,
        resetAtMs: now + SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
      };
    }

    if (existing.count >= SCAN_INITIATION_RATE_LIMIT.LIMIT) {
      const retryAfterMs = Math.max(0, resetAtMs - now);

      console.warn('scan_rate_limit:exceeded', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId: existing._id,
        limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
        count: existing.count,
        resetAtMs,
        retryAfterMs,
      });

      throw new ConvexError({
        code: SCAN_INITIATION_RATE_LIMIT.EXCEEDED_CODE,
        message: SCAN_INITIATION_RATE_LIMIT.EXCEEDED_MESSAGE,
        limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
        resetAtMs,
        retryAfterMs,
      });
    }

    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, {
      count: nextCount,
    });

    console.log('scan_rate_limit:consumed', {
      startTs,
      durationMs: Date.now() - startTs,
      userId: args.userId,
      requestedAction: args.requestedAction,
      rateLimitId: existing._id,
      limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
      windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
      count: nextCount,
    });

    return {
      allowed: true,
      remaining: SCAN_INITIATION_RATE_LIMIT.LIMIT - nextCount,
      resetAtMs,
    };
  },
});

export const getScanInitiationLimitStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const now = Date.now();
    const existing = await ctx.db
      .query('scan_rate_limits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!existing) {
      return {
        limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        count: 0,
        remaining: SCAN_INITIATION_RATE_LIMIT.LIMIT,
        windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
        resetAtMs: null,
        retryAfterMs: 0,
      };
    }

    const resetAtMs =
      existing.windowStartMs + SCAN_INITIATION_RATE_LIMIT.WINDOW_MS;
    const windowExpired = now >= resetAtMs;
    const count = windowExpired ? 0 : existing.count;
    const remaining = Math.max(0, SCAN_INITIATION_RATE_LIMIT.LIMIT - count);

    return {
      limit: SCAN_INITIATION_RATE_LIMIT.LIMIT,
      count,
      remaining,
      windowMs: SCAN_INITIATION_RATE_LIMIT.WINDOW_MS,
      resetAtMs: windowExpired ? null : resetAtMs,
      retryAfterMs: windowExpired ? 0 : Math.max(0, resetAtMs - now),
    };
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
      tilesProcessed: 0,
      predictionsFound: 0,
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

export const initializeProgress = internalMutation({
  args: {
    scanId: v.id('scans'),
    totalTiles: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      totalTiles: args.totalTiles,
      tilesProcessed: 0,
      predictionsFound: 0,
    });

    console.log('progress_initialized', {
      scanId: args.scanId,
      totalTiles: args.totalTiles,
    });
  },
});

export const updateProgress = internalMutation({
  args: {
    scanId: v.id('scans'),
    tilesProcessed: v.number(),
    predictionsFound: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      tilesProcessed: args.tilesProcessed,
      predictionsFound: args.predictionsFound,
    });

    console.log('progress_updated', {
      scanId: args.scanId,
      tilesProcessed: args.tilesProcessed,
      predictionsFound: args.predictionsFound,
    });
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

export const getProgress = query({
  args: {
    scanId: v.id('scans'),
  },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      return null;
    }

    return {
      totalTiles: scan.totalTiles,
      tilesProcessed: scan.tilesProcessed,
      predictionsFound: scan.predictionsFound,
      isComplete: scan.totalTiles !== undefined && scan.tilesProcessed === scan.totalTiles,
    };
  },
});
