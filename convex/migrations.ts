import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel, Id } from './_generated/dataModel';
import { pointToTile, tileCenterLatLng, pixelOnTileToLngLat } from './lib/tiles';
import { COURT_VERIFICATION, MARKER_DEDUP_BASE_RADIUS_M, MARKER_DEDUP_RADIUS_BY_CLASS_M } from './lib/constants';
import type { CourtStatus } from './lib/types';
import { haversineMeters } from './lib/spatial';

export const migrations = new Migrations<DataModel>(components.migrations);

export const migrateScansCenterTile = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const centerTile = pointToTile(doc.centerLat, doc.centerLong);
    return { centerTile };
  },
});

export const migrateScanUserIds = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const user = await ctx.db.query('users').order('asc').first();
    return { userId: user?._id };
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
    const prediction = await ctx.db.get(doc.predictionId);
    if (prediction?.class !== 'swimming-pool') return;
    await ctx.db.delete(doc._id);
  },
});

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

    // Calculate court coordinates from prediction pixel position
    const { lon, lat } = pixelOnTileToLngLat(
      tile.z,
      tile.x,
      tile.y,
      doc.x as number,
      doc.y as number,
      1024,
      1024,
      512
    );

    const courtId = await ctx.db.insert('courts', {
      latitude: lat,
      longitude: lon,
      class: doc.class,
      status,
      verifiedAt: status === 'verified' ? Date.now() : undefined,
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

export const linkPredictionsToCourtsByBboxOverlap = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.courtId) return;

    try {
      const overlappingCourt = await ctx.runQuery(
        internal.courts.findOverlappingCourt,
        {
          tileId: doc.tileId,
          pixelX: doc.x as number,
          pixelY: doc.y as number,
          pixelWidth: doc.width as number,
          pixelHeight: doc.height as number,
          class: doc.class,
        }
      );

      if (overlappingCourt) {
        await ctx.db.patch(doc._id, { courtId: overlappingCourt.courtId });
        console.log('[linkPredictionsToCourtsByBboxOverlap] linked to existing court', {
          predictionId: doc._id,
          courtId: overlappingCourt.courtId,
          overlapRatio: overlappingCourt.overlap,
        });
      } else {
        const courtId = await ctx.runMutation(
          internal.courts.createPendingCourtFromPrediction,
          { predictionId: doc._id }
        );
        await ctx.db.patch(doc._id, { courtId });
        console.log('[linkPredictionsToCourtsByBboxOverlap] created new court', {
          predictionId: doc._id,
          courtId,
        });
      }
    } catch (error) {
      console.error('[linkPredictionsToCourtsByBboxOverlap] error', {
        predictionId: doc._id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

export const fixCourtCoordinatesFromPixels = migrations.define({
  table: 'courts',
  migrateOne: async (ctx, doc) => {
    if (!doc.pixelX || !doc.pixelY || !doc.tileId) return;

    const tile = await ctx.db.get(doc.tileId);
    if (!tile) return;

    // Calculate correct lat/lng from pixel coordinates
    const { lon, lat } = pixelOnTileToLngLat(
      tile.z,
      tile.x,
      tile.y,
      doc.pixelX,
      doc.pixelY,
      1024,
      1024,
      512
    );

    // Check if coordinates need fixing (allow small floating point differences)
    const latDiff = Math.abs(doc.latitude - lat);
    const lngDiff = Math.abs(doc.longitude - lon);

    // If difference is significant (> 0.0001 degrees ~ 11 meters), fix it
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      console.log('[fixCourtCoordinatesFromPixels] fixing court coordinates', {
        courtId: doc._id,
        oldLat: doc.latitude,
        oldLng: doc.longitude,
        newLat: lat,
        newLng: lon,
        latDiff,
        lngDiff,
      });

      return {
        latitude: lat,
        longitude: lon,
      };
    }
  },
});

export const runAll = migrations.runner([
  // Scan migrations
  internal.migrations.migrateScansCenterTile,
  internal.migrations.migrateScanUserIds,

  // Swimming pool cleanup
  internal.migrations.removeSwimmingPoolPredictions,
  internal.migrations.removeSwimmingPoolFeedback,

  // Tile geocoding
  internal.migrations.migrateTilesReverseGeocode,

  // Court linking (legacy distance-based)
  internal.migrations.linkPredictionsToNearbyCourts,

  // Court generation from feedback
  internal.migrations.generateCourtsFromExistingFeedback,

  // Court linking (bbox overlap-based)
  internal.migrations.linkPredictionsToCourtsByBboxOverlap,

  // Coordinate fixes
  internal.migrations.fixCourtCoordinatesFromPixels,
]);
