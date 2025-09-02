import { query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  predictionToFeature,
  tilesIntersectingBbox,
  type GeoJSONPointFeature,
} from './lib/tiles';
import type { RoboflowPrediction } from './lib/roboflow';

// Get available zoom levels in the database
export const getAvailableZoomLevels = query({
  args: {},
  handler: async (ctx) => {
    // Get all tiles to find available zoom levels
    const tiles = await ctx.db.query('tiles').collect();

    const zoomLevels = [...new Set(tiles.map((tile) => tile.z))].sort(
      (a, b) => a - b
    );
    return zoomLevels;
  },
});

export const featuresByViewport = query({
  args: {
    bbox: v.object({
      minLat: v.number(),
      minLng: v.number(),
      maxLat: v.number(),
      maxLng: v.number(),
    }),
    zoom: v.number(),
    confidenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.featuresByViewport]');
    const features: GeoJSONPointFeature[] = [];

    // Get ALL predictions from database (across all models)
    const allPredictions = await ctx.db
      .query('inference_predictions')
      .collect();

    // Group by zoom level and create tile lookup map
    const zoomGroups = new Map<number, typeof allPredictions>();
    const tileMap = new Map<Id<'tiles'>, { x: number; y: number; z: number }>();

    for (const pred of allPredictions) {
      const tile = await ctx.db.get(pred.tileId);
      if (!tile) continue;

      // Store tile data for later lookup
      tileMap.set(pred.tileId, { x: tile.x, y: tile.y, z: tile.z });

      if (!zoomGroups.has(tile.z)) {
        zoomGroups.set(tile.z, []);
      }
      zoomGroups.get(tile.z)!.push(pred);
    }

    // Process each zoom level's data
    for (const [zoomLevel, zoomResults] of zoomGroups.entries()) {
      // Get tiles that intersect with the viewport at this zoom level
      const tiles = tilesIntersectingBbox(args.bbox, zoomLevel);

      for (const t of tiles) {
        // Find matching tile in this zoom level's results
        const tileMatches = zoomResults.filter((r: any) => {
          const tileData = tileMap.get(r.tileId);
          if (!tileData) return false;
          return tileData.z === t.z && tileData.x === t.x && tileData.y === t.y;
        });

        if (!tileMatches.length) continue;

        // Get the latest result for this tile (across all models)
        // Use the per-prediction records directly
        for (const pred of tileMatches) {
          const p: RoboflowPrediction = {
            x: pred.x as number,
            y: pred.y as number,
            width: pred.width as number,
            height: pred.height as number,
            confidence: pred.confidence as number,
            class: pred.class,
            class_id: (pred.classId as number | undefined) ?? -1,
            detection_id: pred.roboflowDetectionId,
          };

          if ((p.confidence ?? 0) < (args.confidenceThreshold ?? 0.5)) {
            continue;
          }

          const { point } = predictionToFeature(
            t.z,
            t.x,
            t.y,
            p,
            // Assume 1024px images for normalization since tiles are 512@2x
            1024,
            1024,
            { includePolygon: false }
          );

          point.properties = {
            ...point.properties,
            model: pred.model,
            version: pred.version,
          };

          features.push(point);
        }
      }
    }

    return { type: 'FeatureCollection', features } as const;
  },
});
