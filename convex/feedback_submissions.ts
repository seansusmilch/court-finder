import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { styleTileUrl } from './lib/tiles';
import { RANDOMIZE_PREDICTION_FEEDBACK } from './lib/constants';
import type { QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';

// Utility: Get all feedback submissions for a user
async function getUserSubmissions(
  ctx: QueryCtx,
  userId: Id<'users'>
): Promise<Array<Doc<'feedback_submissions'>>> {
  return await ctx.db
    .query('feedback_submissions')
    .withIndex('by_user_and_prediction', (q) => q.eq('userId', userId))
    .collect();
}

// Utility: Get a set of prediction IDs that the user has already submitted feedback for
function getSubmittedPredictionIds(
  submissions: Array<Doc<'feedback_submissions'>>
): Set<string> {
  return new Set(submissions.map((s) => s.predictionId.toString()));
}

// Utility: Check if a prediction has already been submitted by the user
function isPredictionSubmitted(
  predictionId: Id<'inference_predictions'>,
  submittedIds: Set<string>
): boolean {
  return submittedIds.has(predictionId.toString());
}

// Utility: Find the next prediction for feedback (random or sequential)
async function findNextPrediction(
  ctx: QueryCtx,
  submittedPredictionIds: Set<string>,
  currentPredictionId?: Id<'inference_predictions'>
): Promise<Doc<'inference_predictions'> | null> {
  // If a currentPredictionId is provided, try to use that prediction
  // (as long as the user hasn't already submitted feedback for it)
  if (currentPredictionId) {
    const currentPrediction = await ctx.db.get(currentPredictionId);
    if (
      currentPrediction &&
      !isPredictionSubmitted(currentPrediction._id, submittedPredictionIds)
    ) {
      return currentPrediction;
    }
  }

  // Find the next prediction based on randomization setting
  if (RANDOMIZE_PREDICTION_FEEDBACK) {
    const allPredictions = await ctx.db
      .query('inference_predictions')
      .collect();
    const candidatePredictions = allPredictions.filter(
      (prediction) =>
        !isPredictionSubmitted(prediction._id, submittedPredictionIds)
    );

    if (candidatePredictions.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * candidatePredictions.length
      );
      return candidatePredictions[randomIndex];
    }
  } else {
    for await (const prediction of ctx.db.query('inference_predictions')) {
      if (!isPredictionSubmitted(prediction._id, submittedPredictionIds)) {
        return prediction;
      }
    }
  }

  return null;
}

// Utility: Build inference stub for UI expectations
function buildInferenceStub(
  prediction: Doc<'inference_predictions'>
): {
  tileId: Id<'tiles'>;
  model: string | undefined;
  version: string | undefined;
  response: { image: { width: number; height: number } };
} {
  return {
    tileId: prediction.tileId,
    model: prediction.model,
    version: prediction.version,
    response: { image: { width: 1024, height: 1024 } },
  } as const;
}

// Utility: Count total predictions in the database
async function getTotalPredictionCount(ctx: QueryCtx): Promise<number> {
  let count = 0;
  for await (const _ of ctx.db.query('inference_predictions')) {
    count++;
  }
  return count;
}

export const getNextPredictionForFeedback = query({
  args: {
    // Optional: if provided, we try to return this specific prediction
    // This prevents the view from changing when new predictions sync in
    currentPredictionId: v.optional(v.id('inference_predictions')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const userSubmissions = await getUserSubmissions(ctx, userId);
    const submittedPredictionIds =
      getSubmittedPredictionIds(userSubmissions);

    const nextPrediction = await findNextPrediction(
      ctx,
      submittedPredictionIds,
      args.currentPredictionId
    );

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
    const inference = buildInferenceStub(nextPrediction);

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

    const userSubmissions = await getUserSubmissions(ctx, userId);
    const totalPredictions = await getTotalPredictionCount(ctx);

    return {
      userSubmissionCount: userSubmissions.length,
      totalPredictions,
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
    const startTs = Date.now();
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.error('error: unauthorized', {
        requestedAction: 'submit_feedback',
        predictionId: args.predictionId,
      });
      throw new Error('Unauthorized');
    }

    console.log('start', {
      startTs,
      userId,
      predictionId: args.predictionId,
      userResponse: args.userResponse,
    });

    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      console.error('error: prediction not found', {
        predictionId: args.predictionId,
        userId,
        requestedAction: 'submit_feedback',
      });
      throw new Error('Prediction not found');
    }

    const existingFeedback = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_user_and_prediction', (q) =>
        q.eq('userId', userId).eq('predictionId', args.predictionId)
      )
      .first();

    console.log('query', {
      table: 'feedback_submissions',
      index: 'by_user_and_prediction',
      params: { userId, predictionId: args.predictionId },
      found: !!existingFeedback,
    });

    if (existingFeedback) {
      console.log('complete', {
        durationMs: Date.now() - startTs,
        userId,
        action: 'skipped_existing',
        predictionId: args.predictionId,
        feedbackId: existingFeedback._id,
      });
      return;
    }

    const feedbackId = await ctx.db.insert('feedback_submissions', {
      tileId: prediction.tileId,
      predictionId: args.predictionId,
      userId: userId,
      userResponse: args.userResponse,
    });

    console.log('created', {
      table: 'feedback_submissions',
      feedbackId,
      data: {
        tileId: prediction.tileId,
        predictionId: args.predictionId,
        userResponse: args.userResponse,
      },
      userId,
      durationMs: Date.now() - startTs,
    });
  },
});
