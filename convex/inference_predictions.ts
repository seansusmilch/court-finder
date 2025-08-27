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
      .withIndex('by_inference_and_detection', (q) =>
        q
          .eq('inferenceId', args.inferenceId)
          .eq('detectionId', args.prediction.detection_id)
      )
      .unique();

    if (existing) {
      // Update the existing prediction
      await ctx.db.patch(existing._id, {
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
        detectionId: args.prediction.detection_id,
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

export const getNextPredictionForFeedback = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    let cursor = null;
    do {
      const result = await ctx.db
        .query('inference_predictions')
        .order('asc')
        .paginate({ cursor, numItems: 100 });
      for (const prediction of result.page) {
        const feedback = await ctx.db
          .query('feedback_submissions')
          .withIndex('by_user_and_prediction', (q) =>
            q.eq('userId', userId).eq('predictionId', prediction._id)
          )
          .first();

        if (!feedback) {
          const inference = await ctx.db.get(prediction.inferenceId);
          if (inference) {
            const imageWidth = inference.response?.image?.width;
            const imageHeight = inference.response?.image?.height;
            return {
              prediction,
              inference: {
                ...inference,
                imageWidth,
                imageHeight,
              },
            };
          }
        }
      }
      cursor = result.continueCursor;
    } while (cursor);

    return null;
  },
});
