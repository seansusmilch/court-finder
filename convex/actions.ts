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
  const existingScans = await ctx.runQuery(internal.scans.findByCenterTile, {
    centerTile: pointToTile(latitude, longitude),
  });

  if (existingScans?.length) {
    console.log('[scanArea] reusing existing scan', {
      scanId: existingScans[0]._id,
    });
    return existingScans[0]._id;
  }

  const scanId: Id<'scans'> = await ctx.runMutation(internal.scans.create, {
    centerLat: latitude,
    centerLong: longitude,
    userId,
  });
  console.log('[scanArea] created new scan', { scanId });
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
  console.log('[scanArea] processing tile', {
    index: index + 1,
    total,
    z: tile.z,
    x: tile.x,
    y: tile.y,
    url: tile.url,
  });

  const tileId = await ctx.runMutation(internal.tiles.insertTileIfNotExists, {
    x: tile.x,
    y: tile.y,
    z: tile.z,
  });

  // Check for existing inference
  const existing = await ctx.runQuery(internal.inferences.getLatestByTileId, {
    tileId,
    model: ROBOFLOW_MODEL_NAME,
    version: ROBOFLOW_MODEL_VERSION,
  });

  let detections: RoboflowResponse = existing?.response;
  if (!detections) {
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
  console.log('[scanArea] inference ready', {
    index: index + 1,
    tileId,
    predictionsCount,
    reused: Boolean(existing),
  });

  // Upsert inference record
  const inferenceId: Id<'inferences'> = await ctx.runMutation(
    internal.inferences.upsertByTileId,
    {
      tileId,
      imageUrl: tile.url,
      model: ROBOFLOW_MODEL_NAME,
      version: ROBOFLOW_MODEL_VERSION,
      response: detections,
    }
  );

  // Upsert inference predictions
  const predictionIds = await Promise.all(
    detections.predictions.map(async (prediction) => {
      return await ctx.runMutation(internal.inference_predictions.upsert, {
        inferenceId,
        tileId,
        prediction,
      });
    })
  );

  console.log('[scanArea] upserted predictions', {
    inferenceId,
    predictionIds,
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
      throw new Error('Unauthorized');
    }

    // Validate environment variables
    const { mapboxToken, roboflowKey } = validateEnvironmentVariables();

    // Log scan start
    console.log('[scanArea] start', {
      latitude: args.latitude,
      longitude: args.longitude,
    });

    // Generate tile coverage
    const coverage = tilesInRadiusFromPoint(
      args.latitude,
      args.longitude,
      DEFAULT_TILE_RADIUS,
      undefined,
      { accessToken: mapboxToken }
    );

    console.log('[scanArea] tiles generated', {
      zoom: coverage.zoom,
      count: coverage.tiles.length,
      rows: coverage.rows,
      cols: coverage.cols,
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
    const endTs = Date.now();
    console.log('[scanArea] done', {
      scanId,
      resultsCount: results.length,
      durationMs: endTs - startTs,
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
