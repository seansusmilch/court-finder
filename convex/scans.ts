import { api, internal } from './_generated/api';
import { internalQuery, internalMutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  DEFAULT_TILE_RADIUS,
  PERMISSIONS,
  PLAN_TIERS,
  PRO_SCAN_FAIR_USE_LIMIT,
  ROBOFLOW_MODEL_VERSION,
  ROBOFLOW_MODEL_NAME,
  SCAN_INITIATION_RATE_LIMIT,
} from './lib/constants';
import { pointToTile } from './lib/tiles';

const SCAN_LIMIT_KEYS = {
  FREE_HOURLY: 'scan_initiation_free_hourly',
  PRO_DAILY_FAIR_USE: 'scan_initiation_pro_daily_fair_use',
} as const;

const getPlanTier = async (
  ctx: Pick<MutationCtx | QueryCtx, 'db'>,
  userId: Id<'users'>
) => {
  const user = await ctx.db.get(userId);
  return user?.planTier === PLAN_TIERS.PRO ? PLAN_TIERS.PRO : PLAN_TIERS.FREE;
};

const findScanRateLimit = async (
  ctx: Pick<MutationCtx | QueryCtx, 'db'>,
  userId: Id<'users'>,
  limitKey: string,
  planTier: (typeof PLAN_TIERS)[keyof typeof PLAN_TIERS]
) => {
  const keyed = await ctx.db
    .query('scan_rate_limits')
    .withIndex('by_user_limit_key', (q) =>
      q.eq('userId', userId).eq('limitKey', limitKey)
    )
    .first();

  if (keyed || planTier !== PLAN_TIERS.FREE) {
    return keyed;
  }

  const legacyRows = await ctx.db
    .query('scan_rate_limits')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  return legacyRows.find((row) => !row.limitKey) ?? null;
};

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
    const planTier = await getPlanTier(ctx, args.userId);
    const limitConfig =
      planTier === PLAN_TIERS.PRO
        ? PRO_SCAN_FAIR_USE_LIMIT
        : SCAN_INITIATION_RATE_LIMIT;
    const limitKey =
      planTier === PLAN_TIERS.PRO
        ? SCAN_LIMIT_KEYS.PRO_DAILY_FAIR_USE
        : SCAN_LIMIT_KEYS.FREE_HOURLY;
    const existing = await findScanRateLimit(
      ctx,
      args.userId,
      limitKey,
      planTier
    );

    if (!existing) {
      const rateLimitId = await ctx.db.insert('scan_rate_limits', {
        userId: args.userId,
        limitKey,
        windowStartMs: now,
        count: 1,
      });

      console.log('scan_rate_limit:created', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId,
        planTier,
        limitKey,
        limit: limitConfig.LIMIT,
        windowMs: limitConfig.WINDOW_MS,
        count: 1,
      });

      return {
        allowed: true,
        planTier,
        remaining: limitConfig.LIMIT - 1,
        resetAtMs: now + limitConfig.WINDOW_MS,
      };
    }

    const resetAtMs = existing.windowStartMs + limitConfig.WINDOW_MS;
    if (now >= resetAtMs) {
      await ctx.db.patch(existing._id, {
        limitKey,
        windowStartMs: now,
        count: 1,
      });

      console.log('scan_rate_limit:reset', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId: existing._id,
        planTier,
        limitKey,
        previousCount: existing.count,
        limit: limitConfig.LIMIT,
        windowMs: limitConfig.WINDOW_MS,
        count: 1,
      });

      return {
        allowed: true,
        planTier,
        remaining: limitConfig.LIMIT - 1,
        resetAtMs: now + limitConfig.WINDOW_MS,
      };
    }

    if (existing.count >= limitConfig.LIMIT) {
      const retryAfterMs = Math.max(0, resetAtMs - now);

      console.warn('scan_rate_limit:exceeded', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: args.userId,
        requestedAction: args.requestedAction,
        rateLimitId: existing._id,
        planTier,
        limitKey,
        limit: limitConfig.LIMIT,
        windowMs: limitConfig.WINDOW_MS,
        count: existing.count,
        resetAtMs,
        retryAfterMs,
      });

      throw new ConvexError({
        code: limitConfig.EXCEEDED_CODE,
        message: limitConfig.EXCEEDED_MESSAGE,
        planTier,
        limit: limitConfig.LIMIT,
        windowMs: limitConfig.WINDOW_MS,
        resetAtMs,
        retryAfterMs,
      });
    }

    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, {
      limitKey,
      count: nextCount,
    });

    console.log('scan_rate_limit:consumed', {
      startTs,
      durationMs: Date.now() - startTs,
      userId: args.userId,
      requestedAction: args.requestedAction,
      rateLimitId: existing._id,
      planTier,
      limitKey,
      limit: limitConfig.LIMIT,
      windowMs: limitConfig.WINDOW_MS,
      count: nextCount,
    });

    return {
      allowed: true,
      planTier,
      remaining: limitConfig.LIMIT - nextCount,
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
    const planTier = await getPlanTier(ctx, userId);
    const limitConfig =
      planTier === PLAN_TIERS.PRO
        ? PRO_SCAN_FAIR_USE_LIMIT
        : SCAN_INITIATION_RATE_LIMIT;
    const limitKey =
      planTier === PLAN_TIERS.PRO
        ? SCAN_LIMIT_KEYS.PRO_DAILY_FAIR_USE
        : SCAN_LIMIT_KEYS.FREE_HOURLY;
    const existing = await findScanRateLimit(ctx, userId, limitKey, planTier);

    if (!existing) {
      return {
        planTier,
        displayMode: planTier === PLAN_TIERS.PRO ? 'unlimited' : 'limited',
        limit: limitConfig.LIMIT,
        count: 0,
        remaining: limitConfig.LIMIT,
        windowMs: limitConfig.WINDOW_MS,
        resetAtMs: null,
        retryAfterMs: 0,
      };
    }

    const resetAtMs = existing.windowStartMs + limitConfig.WINDOW_MS;
    const windowExpired = now >= resetAtMs;
    const count = windowExpired ? 0 : existing.count;
    const remaining = Math.max(0, limitConfig.LIMIT - count);

    return {
      planTier,
      displayMode: planTier === PLAN_TIERS.PRO ? 'unlimited' : 'limited',
      limit: limitConfig.LIMIT,
      count,
      remaining,
      windowMs: limitConfig.WINDOW_MS,
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
