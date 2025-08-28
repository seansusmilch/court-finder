import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import type { DataModel } from './_generated/dataModel.js';
import { RoboflowPrediction, RoboflowResponse } from './lib/roboflow.js';
import { pointToTile } from './lib/tiles.js';

export const migrations = new Migrations<DataModel>(components.migrations);

export const migratePredictions = migrations.define({
  table: 'inferences',
  migrateOne: async (ctx, doc) => {
    const predictions: RoboflowPrediction[] = doc.response.predictions;
    const predictionIds = await Promise.all(
      predictions.map(async (prediction) => {
        return await ctx.runMutation(internal.inference_predictions.upsert, {
          inferenceId: doc._id,
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

export const runAll = migrations.runner([
  // internal.migrations.migratePredictions,
  // internal.migrations.migrateScansCenterTile,
  internal.migrations.removeSwimmingPoolsInferences,
  internal.migrations.removeSwimmingPoolPredictions,
  internal.migrations.removeSwimmingPoolFeedback,
]);
