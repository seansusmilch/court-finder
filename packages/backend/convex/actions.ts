import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { detectObjectsWithRoboflow, tilesInRadiusFromPoint } from './lib';

export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    console.log('[scanArea] start', {
      latitude: args.latitude,
      longitude: args.longitude,
      query: args.query ?? '',
    });
    const mapboxToken = process.env.MAPBOX_API_KEY;
    const roboflowKey = process.env.ROBOFLOW_API_KEY;

    if (!mapboxToken) {
      throw new Error('Missing MAPBOX_API_KEY environment variable');
    }
    if (!roboflowKey) {
      throw new Error('Missing ROBOFLOW_API_KEY environment variable');
    }

    const radius = 1;
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
        query: args.query ?? '',
      });
      console.log('[scanArea] created new scan', { scanId });
    }

    // Check for existing inferences for this scan
    const existingInferences: any[] = await ctx.runQuery(
      internal.inferences.getByScan,
      {
        scanId,
      }
    );
    console.log('[scanArea] existing inferences', {
      foundCount: existingInferences?.length ?? 0,
    });

    let results: Array<{
      z: number;
      x: number;
      y: number;
      url: string;
      detections: unknown;
    }> = [];
    if (
      existingInferences &&
      existingInferences.length === coverage.tiles.length
    ) {
      results = existingInferences.map((inf: any) => ({
        z: inf.z,
        x: inf.x,
        y: inf.y,
        url: inf.imageUrl,
        detections: inf.response,
      }));
      console.log('[scanArea] reusing cached inferences', {
        count: results.length,
      });
    } else {
      results = [];
      for (let i = 0; i < coverage.tiles.length; i++) {
        const tile = coverage.tiles[i];
        console.log('[scanArea] inferring', {
          index: i + 1,
          total: coverage.tiles.length,
          z: tile.z,
          x: tile.x,
          y: tile.y,
          url: tile.url,
        });
        const detections = await detectObjectsWithRoboflow(
          tile.url,
          roboflowKey
        );
        const predictionsCount = Array.isArray((detections as any)?.predictions)
          ? (detections as any).predictions.length
          : undefined;
        console.log('[scanArea] inference complete', {
          index: i + 1,
          predictionsCount,
        });
        results.push({
          z: tile.z,
          x: tile.x,
          y: tile.y,
          url: tile.url,
          detections,
        });
        // store inference per sub-box
        await ctx.runMutation(internal.inferences.create, {
          scanId,
          z: tile.z,
          x: tile.x,
          y: tile.y,
          imageUrl: tile.url,
          model: 'satellite-sports-facilities-bubrg',
          version: '4',
          response: detections,
        });
        console.log('[scanArea] inference stored', {
          index: i + 1,
          z: tile.z,
          x: tile.x,
          y: tile.y,
        });
      }
    }

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
