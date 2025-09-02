import { internalQuery, internalMutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  predictionToFeature,
  tilesIntersectingBbox,
  type GeoJSONPointFeature,
} from './lib/tiles';
import type { RoboflowPrediction, RoboflowResponse } from './lib/roboflow';

export const getLatestByTile = internalQuery({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.getLatestByTile] tile', args);

    // First find the tile
    const tile = await ctx.db
      .query('tiles')
      .withIndex('by_tile', (q) =>
        q.eq('x', args.x).eq('y', args.y).eq('z', args.z)
      )
      .first();

    if (!tile) return null;

    // Then find inferences for this tile
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tileId', (q) =>
        q
          .eq('tileId', tile._id)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
    if (!matches.length) return null;
    // With uniqueness, there should be at most one. If multiple, pick newest.
    matches.sort(
      (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
    );
    return matches[0];
  },
});

export const getLatestByTileId = internalQuery({
  args: {
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.getLatestByTileId] tileId', args);
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tileId', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
    if (!matches.length) return null;
    matches.sort(
      (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
    );
    return matches[0];
  },
});

export const upsert = internalMutation({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.upsert] upserting', {
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      z: args.z,
      x: args.x,
      y: args.y,
    });

    // Find or create the tile record
    let tileId: Id<'tiles'>;
    const existingTile = await ctx.db
      .query('tiles')
      .withIndex('by_tile', (q) =>
        q.eq('x', args.x).eq('y', args.y).eq('z', args.z)
      )
      .first();

    if (existingTile) {
      tileId = existingTile._id;
    } else {
      tileId = await ctx.db.insert('tiles', {
        x: args.x,
        y: args.y,
        z: args.z,
      });
    }

    // Look for existing inference using the new by_tileId index
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tileId', (q) =>
        q
          .eq('tileId', tileId)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();

    if (matches.length > 0) {
      matches.sort(
        (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
      );
      const latest = matches[0];
      await ctx.db.patch(latest._id, {
        imageUrl: args.imageUrl,
        response: args.response,
        requestedAt: Date.now(),
      });
      return latest._id;
    }

    // Create new inference record
    const id = await ctx.db.insert('inferences', {
      tileId: tileId,
      model: args.model,
      version: args.version,
      response: args.response,
      imageUrl: args.imageUrl,
    });
    return id;
  },
});

export const upsertByTileId = internalMutation({
  args: {
    tileId: v.id('tiles'),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.upsertByTileId] upserting', {
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      tileId: args.tileId,
    });

    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tileId', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();

    if (matches.length > 0) {
      matches.sort(
        (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
      );
      const latest = matches[0];
      await ctx.db.patch(latest._id, {
        imageUrl: args.imageUrl,
        response: args.response,
        requestedAt: Date.now(),
      });
      return latest._id;
    }

    const tile = await ctx.db.get(args.tileId);
    if (!tile) throw new Error('Tile not found for tileId');

    const id = await ctx.db.insert('inferences', {
      tileId: args.tileId,
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      requestedAt: Date.now(),
      response: args.response,
      // include legacy fields for now to satisfy schema
      z: tile.z,
      x: tile.x,
      y: tile.y,
    });
    return id;
  },
});

// Get available zoom levels in the database
export const getAvailableZoomLevels = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query('inferences').collect();

    const zoomLevels = [
      ...new Set(
        results.map((r) => r.z).filter((z): z is number => z !== undefined)
      ),
    ].sort((a, b) => a - b);
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

    // Get ALL inference results from database (across all models)
    const allResults = await ctx.db.query('inferences').collect();

    // Group by zoom level and create tile lookup map
    const zoomGroups = new Map<number, typeof allResults>();
    const tileMap = new Map<Id<'tiles'>, { x: number; y: number; z: number }>();

    for (const result of allResults) {
      const tile = await ctx.db.get(result.tileId);
      if (!tile) continue;

      // Store tile data for later lookup
      tileMap.set(result.tileId, { x: tile.x, y: tile.y, z: tile.z });

      if (!zoomGroups.has(tile.z)) {
        zoomGroups.set(tile.z, []);
      }
      zoomGroups.get(tile.z)!.push(result);
    }

    // Process each zoom level's data
    for (const [zoomLevel, zoomResults] of zoomGroups.entries()) {
      // Get tiles that intersect with the viewport at this zoom level
      const tiles = tilesIntersectingBbox(args.bbox, zoomLevel);

      for (const t of tiles) {
        // Find matching tile in this zoom level's results
        const tileMatches = zoomResults.filter((r) => {
          const tileData = tileMap.get(r.tileId);
          if (!tileData) return false;
          return tileData.z === t.z && tileData.x === t.x && tileData.y === t.y;
        });

        if (!tileMatches.length) continue;

        // Get the latest result for this tile (across all models)
        const latest = tileMatches.sort(
          (a, b) => b._creationTime - a._creationTime
        )[0];

        const response = latest.response as RoboflowResponse;
        const image = response.image;
        const preds: RoboflowPrediction[] = Array.isArray(response.predictions)
          ? response.predictions
          : [];

        for (const p of preds) {
          if (!image?.width || !image?.height) continue;

          // Filter by confidence threshold
          if ((p.confidence ?? 0) < (args.confidenceThreshold ?? 0.5)) {
            continue;
          }

          const { point } = predictionToFeature(
            t.z,
            t.x,
            t.y,
            p,
            image.width,
            image.height,
            { includePolygon: false }
          );

          // Add model and version info to properties for reference
          point.properties = {
            ...point.properties,
            model: latest.model,
            version: latest.version,
          };

          features.push(point);
        }
      }
    }

    return { type: 'FeatureCollection', features } as const;
  },
});
