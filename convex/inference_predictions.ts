import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

/**
 * Upsert an inference prediction: if a prediction with the same inferenceId and detection_id exists, update it; otherwise, insert a new one.
 * Returns the id of the upserted prediction.
 */
export const upsert = internalMutation({
  args: {
    inferenceId: v.id('inferences'),
    tileId: v.id('tiles'),
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
      .withIndex('by_inf_and_roboflow_detection_id', (q) =>
        q
          .eq('inferenceId', args.inferenceId)
          .eq('roboflowDetectionId', args.prediction.detection_id)
      )
      .unique();

    if (existing) {
      // Update the existing prediction
      await ctx.db.patch(existing._id, {
        tileId: args.tileId,
        roboflowDetectionId: args.prediction.detection_id,
        class: args.prediction.class,
        classId: args.prediction.class_id,
        confidence: args.prediction.confidence,
        height: args.prediction.height,
        width: args.prediction.width,
        x: args.prediction.x,
        y: args.prediction.y,
      });
      return existing._id;
    } else {
      // Insert a new prediction
      const id = await ctx.db.insert('inference_predictions', {
        inferenceId: args.inferenceId,
        roboflowDetectionId: args.prediction.detection_id,
        tileId: args.tileId,
        class: args.prediction.class,
        classId: args.prediction.class_id,
        confidence: args.prediction.confidence,
        height: args.prediction.height,
        width: args.prediction.width,
        x: args.prediction.x,
        y: args.prediction.y,
      });
      return id;
    }
  },
});
