import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
  pixelOnTileToLngLat,
  tilesIntersectingBbox,
  type GeoJSONPointFeature,
} from './lib/tiles';
import { haversineMeters } from './lib/spatial';
import {
  COURT_VERIFICATION,
  MARKER_DEDUP_BASE_RADIUS_M,
  MARKER_DEDUP_RADIUS_BY_CLASS_M,
} from './lib/constants';
import type { CourtStatus } from './lib/types';

export const verifyFromFeedback = internalMutation({
  args: {
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();

    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      console.error('error: prediction not found', {
        predictionId: args.predictionId,
        action: 'verify_from_feedback',
      });
      throw new Error('Prediction not found');
    }

    const tile = await ctx.db.get(prediction.tileId);
    if (!tile) {
      console.error('error: tile not found', {
        tileId: prediction.tileId,
        predictionId: args.predictionId,
        action: 'verify_from_feedback',
      });
      throw new Error('Tile not found');
    }

    const feedback = await ctx.db
      .query('feedback_submissions')
      .filter((q) => q.eq(q.field('predictionId'), args.predictionId))
      .collect();

    const positiveCount = feedback.filter((f) => f.userResponse === 'yes').length;
    const positivePercentage = feedback.length > 0 ? positiveCount / feedback.length : 0;

    const hasPositiveFeedback = positiveCount > 0;
    const meetsThresholds =
      feedback.length >= COURT_VERIFICATION.MIN_FEEDBACK_COUNT &&
      positivePercentage >= COURT_VERIFICATION.MIN_POSITIVE_PERCENTAGE;

    const existingCourt = prediction.courtId ? await ctx.db.get(prediction.courtId) : null;

    if (existingCourt) {
      if (existingCourt.status === 'verified') {
        console.log('skipped', {
          durationMs: Date.now() - startTs,
          action: 'verify_from_feedback',
          predictionId: args.predictionId,
          courtId: existingCourt._id,
          reason: 'already_verified',
        });
        return existingCourt._id;
      }

    if (meetsThresholds) {
      await ctx.db.patch(existingCourt._id, {
        status: 'verified' as CourtStatus,
        verifiedAt: Date.now(),
        totalFeedbackCount: feedback.length,
        positiveFeedbackCount: positiveCount,
      });

      await updateFeedbackCourtIds(ctx, args.predictionId, existingCourt._id);

        console.log('complete', {
          durationMs: Date.now() - startTs,
          action: 'verify_from_feedback',
          predictionId: args.predictionId,
          courtId: existingCourt._id,
          previousStatus: existingCourt.status,
          newStatus: 'verified',
          feedbackCount: feedback.length,
          positiveCount,
          positivePercentage: (positivePercentage * 100).toFixed(2),
        });
        return existingCourt._id;
      }

      console.log('skipped', {
        durationMs: Date.now() - startTs,
        action: 'verify_from_feedback',
        predictionId: args.predictionId,
        courtId: existingCourt._id,
        reason: 'pending_but_thresholds_not_met',
        feedbackCount: feedback.length,
        positiveCount,
        positivePercentage: (positivePercentage * 100).toFixed(2),
        minCount: COURT_VERIFICATION.MIN_FEEDBACK_COUNT,
        minPercentage: (
          COURT_VERIFICATION.MIN_POSITIVE_PERCENTAGE * 100
        ).toFixed(2),
      });
      return null;
    }

    if (hasPositiveFeedback) {
      const courtStatus: CourtStatus = meetsThresholds ? 'verified' : 'pending';
      const court = await createCourtFromPrediction(ctx, {
        prediction,
        tile,
        positiveCount,
        totalFeedbackCount: feedback.length,
        courtStatus,
      });

      await updateFeedbackCourtIds(ctx, args.predictionId, court.id);

      console.log('complete', {
        durationMs: Date.now() - startTs,
        action: 'verify_from_feedback',
        predictionId: args.predictionId,
        courtId: court.id,
        status: courtStatus,
        feedbackCount: feedback.length,
        positiveCount,
        positivePercentage: (positivePercentage * 100).toFixed(2),
      });
      return court.id;
    }

    console.log('skipped', {
      durationMs: Date.now() - startTs,
      action: 'verify_from_feedback',
      predictionId: args.predictionId,
      reason: 'no_positive_feedback_yet',
      feedbackCount: feedback.length,
      positiveCount,
    });
    return null;
  },
});

async function updateFeedbackCourtIds(
  ctx: MutationCtx,
  predictionId: Id<'inference_predictions'>,
  courtId: Id<'courts'>
) {
  const feedback = await ctx.db
    .query('feedback_submissions')
    .filter((q) => q.eq(q.field('predictionId'), predictionId))
    .collect();

  for (const f of feedback) {
    await ctx.db.patch(f._id, { courtId });
  }
}

async function createCourtFromPrediction(
  ctx: MutationCtx,
  args: {
    prediction: {
      _id: Id<'inference_predictions'>;
      tileId: Id<'tiles'>;
      class: string;
      confidence: number;
      x: number;
      y: number;
      width: number;
      height: number;
      model?: string;
      version?: string;
    };
    tile: { z: number; x: number; y: number };
    positiveCount: number;
    totalFeedbackCount: number;
    courtStatus: CourtStatus;
  }
) {
  const { lon, lat } = pixelOnTileToLngLat(
    args.tile.z,
    args.tile.x,
    args.tile.y,
    args.prediction.x,
    args.prediction.y,
    1024,
    1024,
    512
  );

  const isVerified = args.courtStatus === 'verified';

  const courtId = await ctx.db.insert('courts', {
    latitude: lat,
    longitude: lon,
    class: args.prediction.class,
    status: args.courtStatus,
    verifiedAt: isVerified ? Date.now() : undefined,
    sourcePredictionId: args.prediction._id,
    sourceModel: args.prediction.model,
    sourceVersion: args.prediction.version,
    sourceConfidence: args.prediction.confidence,
    totalFeedbackCount: args.totalFeedbackCount,
    positiveFeedbackCount: args.positiveCount,
    tileId: args.prediction.tileId,
    pixelX: args.prediction.x,
    pixelY: args.prediction.y,
    pixelWidth: args.prediction.width,
    pixelHeight: args.prediction.height,
  });

  await ctx.db.patch(args.prediction._id, {
    courtId,
  });

  return { id: courtId, status: args.courtStatus };
}

export const autoLinkPrediction = internalMutation({
  args: {
    courtId: v.id('courts'),
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();

    const court = await ctx.db.get(args.courtId);
    const prediction = await ctx.db.get(args.predictionId);

    if (!court || !prediction) {
      console.error('error: record not found', {
        courtId: args.courtId,
        predictionId: args.predictionId,
        action: 'auto_link_prediction',
      });
      throw new Error('Court or prediction not found');
    }

    if (court.class !== prediction.class) {
      console.log('skipped', {
        durationMs: Date.now() - startTs,
        action: 'auto_link_prediction',
        courtId: args.courtId,
        predictionId: args.predictionId,
        reason: 'class_mismatch',
        courtClass: court.class,
        predictionClass: prediction.class,
      });
      return;
    }

    if (prediction.courtId) {
      console.log('skipped', {
        durationMs: Date.now() - startTs,
        action: 'auto_link_prediction',
        courtId: args.courtId,
        predictionId: args.predictionId,
        reason: 'already_linked',
        existingCourtId: prediction.courtId,
      });
      return;
    }

    await ctx.db.patch(prediction._id, {
      courtId: args.courtId,
    });

    console.log('complete', {
      durationMs: Date.now() - startTs,
      action: 'auto_link_prediction',
      courtId: args.courtId,
      predictionId: args.predictionId,
    });
  },
});

export const findNearbyCourt = internalQuery({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    class: v.string(),
  },
  handler: async (ctx, args) => {
    const radiusMeters =
      MARKER_DEDUP_RADIUS_BY_CLASS_M[args.class] ?? MARKER_DEDUP_BASE_RADIUS_M;

    const courts = await ctx.db
      .query('courts')
      .withIndex('by_status', (q) => q.eq('status', 'verified'))
      .collect();

    let nearestCourt: { id: Id<'courts'>; distance: number } | null = null;
    let nearestDistance = Infinity;

    for (const court of courts) {
      if (court.class !== args.class) continue;

      const distance = haversineMeters(
        { lat: args.latitude, lng: args.longitude },
        { lat: court.latitude, lng: court.longitude }
      );

      if (distance <= radiusMeters && distance < nearestDistance) {
        nearestDistance = distance;
        nearestCourt = { id: court._id, distance };
      }
    }

    return nearestCourt;
  },
});

export const listByViewport = query({
  args: {
    bbox: v.object({
      minLat: v.number(),
      minLng: v.number(),
      maxLat: v.number(),
      maxLng: v.number(),
    }),
    zoom: v.number(),
    statusFilter: v.optional(
      v.union(v.literal('all'), v.literal('verified'), v.literal('pending'))
    ),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    const statusFilter = args.statusFilter ?? 'all';

    const tiles = tilesIntersectingBbox(args.bbox, args.zoom);
    const tileIds = new Set(tiles.map((t) => `${t.z}:${t.x}:${t.y}`));

    let courts = await ctx.db.query('courts').collect();

    if (statusFilter === 'verified') {
      courts = courts.filter((c) => c.status === 'verified');
    } else if (statusFilter === 'pending') {
      courts = courts.filter((c) => c.status === 'pending');
    }

    const features: GeoJSONPointFeature[] = [];

    for (const court of courts) {
      const tile = court.tileId ? await ctx.db.get(court.tileId) : null;
      if (!tile) continue;

      const tileKey = `${tile.z}:${tile.x}:${tile.y}`;
      if (!tileIds.has(tileKey)) continue;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [court.longitude, court.latitude],
        },
        properties: {
          z: tile.z,
          x: tile.x,
          y: tile.y,
          class: court.class,
          class_id: 0,
          confidence: court.sourceConfidence ?? 1.0,
          detection_id: '',
          status: court.status,
          verifiedAt: court.verifiedAt,
          sourceModel: court.sourceModel,
          sourceVersion: court.sourceVersion,
          totalFeedbackCount: court.totalFeedbackCount,
          positiveFeedbackCount: court.positiveFeedbackCount,
        },
      });
    }

    console.log('complete', {
      durationMs: Date.now() - startTs,
      action: 'list_courts_by_viewport',
      statusFilter,
      bbox: args.bbox,
      zoom: args.zoom,
      featureCount: features.length,
    });

    return { type: 'FeatureCollection', features } as const;
  },
});

export const getByPredictionId = query({
  args: {
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) return null;

    if (prediction.courtId) {
      return await ctx.db.get(prediction.courtId);
    }

    return null;
  },
});
