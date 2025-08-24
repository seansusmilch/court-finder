import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { detectObjectsWithRoboflow, tilesInRadiusFromPoint } from './lib';
import {
  PERMISSIONS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
  DEFAULT_TILE_RADIUS_KM,
  ENV_VARS,
} from './lib/constants';

export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const canScan = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.EXECUTE,
    });
    if (!canScan) {
      throw new Error('Unauthorized');
    }

    const MODEL_NAME = ROBOFLOW_MODEL_NAME;
    const MODEL_VERSION = ROBOFLOW_MODEL_VERSION;
    const startTs = Date.now();
    console.log('[scanArea] start', {
      latitude: args.latitude,
      longitude: args.longitude,
      query: args.query ?? '',
    });
    const mapboxToken = process.env[ENV_VARS.MAPBOX_API_KEY];
    const roboflowKey = process.env[ENV_VARS.ROBOFLOW_API_KEY];

    if (!mapboxToken) {
      throw new Error('Missing MAPBOX_API_KEY environment variable');
    }
    if (!roboflowKey) {
      throw new Error('Missing ROBOFLOW_API_KEY environment variable');
    }

    const radius = DEFAULT_TILE_RADIUS_KM;
    const coverage = tilesInRadiusFromPoint(
      args.latitude,
      args.longitude,
      radius,
      undefined,
      {
        accessToken: mapboxToken,
      }
    );
    console.log('[scanArea] tiles generated', {
      zoom: coverage.zoom,
      count: coverage.tiles.length,
      rows: coverage.rows,
      cols: coverage.cols,
    });

    // Look for an existing scan with same center & query
    const existingScans: any[] = await ctx.runQuery(
      internal.scans.findByCenter,
      {
        centerLat: args.latitude,
        centerLong: args.longitude,
        query: args.query ?? '',
      }
    );
    let scanId: any = existingScans?.length ? existingScans[0]._id : undefined;
    console.log('[scanArea] existing scan lookup', {
      foundCount: existingScans?.length ?? 0,
      reusedScanId: scanId ?? null,
    });

    if (!scanId) {
      scanId = await ctx.runMutation(internal.scans.create, {
        centerLat: args.latitude,
        centerLong: args.longitude,
      });
      console.log('[scanArea] created new scan', { scanId });
    }

    // Build results by reusing or running inference per tile
    const results: Array<{
      z: number;
      x: number;
      y: number;
      url: string;
      detections: unknown;
    }> = [];
    const scanTiles: Array<{ z: number; x: number; y: number }> = [];

    for (let i = 0; i < coverage.tiles.length; i++) {
      const tile = coverage.tiles[i];
      console.log('[scanArea] processing tile', {
        index: i + 1,
        total: coverage.tiles.length,
        z: tile.z,
        x: tile.x,
        y: tile.y,
        url: tile.url,
      });

      // Check if we've already scanned this tile with the same model/version
      const cached: any = await ctx.runQuery(
        internal.inferences.getLatestByTile,
        {
          z: tile.z,
          x: tile.x,
          y: tile.y,
          model: MODEL_NAME,
          version: MODEL_VERSION,
        }
      );

      let detections: unknown = cached?.response;
      if (!detections) {
        detections = await detectObjectsWithRoboflow(
          tile.url,
          roboflowKey,
          MODEL_NAME,
          MODEL_VERSION
        );
      }

      const predictionsCount = Array.isArray((detections as any)?.predictions)
        ? (detections as any).predictions.length
        : undefined;
      console.log('[scanArea] inference ready', {
        index: i + 1,
        predictionsCount,
        reused: Boolean(cached),
      });

      // Upsert inference record
      await ctx.runMutation(internal.inferences.upsert, {
        z: tile.z,
        x: tile.x,
        y: tile.y,
        imageUrl: tile.url,
        model: MODEL_NAME,
        version: MODEL_VERSION,
        response: detections,
      });

      // Store tile coordinates (without URL) in scan
      scanTiles.push({ z: tile.z, x: tile.x, y: tile.y });

      results.push({
        z: tile.z,
        x: tile.x,
        y: tile.y,
        url: tile.url,
        detections,
      });
    }

    // Store tile coordinates on the scan
    await ctx.runMutation(internal.scans.updateTiles, {
      scanId,
      tiles: scanTiles,
    });

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
