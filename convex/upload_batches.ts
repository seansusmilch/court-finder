import { v } from 'convex/values';
import { action, mutation, query } from './_generated/server';
import { ROBOFLOW_MODEL_NAME, ROBOFLOW_MODEL_VERSION } from './lib/constants';
import { createCreateMLAnnotationFromPredictions } from './lib/createml';
import {
  uploadAnnotationToRoboflow,
  uploadImageToRoboflow,
  AnnotationUploadResponse,
} from './lib/roboflow';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';

export const getPendingBatches = query({
  args: {
    onlyLatestModelVersion: v.optional(v.boolean()),
    includeEmpty: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all tiles that are in upload_batches
    const uploadedTiles = await ctx.db.query('upload_batches').collect();

    const uploadedTileIds = new Set(
      uploadedTiles
        .filter((batch) => batch.tileId != null)
        .map((batch) => batch.tileId)
    );

    // Get all tiles NOT in upload_batches, ordered by creation time descending for stable ordering
    const allTiles = await ctx.db.query('tiles').collect();
    const pendingTiles = allTiles.filter(
      (tile) => !uploadedTileIds.has(tile._id)
    );

    console.log({
      uploadedTileIds,
      allTilesCount: allTiles.length,
      pendingTilesCount: pendingTiles.length,
    });

    // For each pending tile, get predictions and feedback
    const result = [];

    for (const tile of pendingTiles) {
      // Get predictions for this tile from the latest model/version
      const predictions = args.onlyLatestModelVersion
        ? await ctx.db
            .query('inference_predictions')
            .withIndex('by_tile_model_version', (q) =>
              q
                .eq('tileId', tile._id)
                .eq('model', ROBOFLOW_MODEL_NAME)
                .eq('version', ROBOFLOW_MODEL_VERSION)
            )
            .collect()
        : await ctx.db
            .query('inference_predictions')
            .withIndex('by_tile', (q) => q.eq('tileId', tile._id))
            .collect();

      if (!predictions.length && !args.includeEmpty) continue;

      console.log({ tileId: tile._id, predictionsCount: predictions.length });

      const feedbacks = await ctx.db
        .query('feedback_submissions')
        .withIndex('by_tile', (q) => q.eq('tileId', tile._id))
        .collect();

      const predictionsWithFeedback = predictions.map((prediction) => {
        const feedback = feedbacks.filter(
          (f) => f.predictionId === prediction._id
        );

        return {
          prediction,
          feedback,
          feedbackCount: feedback.length,
        };
      });

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
    const sortedByCoveragePct = result.sort(
      (a, b) => b.coveragePct - a.coveragePct
    );

    return sortedByCoveragePct;
  },
});

export const getBatchById = query({
  args: {
    batchId: v.optional(v.id('upload_batches')),
    tileId: v.optional(v.id('tiles')),
  },
  handler: async (ctx, args) => {
    if (args.batchId) {
      return await ctx.db.get(args.batchId);
    }

    if (args.tileId) {
      return await ctx.db
        .query('upload_batches')
        .withIndex('by_tile', (q) => q.eq('tileId', args.tileId as Id<'tiles'>))
        .unique();
    }

    throw new Error('Batch ID or tile ID is required');
  },
});

export const createUploadBatch = mutation({
  args: {
    tileId: v.id('tiles'),
  },
  handler: async (ctx, args) => {
    const tile = await ctx.db.get(args.tileId);
    if (!tile) {
      throw new Error('Tile not found');
    }

    const roboflowName = `${tile.x}-${tile.y}-${tile.z}.jpg`;

    const id = await ctx.db.insert('upload_batches', {
      tileId: args.tileId,
      roboflowName,
    });

    return id;
  },
});

export const getAnnotationsForBatch = mutation({
  args: {
    batchId: v.id('upload_batches'),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const predictions = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile', (q) => q.eq('tileId', batch.tileId))
      .collect();

    const feedbacks = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_tile', (q) => q.eq('tileId', batch.tileId))
      .collect();

    const shouldAnnotate = predictions.filter((prediction) => {
      const feedback = feedbacks.filter(
        (f) => f.predictionId === prediction._id
      );
      if (!feedback) return false;

      const feedbackCount = feedback.length;
      const yesCount = feedback.filter((f) => f.userResponse === 'yes').length;

      return yesCount / feedbackCount > 0.5;
    });

    await ctx.runMutation(api.upload_batches.updateFeedbacksWithBatchId, {
      batchId: batch._id,
      feedbackIds: feedbacks.map((f) => f._id),
    });

    return shouldAnnotate;
  },
});

export const updateFeedbacksWithBatchId = mutation({
  args: {
    batchId: v.id('upload_batches'),
    feedbackIds: v.array(v.id('feedback_submissions')),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.feedbackIds.map((id) => ctx.db.patch(id, { batchId: args.batchId }))
    );
  },
});

export const addImageToRoboflow = action({
  args: {
    batchId: v.id('upload_batches'),
    imageUrl: v.string(),
    imageName: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await uploadImageToRoboflow({
      imageUrl: args.imageUrl,
      imageName: args.imageName,
    });

    await ctx.runMutation(api.upload_batches.updateBatchWithImageId, {
      batchId: args.batchId,
      imageId: result.id,
    });

    return result;
  },
});

export const updateBatchWithImageId = mutation({
  args: {
    batchId: v.id('upload_batches'),
    imageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, { roboflowImageId: args.imageId });
  },
});

export const addAnnotationToRoboflow = action({
  args: {
    batchId: v.id('upload_batches'),
    imageId: v.string(),
    imageName: v.string(),
  },
  handler: async (ctx, args) => {
    const shouldAnnotate = await ctx.runMutation(
      api.upload_batches.getAnnotationsForBatch,
      {
        batchId: args.batchId,
      }
    );

    const annotation = createCreateMLAnnotationFromPredictions(
      args.imageName,
      shouldAnnotate
    );

    const result = await uploadAnnotationToRoboflow({
      imageId: args.imageId,
      annotation,
    });

    await ctx.runMutation(api.upload_batches.updateBatchWithAnnotationId, {
      batchId: args.batchId,
    });

    return result;
  },
});

export const updateBatchWithAnnotationId = mutation({
  args: {
    batchId: v.id('upload_batches'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, {
      roboflowAnnotatedAt: Date.now(),
    });
  },
});

export const processNewBatch = action({
  args: {
    tileId: v.id('tiles'),
  },
  handler: async (ctx, args): Promise<AnnotationUploadResponse> => {
    /**
     * 1. create new batch (tileId)
     * 2. upload image to roboflow (imageUrl, imageName)
     * 3. add annotation to roboflow (batchId, imageId, imageName)
     */
    const batchId = await ctx.runMutation(
      api.upload_batches.createUploadBatch,
      {
        tileId: args.tileId,
      }
    );

    const batch = await ctx.runQuery(api.upload_batches.getBatchById, {
      batchId,
    });
    if (!batch) {
      throw new Error('Batch not found');
    }

    const imageUrl = await ctx.runQuery(api.tiles.getImageUrlFromTileId, {
      tileId: batch.tileId,
    });

    const imageUploadResult = await ctx.runAction(
      api.upload_batches.addImageToRoboflow,
      {
        batchId,
        imageUrl,
        imageName: batch.roboflowName,
      }
    );

    const annotationUploadResult = await ctx.runAction(
      api.upload_batches.addAnnotationToRoboflow,
      {
        batchId,
        imageId: imageUploadResult.id,
        imageName: batch.roboflowName,
      }
    );

    return annotationUploadResult;
  },
});
