import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { styleTileUrl } from './lib/tiles';
import { RANDOMIZE_PREDICTION_FEEDBACK } from './lib/constants';

export const getNextPredictionForFeedback = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const userSubmissions = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_user_and_prediction', (q) => q.eq('userId', userId))
      .collect();

    const submittedPredictionIds = new Set(
      userSubmissions.map((s) => s.predictionId.toString())
    );

    let nextPrediction = null;
    if (RANDOMIZE_PREDICTION_FEEDBACK) {
      const allPredictions = await ctx.db
        .query('inference_predictions')
        .collect();
      const candidatePredictions = allPredictions.filter(
        (prediction) => !submittedPredictionIds.has(prediction._id.toString())
      );

      if (candidatePredictions.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * candidatePredictions.length
        );
        nextPrediction = candidatePredictions[randomIndex];
      }
    } else {
      for await (const prediction of ctx.db.query('inference_predictions')) {
        if (!submittedPredictionIds.has(prediction._id.toString())) {
          nextPrediction = prediction;
          break;
        }
      }
    }

    if (!nextPrediction) {
      return null; // All done
    }

    // Fetch the tile from prediction
    const tile = await ctx.db.get(nextPrediction.tileId);
    if (!tile) {
      return null;
    }

    // Generate the imageUrl using the tile coordinates
    const imageUrl = styleTileUrl(tile.z, tile.x, tile.y);

    // Provide a minimal stub for `inference` to satisfy UI expectations
    const inference = {
      tileId: nextPrediction.tileId,
      model: nextPrediction.model,
      version: nextPrediction.version,
      response: { image: { width: 1024, height: 1024 } },
    } as const;

    return {
      prediction: nextPrediction,
      inference,
      imageUrl,
      tile,
    };
  },
});

export const getFeedbackStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const userSubmissions = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_user_and_prediction', (q) => q.eq('userId', userId))
      .collect();

    let totalPredictions = 0;
    for await (const _ of ctx.db.query('inference_predictions')) {
      totalPredictions++;
    }

    return {
      userSubmissionCount: userSubmissions.length,
      totalPredictions: totalPredictions,
    };
  },
});

export const submitFeedback = mutation({
  args: {
    predictionId: v.id('inference_predictions'),
    userResponse: v.union(
      v.literal('yes'),
      v.literal('no'),
      v.literal('unsure')
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      throw new Error('Prediction not found');
    }

    const existingFeedback = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_user_and_prediction', (q) =>
        q.eq('userId', userId).eq('predictionId', args.predictionId)
      )
      .first();

    if (existingFeedback) {
      // Optionally update existing feedback or throw an error
      console.log('Feedback already submitted for this prediction.');
      return;
    }

    await ctx.db.insert('feedback_submissions', {
      tileId: prediction.tileId,
      predictionId: args.predictionId,
      userId: userId,
      userResponse: args.userResponse,
    });
  },
});
