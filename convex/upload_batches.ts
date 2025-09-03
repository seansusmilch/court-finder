import { query } from './_generated/server';
import { ROBOFLOW_MODEL_NAME, ROBOFLOW_MODEL_VERSION } from './lib/constants';
import { v } from 'convex/values';

export const getPendingBatches = query({
  args: {},
  handler: async (ctx) => {
    // Get all tiles that are in upload_batches
    const uploadedTiles = await ctx.db.query('upload_batches').collect();

    const uploadedTileIds = new Set(
      uploadedTiles
        .filter((batch) => batch.tileId != null)
        .map((batch) => batch.tileId)
    );

    // Get all tiles NOT in upload_batches, ordered by creation time descending for stable ordering
    const allTiles = await ctx.db.query('tiles').order('desc').collect();
    const pendingTiles = allTiles.filter(
      (tile) => !uploadedTileIds.has(tile._id)
    );

    // For each pending tile, get predictions and feedback
    const result = [] as Array<{
      tile: any;
      predictions: Array<{
        prediction: any;
        feedback: any[];
        feedbackCount: number;
      }>;
      predictionsCount: number;
      feedbackCount: number;
      coveragePct: number;
      covered: number;
      missing: number;
    }>;

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
      // Calculate coverage data for this tile
      const covered = predictionsWithFeedback.filter(
        (p) => p.feedbackCount > 0
      ).length;
      const predictionsCount = predictionsWithFeedback.length;
      const coveragePct =
        predictionsCount > 0
          ? Math.round((covered / predictionsCount) * 100)
          : 0;
      const missing = predictionsCount - covered;
      result.push({
        tile,
        predictions: predictionsWithFeedback,
        predictionsCount: predictionsWithFeedback.length,
        feedbackCount: totalFeedbackCount,
        coveragePct,
        covered,
        missing,
      });
    }

    // Sort all results by coverage percentage (lowest first - tiles needing attention)
    const sortedByCoveragePct = result
      .sort((a, b) => a.coveragePct - b.coveragePct)
      .reverse();

    return sortedByCoveragePct;
  },
});
