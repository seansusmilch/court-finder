import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import type { DataModel } from './_generated/dataModel.js';
import { RoboflowPrediction } from './lib/roboflow.js';

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

export const runAll = migrations.runner([
  internal.migrations.migratePredictions,
]);
