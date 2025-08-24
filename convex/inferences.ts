import {
  internalQuery,
  internalMutation,
  query,
  mutation,
} from './_generated/server';
import { v } from 'convex/values';
import {
  predictionToFeature,
  tilesIntersectingBbox,
  type GeoJSONPointFeature,
} from './lib/tiles';
import type { RoboflowPrediction } from './lib/roboflow';
import { PERMISSIONS } from './lib/constants';
import { api } from './_generated/api';

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
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tile', (q) =>
        q
          .eq('z', args.z)
          .eq('x', args.x)
          .eq('y', args.y)
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
    const matches = await ctx.db
      .query('inferences')
      .withIndex('by_tile', (q) =>
        q
          .eq('z', args.z)
          .eq('x', args.x)
          .eq('y', args.y)
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
    const id = await ctx.db.insert('inferences', {
      z: args.z,
      x: args.x,
      y: args.y,
      imageUrl: args.imageUrl,
      model: args.model,
      version: args.version,
      requestedAt: Date.now(),
      response: args.response,
    });
    return id;
  },
});

export const getMany = internalQuery({
  args: { ids: v.array(v.id('inferences')) },
  handler: async (ctx, args) => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter(Boolean);
  },
});

export const featuresByTile = query({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    model: v.string(),
    version: v.string(),
    includePolygons: v.optional(v.boolean()),
    confidenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query('inferences')
      .withIndex('by_tile', (q) =>
        q
          .eq('z', args.z)
          .eq('x', args.x)
          .eq('y', args.y)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
    if (!match.length) {
      return { type: 'FeatureCollection', features: [] } as const;
    }
    match.sort((a, b) => b.requestedAt - a.requestedAt);
    const latest = match[0];
    const response = latest.response;
    const image = response.image;
    const preds: RoboflowPrediction[] = Array.isArray(response.predictions)
      ? response.predictions
      : [];
    const features: GeoJSONPointFeature[] = [];
    for (const p of preds) {
      if (!image?.width || !image?.height) continue;

      // Filter by confidence threshold
      if (p.confidence < (args.confidenceThreshold ?? 0.5)) {
        continue;
      }

      const { point } = predictionToFeature(
        args.z,
        args.x,
        args.y,
        p,
        image.width,
        image.height,
        { includePolygon: false }
      );
      features.push(point);
    }
    return { type: 'FeatureCollection', features } as const;
  },
});

// Get available zoom levels in the database
export const getAvailableZoomLevels = query({
  args: {
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('inferences')
      .filter((q) =>
        q.and(
          q.eq(q.field('model'), args.model),
          q.eq(q.field('version'), args.version)
        )
      )
      .collect();

    const zoomLevels = [...new Set(results.map((r) => r.z))].sort(
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
    model: v.string(),
    version: v.string(),
    confidenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('[inferences.featuresByViewport]');
    const features: GeoJSONPointFeature[] = [];

    // Get ALL available zoom levels from database
    const allResults = await ctx.db
      .query('inferences')
      .filter((q) =>
        q.and(
          q.eq(q.field('model'), args.model),
          q.eq(q.field('version'), args.version)
        )
      )
      .collect();

    // Group by zoom level
    const zoomGroups = new Map<number, typeof allResults>();
    for (const result of allResults) {
      if (!zoomGroups.has(result.z)) {
        zoomGroups.set(result.z, []);
      }
      zoomGroups.get(result.z)!.push(result);
    }

    // Process each zoom level's data
    for (const [zoomLevel, zoomResults] of zoomGroups.entries()) {
      // Get tiles that intersect with the viewport at this zoom level
      const tiles = tilesIntersectingBbox(args.bbox, zoomLevel);

      for (const t of tiles) {
        // Find matching tile in this zoom level's results
        const tileMatches = zoomResults.filter(
          (r) => r.z === t.z && r.x === t.x && r.y === t.y
        );

        if (!tileMatches.length) continue;

        // Get the latest result for this tile
        const latest = tileMatches.sort(
          (a, b) => b.requestedAt - a.requestedAt
        )[0];

        const response = latest.response;
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
          features.push(point);
        }
      }
    }

    return { type: 'FeatureCollection', features } as const;
  },
});

export const getTrainingData = query({
  args: {
    model: v.optional(v.string()),
    version: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hasPermission = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.TRAINING.READ,
    });

    if (!hasPermission) {
      throw new Error('Unauthorized');
    }

    // Get all results and filter by predictions
    const results = await ctx.db.query('inferences').collect();

    // Filter results that have predictions and match model/version if specified
    const filteredResults = results.filter((inference) => {
      const response = inference.response as any;
      const hasPredictions =
        response?.predictions &&
        Array.isArray(response.predictions) &&
        response.predictions.length > 0;

      if (!hasPredictions) return false;

      if (args.model && inference.model !== args.model) return false;
      if (args.version && inference.version !== args.version) return false;

      return true;
    });

    // Transform to training format
    const trainingItems = filteredResults
      .map((inference) => {
        const response = inference.response as any;
        return {
          id: inference._id,
          imageUrl: inference.imageUrl,
          imageWidth: response?.image?.width || 640,
          imageHeight: response?.image?.height || 640,
          tileInfo: {
            z: inference.z,
            x: inference.x,
            y: inference.y,
          },
          model: inference.model,
          version: inference.version,
          predictions: response.predictions || [],
          requestedAt: inference.requestedAt,
        };
      })
      .sort((a, b) => b.requestedAt - a.requestedAt); // Sort by most recent

    // Apply limit if specified
    if (args.limit) {
      return trainingItems.slice(0, args.limit);
    }

    return trainingItems;
  },
});

export const submitTrainingFeedback = mutation({
  args: {
    feedback: v.array(
      v.object({
        predictionId: v.string(),
        inferenceId: v.id('inferences'),
        feedback: v.union(
          v.literal('good'),
          v.literal('bad'),
          v.literal('not_a_court')
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const hasPermission = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.TRAINING.WRITE,
    });

    if (!hasPermission) {
      throw new Error('Unauthorized');
    }

    // In a real app, you'd save this to a new table for feedback.
    // For now, we'll just log it.
    console.log('Received training feedback:', args.feedback);

    // You could also update the inference documents with feedback,
    // but that might make them too large.

    return { success: true, count: args.feedback.length };
  },
});
