import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

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

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
      return existing._id;
    } else {
      const id = await ctx.db.insert('inference_predictions', updateData);
      return id;
    }
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
