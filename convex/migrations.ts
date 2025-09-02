import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import type { DataModel, Id, Doc } from './_generated/dataModel.js';
import type { RoboflowPrediction, RoboflowResponse } from './lib/roboflow.js';
import { pointToTile } from './lib/tiles.js';
import {
  DEFAULT_TILE_RADIUS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
} from './lib/constants.js';

export const migrations = new Migrations<DataModel>(components.migrations);

export const migratePredictions = migrations.define({
  table: 'inferences',
  migrateOne: async (ctx, doc) => {
    const predictions: RoboflowPrediction[] = doc.response.predictions;
    const predictionIds = await Promise.all(
      predictions.map(async (prediction) => {
        return await ctx.runMutation(internal.inference_predictions.upsert, {
          inferenceId: doc._id,
          tileId: doc.tileId as Id<'tiles'>,
          prediction,
        });
      })
    );
    console.log('[migratePredictions] upserted predictions', {
      inferenceId: doc._id,
      predictionIds,
    });
    return doc;
  },
});

export const migrateScansCenterTile = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const centerTile = pointToTile(doc.centerLat, doc.centerLong);
    return { centerTile };
  },
});

export const removeSwimmingPoolsInferences = migrations.define({
  table: 'inferences',
  migrateOne: async (ctx, doc) => {
    const response: RoboflowResponse = doc.response;
    const predictions: RoboflowPrediction[] = response.predictions;
    const filteredPredictions = predictions.filter(
      (prediction) => prediction.class !== 'swimming-pool'
    );

    response.predictions = Array.from(filteredPredictions);
    return { response };
  },
});

export const removeSwimmingPoolPredictions = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.class !== 'swimming-pool') return;
    await ctx.db.delete(doc._id);
  },
});

export const removeSwimmingPoolFeedback = migrations.define({
  table: 'feedback_submissions',
  migrateOne: async (ctx, doc) => {
    const predictionId = doc.predictionId;
    const prediction = await ctx.db.get(predictionId);
    if (prediction?.class !== 'swimming-pool') return;

    await ctx.db.delete(doc._id);
  },
});

export const migrateScansAndTiles = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const tileCoords = doc.tiles || [];

    // First, ensure all tiles exist
    for (const tileCoord of tileCoords) {
      const tileId = await ctx.runMutation(
        internal.tiles.insertTileIfNotExists,
        {
          x: tileCoord.x,
          y: tileCoord.y,
          z: tileCoord.z,
        }
      );
      // Then, create relationships without duplicates
      await ctx.runMutation(
        internal.scans_x_tiles.insertScanTileRelationshipIfNotExists,
        {
          scanId: doc._id,
          tileId,
        }
      );
    }

    return {
      model: ROBOFLOW_MODEL_NAME,
      version: ROBOFLOW_MODEL_VERSION,
      radius: DEFAULT_TILE_RADIUS,
      tiles: undefined,
    };
  },
});

export const migrateInferenceTileId = migrations.define({
  table: 'inferences',
  migrateOne: async (ctx, doc: Doc<'inferences'>) => {
    console.log('[migrateInferenceTileId] doc', doc);
    if (doc.tileId) return;
    const createdTileId: Id<'tiles'> = await ctx.runMutation(
      internal.tiles.insertTileIfNotExists,
      {
        x: doc.x,
        y: doc.y,
        z: doc.z,
      }
    );
    return { tileId: createdTileId };
  },
});

export const migrateInferencePredictionsTileandDetectionId = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    const inference = await ctx.db.get(doc.inferenceId);
    if (!inference?.tileId) return;

    return {
      tileId: inference.tileId,
      roboflowDetectionId: doc.detectionId,
      detectionId: undefined,
    };
  },
});

export const migrateFeedbackSubmissionsTileandBatchId = migrations.define({
  table: 'feedback_submissions',
  migrateOne: async (ctx, doc) => {
    const prediction = await ctx.db.get(doc.predictionId);
    const tileId = prediction?.tileId;
    const batchId = doc.lastBatchId;

    return {
      tileId,
      batchId,
      inferenceId: undefined,
      lastBatchId: undefined,
      uploadStatus: undefined,
    };
  },
});

export const runAll = migrations.runner([
  internal.migrations.migratePredictions,
  internal.migrations.migrateScansCenterTile,
  internal.migrations.removeSwimmingPoolsInferences,
  internal.migrations.removeSwimmingPoolPredictions,
  internal.migrations.removeSwimmingPoolFeedback,
  internal.migrations.migrateScansAndTiles,
  internal.migrations.migrateInferenceTileId,
  internal.migrations.migrateInferencePredictionsTileandDetectionId,
  internal.migrations.migrateFeedbackSubmissionsTileandBatchId,
]);
