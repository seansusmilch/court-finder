import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { pixelOnTileToLngLat } from './lib/tiles';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

/**
 * Upsert an inference prediction: if a prediction with the same inferenceId and detection_id exists, update it; otherwise, insert a new one.
 * Returns the id of the upserted prediction.
 */
export const upsert = internalMutation({
  args: {
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
    inference_id: v.string(),
    // ROBOFLOW RESPONSE
    prediction: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      confidence: v.number(),
      class: v.string(),
      class_id: v.optional(v.number()),
      detection_id: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile_model_version_detection', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
          .eq('roboflowDetectionId', args.prediction.detection_id)
      )
      .unique();

    console.log('query', {
      table: 'inference_predictions',
      index: 'by_tile_model_version_detection',
      params: {
        tileId: args.tileId,
        model: args.model,
        version: args.version,
        detectionId: args.prediction.detection_id,
      },
      found: !!existing,
      predictionId: existing?._id,
    });

    const updateData = {
      roboflowInferenceId: args.inference_id,
      roboflowDetectionId: args.prediction.detection_id,
      tileId: args.tileId,
      class: args.prediction.class,
      classId: args.prediction.class_id,
      confidence: args.prediction.confidence,
      height: args.prediction.height,
      width: args.prediction.width,
      x: args.prediction.x,
      y: args.prediction.y,
      model: args.model,
      version: args.version,
    };

    let predictionId: Id<'inference_predictions'>;

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
      console.log('patched', {
        table: 'inference_predictions',
        predictionId: existing._id,
        fields: Object.keys(updateData),
        tileId: args.tileId,
        model: args.model,
        version: args.version,
      });
      predictionId = existing._id;
    } else {
      const id = await ctx.db.insert('inference_predictions', updateData);
      console.log('created', {
        table: 'inference_predictions',
        predictionId: id,
        data: {
          tileId: args.tileId,
          model: args.model,
          version: args.version,
          class: args.prediction.class,
          confidence: args.prediction.confidence,
        },
      });
      predictionId = id as Id<'inference_predictions'>;
    }

    const tile = await ctx.db.get(args.tileId);
    if (!tile) {
      console.error('error: tile not found during court linking', {
        tileId: args.tileId,
        predictionId,
        action: 'upsert_prediction',
      });
      return predictionId;
    }

    const { lon, lat } = pixelOnTileToLngLat(
      tile.z,
      tile.x,
      tile.y,
      updateData.x,
      updateData.y,
      1024,
      1024,
      512
    );

    const nearbyCourt = await ctx.runQuery(
      internal.courts.findNearbyCourt,
      { latitude: lat, longitude: lon, class: updateData.class }
    );

    if (nearbyCourt) {
      await ctx.db.patch(predictionId, { courtId: nearbyCourt.id });
      console.log('linked_to_existing_court', {
        predictionId,
        courtId: nearbyCourt.id,
        distance: nearbyCourt.distance,
      });
    } else {
      const courtId = await ctx.runMutation(
        internal.courts.createPendingCourtFromPrediction,
        {
          predictionId,
        }
      );
      await ctx.db.patch(predictionId, { courtId });
      console.log('created_new_court', {
        predictionId,
        courtId,
      });
    }

    return predictionId;
  },
});

export const listByTileModelVersion = internalQuery({
  args: {
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const preds = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile_model_version', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
    return preds;
  },
});

export const listByTile = internalQuery({
  args: { tileId: v.id('tiles') },
  handler: async (ctx, args) => {
    const preds = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile', (q) => q.eq('tileId', args.tileId))
      .collect();
    return preds;
  },
});
