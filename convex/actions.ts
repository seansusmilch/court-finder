'use node';
import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  detectObjectsWithRoboflow,
  pointToTile,
  tilesInRadiusFromPoint,
} from './lib';
import type { RoboflowResponse } from './lib/roboflow';
import type { ActionCtx } from './_generated/server';
import type { TileCoordinate } from './lib/tiles';
import {
  PERMISSIONS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
  DEFAULT_TILE_RADIUS,
  ENV_VARS,
} from './lib/constants';
import { getAuthUserId } from '@convex-dev/auth/server';

// Types
type ScanResult = {
  z: number;
  x: number;
  y: number;
  url: string;
  detections: unknown;
};

type ScanTile = {
  z: number;
  x: number;
  y: number;
};

type ScanAreaArgs = {
  latitude: number;
  longitude: number;
};

type ScanAreaReturn = {
  scanId: Id<'scans'>;
  zoom: number;
  cols: number;
  rows: number;
  tiles: ScanResult[];
};

// Helper functions
const validateEnvironmentVariables = (): {
  mapboxToken: string;
  roboflowKey: string;
} => {
  const mapboxToken = process.env[ENV_VARS.MAPBOX_API_KEY];
  const roboflowKey = process.env[ENV_VARS.ROBOFLOW_API_KEY];

  if (!mapboxToken) {
    throw new Error('Missing MAPBOX_API_KEY environment variable');
  }
  if (!roboflowKey) {
    throw new Error('Missing ROBOFLOW_API_KEY environment variable');
  }

  return { mapboxToken, roboflowKey };
};

type TileWithUrl = TileCoordinate & { url: string };

const processTile = async (
  ctx: ActionCtx,
  tile: TileWithUrl,
  index: number,
  total: number,
  roboflowKey: string
): Promise<{ result: ScanResult; scanTile: ScanTile }> => {
  const tileStartTs = Date.now();

  console.log('tile:start', {
    index: index + 1,
    total,
    progress: `${Math.round((index / total) * 100)}%`,
    tile: { z: tile.z, x: tile.x, y: tile.y },
    url: tile.url.substring(0, 100),
  });

  const tileId = await ctx.runMutation(internal.tiles.insertTileIfNotExists, {
    x: tile.x,
    y: tile.y,
    z: tile.z,
  });

  // Reuse existing predictions for this tile/model/version if available
  const existingPredictions = await ctx.runQuery(
    internal.inference_predictions.listByTileModelVersion,
    {
      tileId,
      model: ROBOFLOW_MODEL_NAME,
      version: ROBOFLOW_MODEL_VERSION,
    }
  );

  console.log('query', {
    table: 'inference_predictions',
    index: 'by_tile_model_version',
    params: { tileId, model: ROBOFLOW_MODEL_NAME, version: ROBOFLOW_MODEL_VERSION },
    found: existingPredictions.length > 0,
    predictionsCount: existingPredictions.length,
  });

  let detections: RoboflowResponse;
  if (existingPredictions.length > 0) {
    detections = {
      image: { width: 1024, height: 1024 },
      predictions: existingPredictions.map((p) => ({
        x: p.x as number,
        y: p.y as number,
        width: p.width as number,
        height: p.height as number,
        confidence: p.confidence as number,
        class: p.class,
        class_id: p.classId as number | undefined,
        detection_id: p.roboflowDetectionId,
      })),
      time: Date.now(),
      inference_id: existingPredictions[0].roboflowInferenceId || 'cached',
    } as RoboflowResponse;
  } else {
    detections = await detectObjectsWithRoboflow(
      tile.url,
      roboflowKey,
      ROBOFLOW_MODEL_NAME,
      ROBOFLOW_MODEL_VERSION
    );
  }

  const predictionsCount = Array.isArray(detections.predictions)
    ? detections.predictions.length
    : undefined;

  // Upsert inference predictions sequentially to avoid concurrency conflicts
  const predictionIds: Id<'inference_predictions'>[] = [];
  for (const prediction of detections.predictions) {
    const id = await ctx.runMutation(internal.inference_predictions.upsert, {
      tileId,
      model: ROBOFLOW_MODEL_NAME,
      version: ROBOFLOW_MODEL_VERSION,
      inference_id: detections.inference_id,
      prediction,
    });
    predictionIds.push(id);
  }

  console.log('tile:complete', {
    index: index + 1,
    total,
    tileId,
    predictionsCount,
    reusedCache: existingPredictions.length > 0,
    durationMs: Date.now() - tileStartTs,
  });

  return {
    result: {
      z: tile.z,
      x: tile.x,
      y: tile.y,
      url: tile.url,
      detections,
    },
    scanTile: { z: tile.z, x: tile.x, y: tile.y },
  };
};

export const startScanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args: ScanAreaArgs): Promise<{ scanId: Id<'scans'> }> => {
    // Validate permissions
    const canScan = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.EXECUTE,
    });
    const userId = await getAuthUserId(ctx);
    if (!canScan || !userId) {
      console.error('error: unauthorized', {
        userId,
        canScan,
        permission: PERMISSIONS.SCANS.EXECUTE,
        requestedAction: 'startScanArea',
      });
      throw new Error('Unauthorized');
    }

    // Validate environment variables
    const { mapboxToken } = validateEnvironmentVariables();

    // Generate tile coverage
    const coverage = tilesInRadiusFromPoint(
      args.latitude,
      args.longitude,
      DEFAULT_TILE_RADIUS,
      undefined,
      { accessToken: mapboxToken }
    );

    // Create new scan
    const scanId: Id<'scans'> = await ctx.runMutation(internal.scans.create, {
      centerLat: args.latitude,
      centerLong: args.longitude,
      userId,
    });

    // Initialize scan progress
    await ctx.runMutation(internal.scans.initializeProgress, {
      scanId,
      totalTiles: coverage.tiles.length,
    });

    // Schedule the scan to run in background
    await ctx.scheduler.runAfter(0, internal.actions.processScanArea, {
      scanId,
      latitude: args.latitude,
      longitude: args.longitude,
    });

    console.log('scan_started', {
      scanId,
      userId,
      latitude: args.latitude,
      longitude: args.longitude,
      totalTiles: coverage.tiles.length,
    });

    return { scanId };
  },
});

export const processScanArea = internalAction({
  args: {
    scanId: v.id('scans'),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx: ActionCtx, args) => {
    const startTs = Date.now();

    // Validate environment variables
    const { mapboxToken, roboflowKey } = validateEnvironmentVariables();

    // Generate tile coverage (same as startScanArea)
    const coverage = tilesInRadiusFromPoint(
      args.latitude,
      args.longitude,
      DEFAULT_TILE_RADIUS,
      undefined,
      { accessToken: mapboxToken }
    );

    console.log('processing_scan', {
      scanId: args.scanId,
      totalTiles: coverage.tiles.length,
    });

    // Process all tiles
    const results: ScanResult[] = [];
    let totalPredictionsFound = 0;

    for (let i = 0; i < coverage.tiles.length; i++) {
      const tileId = await ctx.runMutation(
        internal.tiles.insertTileIfNotExists,
        {
          x: coverage.tiles[i].x,
          y: coverage.tiles[i].y,
          z: coverage.tiles[i].z,
        }
      );
      // Ensure scan<->tile relationship exists
      await ctx.runMutation(
        internal.scans_x_tiles.insertScanTileRelationshipIfNotExists,
        {
          scanId: args.scanId,
          tileId,
        }
      );
      const { result } = await processTile(
        ctx,
        coverage.tiles[i],
        i,
        coverage.tiles.length,
        roboflowKey
      );

      results.push(result);

      // Update progress
      const detections = result.detections as RoboflowResponse;
      const predictionsCount = detections.predictions?.length ?? 0;
      totalPredictionsFound += predictionsCount;

      await ctx.runMutation(internal.scans.updateProgress, {
        scanId: args.scanId,
        tilesProcessed: i + 1,
        predictionsFound: totalPredictionsFound,
      });
    }

    // Log completion
    console.log('scan_complete', {
      durationMs: Date.now() - startTs,
      scanId: args.scanId,
      tilesProcessed: results.length,
      totalPredictions: totalPredictionsFound,
    });
  },
});

export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args: ScanAreaArgs): Promise<ScanAreaReturn> => {
    const startTs = Date.now();

    // Validate permissions
    const canScan = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.EXECUTE,
    });
    const userId = await getAuthUserId(ctx);
    if (!canScan || !userId) {
      console.error('error: unauthorized', {
        userId,
        canScan,
        permission: PERMISSIONS.SCANS.EXECUTE,
        requestedAction: 'scanArea',
      });
      throw new Error('Unauthorized');
    }

    // Validate environment variables
    const { mapboxToken, roboflowKey } = validateEnvironmentVariables();

    // Log scan start
    console.log('start', {
      startTs,
      userId,
      latitude: args.latitude,
      longitude: args.longitude,
      centerTile: pointToTile(args.latitude, args.longitude),
    });

    // Generate tile coverage
    const coverage = tilesInRadiusFromPoint(
      args.latitude,
      args.longitude,
      DEFAULT_TILE_RADIUS,
      undefined,
      { accessToken: mapboxToken }
    );

    console.log('processing tiles', {
      totalTiles: coverage.tiles.length,
      zoom: coverage.zoom,
      gridSize: { rows: coverage.rows, cols: coverage.cols },
    });

    // Create new scan (always create fresh scan for progress tracking)
    const scanId: Id<'scans'> = await ctx.runMutation(internal.scans.create, {
      centerLat: args.latitude,
      centerLong: args.longitude,
      userId,
    });

    // Initialize scan progress
    await ctx.runMutation(internal.scans.initializeProgress, {
      scanId,
      totalTiles: coverage.tiles.length,
    });

    // Process all tiles
    const results: ScanResult[] = [];
    let totalPredictionsFound = 0;

    for (let i = 0; i < coverage.tiles.length; i++) {
      const tileId = await ctx.runMutation(
        internal.tiles.insertTileIfNotExists,
        {
          x: coverage.tiles[i].x,
          y: coverage.tiles[i].y,
          z: coverage.tiles[i].z,
        }
      );
      // Ensure scan<->tile relationship exists
      await ctx.runMutation(
        internal.scans_x_tiles.insertScanTileRelationshipIfNotExists,
        {
          scanId,
          tileId,
        }
      );
      const { result, scanTile } = await processTile(
        ctx,
        coverage.tiles[i],
        i,
        coverage.tiles.length,
        roboflowKey
      );

      results.push(result);

      // Update progress
      const detections = result.detections as RoboflowResponse;
      const predictionsCount = detections.predictions?.length ?? 0;
      totalPredictionsFound += predictionsCount;

      await ctx.runMutation(internal.scans.updateProgress, {
        scanId,
        tilesProcessed: i + 1,
        predictionsFound: totalPredictionsFound,
      });
    }

    // Log completion and return results
    console.log('complete', {
      durationMs: Date.now() - startTs,
      userId,
      input: { latitude: args.latitude, longitude: args.longitude },
      scanId,
      tilesProcessed: results.length,
      totalPredictions: totalPredictionsFound,
      tilesFromCache: results.filter((t) => {
        // This is approximate - we'd need to track this better
        return false;
      }).length,
      tilesNewlyScanned: results.length,
    });

    return {
      scanId,
      zoom: coverage.zoom,
      cols: coverage.cols,
      rows: coverage.rows,
      tiles: results,
    };
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.runQuery(api.users.me, {});
    if (!user || !user.email) {
      throw new Error('User not found or no email');
    }

    // Import password utilities
    const { verifyPassword, hashPassword } = await import('./actions/password');

    // Get account info using mutation (since we can't query accounts directly from action)
    const accountInfo = await ctx.runMutation(api.users._changePasswordInternal, {
      userId,
    });

    if (!accountInfo) {
      throw new Error('Account not found');
    }

    // Verify current password
    const isValid = await verifyPassword(
      args.currentPassword,
      accountInfo.hashedPassword
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await hashPassword(args.newPassword);

    // Update account with new password
    await ctx.runMutation(api.users._updateAccountPassword, {
      accountId: accountInfo.accountId,
      hashedPassword: newHashedPassword,
    });

    return { success: true };
  },
});
