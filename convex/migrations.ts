import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel, Id } from './_generated/dataModel';
import { pointToTile, tileCenterLatLng } from './lib/tiles';
import { COURT_VERIFICATION, MARKER_DEDUP_BASE_RADIUS_M, MARKER_DEDUP_RADIUS_BY_CLASS_M } from './lib/constants';
import type { CourtStatus } from './lib/types';
import { haversineMeters } from './lib/spatial';

export const migrations = new Migrations<DataModel>(components.migrations);

// export const migratePredictions = migrations.define({
//   table: 'inferences',
//   migrateOne: async (ctx, doc) => {
//     const predictions: RoboflowPrediction[] = doc.response.predictions;
//     const predictionIds = await Promise.all(
//       predictions.map(async (prediction) => {
//         return await ctx.runMutation(internal.inference_predictions.upsert, {
//           tileId: doc.tileId as Id<'tiles'>,
//           model: doc.model ?? 'unknown',
//           version: doc.version ?? 'unknown',
//           prediction,
//         });
//       })
//     );
//     console.log('[migratePredictions] upserted predictions', {
//       inferenceId: doc._id,
//       predictionIds,
//     });
//     return doc;
//   },
// });

export const migrateScansCenterTile = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const centerTile = pointToTile(doc.centerLat, doc.centerLong);
    return { centerTile };
  },
});

// export const removeSwimmingPoolsInferences = migrations.define({
//   table: 'inferences',
//   migrateOne: async (ctx, doc) => {
//     const response: RoboflowResponse = doc.response;
//     const predictions: RoboflowPrediction[] = response.predictions;
//     const filteredPredictions = predictions.filter(
//       (prediction) => prediction.class !== 'swimming-pool'
//     );

//     response.predictions = Array.from(filteredPredictions);
//     return { response };
//   },
// });

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

// export const migrateScansAndTiles = migrations.define({
//   table: 'scans',
//   migrateOne: async (ctx, doc) => {
//     const tileCoords = doc.tiles || [];

//     // First, ensure all tiles exist
//     for (const tileCoord of tileCoords) {
//       const tileId = await ctx.runMutation(
//         internal.tiles.insertTileIfNotExists,
//         {
//           x: tileCoord.x,
//           y: tileCoord.y,
//           z: tileCoord.z,
//         }
//       );
//       // Then, create relationships without duplicates
//       await ctx.runMutation(
//         internal.scans_x_tiles.insertScanTileRelationshipIfNotExists,
//         {
//           scanId: doc._id,
//           tileId,
//         }
//       );
//     }

//     return {
//       model: ROBOFLOW_MODEL_NAME,
//       version: ROBOFLOW_MODEL_VERSION,
//       radius: DEFAULT_TILE_RADIUS,
//       tiles: undefined,
//     };
//   },
// });

// export const migrateInferenceTileId = migrations.define({
//   table: 'inferences',
//   migrateOne: async (ctx, doc: Doc<'inferences'>) => {
//     console.log('[migrateInferenceTileId] doc', doc);
//     if (doc.tileId) return;
//     const createdTileId: Id<'tiles'> = await ctx.runMutation(
//       internal.tiles.insertTileIfNotExists,
//       {
//         x: doc.x,
//         y: doc.y,
//         z: doc.z,
//       }
//     );
//     return { tileId: createdTileId };
//   },
// });

// export const migrateInferencePredictionsTileandDetectionId = migrations.define({
//   table: 'inference_predictions',
//   migrateOne: async (ctx, doc) => {
//     const inference = await ctx.db.get(doc.inferenceId);
//     if (!inference?.tileId) return;

//     return {
//       tileId: inference.tileId,
//       roboflowDetectionId: doc.detectionId,
//       detectionId: undefined,
//     };
//   },
// });

// export const migrateFeedbackSubmissionsTileandBatchId = migrations.define({
//   table: 'feedback_submissions',
//   migrateOne: async (ctx, doc) => {
//     const prediction = await ctx.db.get(doc.predictionId);
//     const tileId = prediction?.tileId;
//     const batchId = doc.lastBatchId;

//     return {
//       tileId,
//       batchId,
//       inferenceId: undefined,
//       lastBatchId: undefined,
//       uploadStatus: undefined,
//     };
//   },
// });

export const migrateScanUserIds = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const user = await ctx.db.query('users').order('asc').first();
    return { userId: user?._id };
  },
});

// export const migrateInferencesDeletedFields = migrations.define({
//   table: 'inferences',
//   migrateOne: async (ctx, doc) => {
//     return {
//       z: undefined,
//       x: undefined,
//       y: undefined,
//       requestedAt: undefined,
//       imageUrl: undefined,
//     };
//   },
// });

// export const migrateInferenceToPredictions = migrations.define({
//   table: 'inference_predictions',
//   migrateOne: async (ctx, doc) => {
//     if (!doc.inferenceId) return;
//     const inference = await ctx.db.get(doc.inferenceId);
//     if (!inference) return;
//     return {
//       inferenceId: undefined,
//       model: inference.model,
//       version: inference.version,
//       roboflowInferenceId: inference.response.inference_id,
//     };
//   },
// });

export const migrateTilesReverseGeocode = migrations.define({
  table: 'tiles',
  migrateOne: async (ctx, doc) => {
    if (doc.reverseGeocode && !parseInt(doc.reverseGeocode[0])) return;
    const { lat, lng } = tileCenterLatLng(doc.z, doc.x, doc.y);

    // Schedule the geocoding action to run after the migration completes
    await ctx.scheduler.runAfter(0, internal.geocoding.revGeocode, {
      lat,
      lng,
      tileId: doc._id,
    });
  },
});

export const linkPredictionsToNearbyCourts = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.courtId) return;

    const tile = await ctx.db.get(doc.tileId);
    if (!tile) return;

    const { lat, lng } = tileCenterLatLng(tile.z, tile.x, tile.y);

    const radiusMeters =
      MARKER_DEDUP_RADIUS_BY_CLASS_M[doc.class] ?? MARKER_DEDUP_BASE_RADIUS_M;

    const courts = await ctx.db.query('courts').collect();

    let nearestCourt: { id: Id<'courts'>; distance: number } | null = null;
    let nearestDistance = Infinity;

    for (const court of courts) {
      if (court.class !== doc.class) continue;

      const distance = haversineMeters(
        { lat, lng },
        { lat: court.latitude, lng: court.longitude }
      );

      if (distance <= radiusMeters && distance < nearestDistance) {
        nearestDistance = distance;
        nearestCourt = { id: court._id, distance };
      }
    }

    if (!nearestCourt) return;

    await ctx.db.patch(doc._id, { courtId: nearestCourt.id });

    console.log('[linkPredictionsToNearbyCourts] linked prediction to court', {
      predictionId: doc._id,
      courtId: nearestCourt.id,
      distance: nearestCourt.distance,
      class: doc.class,
    });
  },
});

export const generateCourtsFromExistingFeedback = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.courtId) return;

    const feedback = await ctx.db
      .query('feedback_submissions')
      .filter((q) => q.eq(q.field('predictionId'), doc._id))
      .collect();

    if (feedback.length === 0) return;

    const positiveCount = feedback.filter((f) => f.userResponse === 'yes').length;
    const positivePercentage = feedback.length > 0 ? positiveCount / feedback.length : 0;

    const hasPositiveFeedback = positiveCount > 0;
    const meetsThresholds =
      feedback.length >= COURT_VERIFICATION.MIN_FEEDBACK_COUNT &&
      positivePercentage >= COURT_VERIFICATION.MIN_POSITIVE_PERCENTAGE;

    if (!hasPositiveFeedback) return;

    const status: CourtStatus = meetsThresholds ? 'verified' : 'pending';

    const tile = await ctx.db.get(doc.tileId);
    if (!tile) return;

    const { lat, lng } = tileCenterLatLng(tile.z, tile.x, tile.y);

    const isVerified = status === 'verified';

    const courtId = await ctx.db.insert('courts', {
      latitude: lat,
      longitude: lng,
      class: doc.class,
      status,
      verifiedAt: isVerified ? Date.now() : undefined,
      sourcePredictionId: doc._id,
      sourceModel: doc.model,
      sourceVersion: doc.version,
      sourceConfidence: doc.confidence,
      totalFeedbackCount: feedback.length,
      positiveFeedbackCount: positiveCount,
      tileId: doc.tileId,
      pixelX: doc.x,
      pixelY: doc.y,
      pixelWidth: doc.width,
      pixelHeight: doc.height,
    });

    await ctx.db.patch(doc._id, { courtId });

    for (const f of feedback) {
      await ctx.db.patch(f._id, { courtId });
    }

    console.log('[generateCourtsFromExistingFeedback] created court', {
      predictionId: doc._id,
      courtId,
      status,
      feedbackCount: feedback.length,
      positiveCount,
      positivePercentage: (positivePercentage * 100).toFixed(2),
    });
  },
});

export const runAll = migrations.runner([
  // internal.migrations.migratePredictions,
  internal.migrations.migrateScansCenterTile,
  // internal.migrations.removeSwimmingPoolsInferences,
  internal.migrations.removeSwimmingPoolPredictions,
  internal.migrations.removeSwimmingPoolFeedback,
  // internal.migrations.migrateScansAndTiles,
  // internal.migrations.migrateInferenceTileId,
  // internal.migrations.migrateInferencePredictionsTileandDetectionId,
  // internal.migrations.migrateFeedbackSubmissionsTileandBatchId,
  internal.migrations.migrateScanUserIds,
  // internal.migrations.migrateInferencesDeletedFields,
  // internal.migrations.migrateInferenceToPredictions,
  internal.migrations.migrateTilesReverseGeocode,
  internal.migrations.linkPredictionsToNearbyCourts,
  internal.migrations.generateCourtsFromExistingFeedback,
]);
