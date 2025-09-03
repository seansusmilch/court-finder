import { query } from './_generated/server';
import { ROBOFLOW_MODEL_NAME, ROBOFLOW_MODEL_VERSION } from './lib/constants';

export const getPendingBatches = query({
  handler: async (ctx) => {
    // Get all tiles that are in upload_batches
    const uploadedTiles = await ctx.db.query('upload_batches').collect();

    const uploadedTileIds = new Set(uploadedTiles.map((batch) => batch.tileId));

    // Get all tiles
    const allTiles = await ctx.db.query('tiles').collect();

    // Filter to tiles NOT in upload_batches
    const pendingTiles = allTiles.filter(
      (tile) => !uploadedTileIds.has(tile._id)
    );

    // For each pending tile, get predictions and feedback
    const result = [];

    for (const tile of pendingTiles) {
      // Get predictions for this tile from the latest model/version
      const predictions = await ctx.db
        .query('inference_predictions')
        .withIndex('by_tile_model_version', (q) =>
          q
            .eq('tileId', tile._id)
            .eq('model', ROBOFLOW_MODEL_NAME)
            .eq('version', ROBOFLOW_MODEL_VERSION)
        )
        .collect();

      // For each prediction, get feedback
      const predictionsWithFeedback = [];
      for (const prediction of predictions) {
        const feedback = await ctx.db
          .query('feedback_submissions')
          .filter((q) => q.eq(q.field('predictionId'), prediction._id))
          .collect();

        predictionsWithFeedback.push({
          prediction,
          feedback,
          feedbackCount: feedback.length,
        });
      }

      const totalFeedbackCount = predictionsWithFeedback.reduce(
        (acc, curr) => acc + curr.feedbackCount,
        0
      );
      result.push({
        tile,
        predictions: predictionsWithFeedback,
        predictionsCount: predictionsWithFeedback.length,
        feedbackCount: totalFeedbackCount,
      });
    }

    return result;
  },
});
