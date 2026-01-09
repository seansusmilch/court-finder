'use node';
import { action } from './_generated/server';
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

const findOrCreateScan = async (
  ctx: ActionCtx,
  latitude: number,
  longitude: number,
  userId: Id<'users'>
): Promise<Id<'scans'>> => {
  const centerTile = pointToTile(latitude, longitude);
  const existingScans = await ctx.runQuery(internal.scans.findByCenterTile, {
    centerTile,
  });

  if (existingScans?.length) {
    console.log('query', {
      table: 'scans',
      index: 'by_center_tile',
      params: { centerTile },
      found: true,
      scanId: existingScans[0]._id,
      userId,
    });
    return existingScans[0]._id;
  }

  const scanId: Id<'scans'> = await ctx.runMutation(internal.scans.create, {
    centerLat: latitude,
    centerLong: longitude,
    userId,
  });
  console.log('created', {
    table: 'scans',
    scanId,
    data: { centerLat: latitude, centerLong: longitude, centerTile },
    userId,
  });
  return scanId;
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

  // Upsert inference predictions
  const predictionIds = await Promise.all(
    detections.predictions.map(async (prediction) => {
      return await ctx.runMutation(internal.inference_predictions.upsert, {
        tileId,
        model: ROBOFLOW_MODEL_NAME,
        version: ROBOFLOW_MODEL_VERSION,
        inference_id: detections.inference_id,
        prediction,
      });
    })
  );

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

    // Find or create scan
    const scanId: Id<'scans'> = await findOrCreateScan(
      ctx,
      args.latitude,
      args.longitude,
      userId
    );

    // Process all tiles
    const results: ScanResult[] = [];

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
    }

    // Log completion and return results
    console.log('complete', {
      durationMs: Date.now() - startTs,
      userId,
      input: { latitude: args.latitude, longitude: args.longitude },
      scanId,
      tilesProcessed: results.length,
      totalPredictions: results.reduce((sum, t) => {
        const detections = t.detections as RoboflowResponse;
        return sum + (detections.predictions?.length ?? 0);
      }, 0),
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
