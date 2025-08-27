import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

export const getNextPredictionForFeedback = query({
  args: {
    skipIds: v.optional(v.array(v.id('inference_predictions'))),
  },
  handler: async (ctx, { skipIds }) => {
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
    const skippedPredictionIds = new Set(skipIds?.map((id) => id.toString()));

    let nextPrediction = null;
    for await (const prediction of ctx.db.query('inference_predictions')) {
      if (
        !submittedPredictionIds.has(prediction._id.toString()) &&
        !skippedPredictionIds.has(prediction._id.toString())
      ) {
        nextPrediction = prediction;
        break;
      }
    }

    if (!nextPrediction) {
      return null; // All done
    }

    const inference = await ctx.db.get(nextPrediction.inferenceId);

    if (!inference) {
      return null;
    }

    return {
      prediction: nextPrediction,
      inference,
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
    userResponse: v.string(), // "yes" or "no"
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
      inferenceId: prediction.inferenceId,
      predictionId: args.predictionId,
      userId: userId,
      userResponse: args.userResponse,
    });
  },
});
