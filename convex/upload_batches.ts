import { v } from 'convex/values';
import { action, mutation, query } from './_generated/server';
import { ROBOFLOW_MODEL_NAME, ROBOFLOW_MODEL_VERSION } from './lib/constants';
import { createCreateMLAnnotationFromPredictions } from './lib/createml';
import {
  uploadAnnotationToRoboflow,
  uploadImageToRoboflow,
  type AnnotationUploadResponse,
} from './lib/roboflow';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';

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

export const getProcessedBatches = query({
  args: {
    onlyLatestModelVersion: v.optional(v.boolean()),
    includeEmpty: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // All created batches (i.e., already processed/started)
    const batches = await ctx.db.query('upload_batches').collect();

    const results = [] as Array<{
      batch: any;
      tile: any;
      predictionsCount: number;
      feedbackCount: number;
      coveragePct: number;
      covered: number;
      missing: number;
      imageUploaded: boolean;
      annotated: boolean;
    }>;

    for (const batch of batches) {
      const tile = await ctx.db.get(batch.tileId);
      if (!tile) continue;

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
      const covered = predictionsWithFeedback.filter(
        (p) => p.feedbackCount > 0
      ).length;
      const predictionsCount = predictionsWithFeedback.length;
      const coveragePct =
        predictionsCount > 0
          ? Math.round((covered / predictionsCount) * 100)
          : 0;
      const missing = predictionsCount - covered;

      results.push({
        batch,
        tile,
        predictionsCount,
        feedbackCount: totalFeedbackCount,
        coveragePct,
        covered,
        missing,
        imageUploaded: Boolean(batch.roboflowImageId),
        annotated: Boolean(batch.roboflowAnnotatedAt),
      });
    }

    // Newest first
    results.sort(
      (a, b) => (b.batch._creationTime ?? 0) - (a.batch._creationTime ?? 0)
    );
    return results;
  },
});

export const getTileBatchDetails = query({
  args: {
    tileId: v.optional(v.id('tiles')),
    batchId: v.optional(v.id('upload_batches')),
  },
  handler: async (ctx, args) => {
    const batch = args.batchId
      ? await ctx.db.get(args.batchId)
      : args.tileId
      ? await ctx.db
          .query('upload_batches')
          .withIndex('by_tile', (q) => q.eq('tileId', args.tileId!))
          .unique()
      : null;

    const tileId = batch?.tileId ?? args.tileId;
    if (!tileId) throw new Error('tileId or batchId required');

    const tile = await ctx.db.get(tileId);
    if (!tile) throw new Error('Tile not found');

    const predictions = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile', (q) => q.eq('tileId', tile._id))
      .collect();

    const feedbacks = await ctx.db
      .query('feedback_submissions')
      .withIndex('by_tile', (q) => q.eq('tileId', tile._id))
      .collect();

    // Enrich feedback with user emails
    const uniqueUserIds = Array.from(
      new Set(feedbacks.map((f) => f.userId as Id<'users'>))
    );
    const userDocs = await Promise.all(
      uniqueUserIds.map((id) => ctx.db.get(id))
    );
    const userIdToEmail = new Map(
      userDocs
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => [u._id, u.email])
    );

    const imageUrl: string = await ctx.runQuery(
      api.tiles.getImageUrlFromTileId,
      {
        tileId: tile._id,
      }
    );

    const byPrediction = predictions.map((prediction) => {
      const fbs = feedbacks
        .filter((f) => f.predictionId === prediction._id)
        .map((f) => ({
          ...f,
          userEmail: userIdToEmail.get(f.userId as Id<'users'>) ?? null,
        }));
      return {
        prediction,
        feedback: fbs,
      };
    });

    return {
      tile,
      batch: batch ?? null,
      imageUrl,
      byPrediction,
    };
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
  handler: async (
    ctx,
    args
  ): Promise<
    | AnnotationUploadResponse
    | { success: boolean; message: string; imageId: string }
  > => {
    /**
     * 1. create new batch (tileId)
     * 2. upload image to roboflow (imageUrl, imageName)
     * 3. check if there are predictions with feedback, if so add annotation to roboflow
     * 4. if no feedback, mark as processed without annotations
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

    // Check if there are any predictions with feedback
    const shouldAnnotate = await ctx.runMutation(
      api.upload_batches.getAnnotationsForBatch,
      {
        batchId,
      }
    );

    // If no predictions with feedback, just mark as processed
    if (shouldAnnotate.length === 0) {
      await ctx.runMutation(api.upload_batches.updateBatchWithAnnotationId, {
        batchId,
      });

      return {
        success: true,
        message: `Successfully uploaded image ${batch.roboflowName} to Roboflow without annotations (no feedback available)`,
        imageId: imageUploadResult.id,
      };
    }

    // Otherwise, upload annotations as usual
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

export const processNewBatchImageOnly = action({
  args: {
    tileId: v.id('tiles'),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string; imageId: string }> => {
    /**
     * 1. create new batch (tileId)
     * 2. upload image to roboflow (imageUrl, imageName)
     * 3. mark batch as processed without annotations
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

    // Mark batch as processed without annotations
    await ctx.runMutation(api.upload_batches.updateBatchWithAnnotationId, {
      batchId,
    });

    return {
      success: true,
      message: `Successfully uploaded image ${batch.roboflowName} to Roboflow without annotations`,
      imageId: imageUploadResult.id,
    };
  },
});
