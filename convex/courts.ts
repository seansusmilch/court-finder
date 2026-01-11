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

    if (!prediction.courtId) {
      console.error('error: prediction has no courtId', {
        predictionId: args.predictionId,
        action: 'verify_from_feedback',
      });
      throw new Error('Prediction has no courtId');
    }

    const court = await ctx.db.get(prediction.courtId);
    if (!court) {
      console.error('error: court not found', {
        courtId: prediction.courtId,
        predictionId: args.predictionId,
        action: 'verify_from_feedback',
      });
      throw new Error('Court not found');
    }

    const allCourtPredictions = await ctx.db
      .query('inference_predictions')
      .withIndex('by_court', (q) => q.eq('courtId', court._id))
      .collect();

    if (allCourtPredictions.length === 0) {
      console.error('error: court has no predictions', {
        courtId: court._id,
        predictionId: args.predictionId,
        action: 'verify_from_feedback',
      });
      throw new Error('Court has no predictions linked to it');
    }

    const allPredictionIds = allCourtPredictions.map((p) => p._id);

    const allFeedback = await ctx.db
      .query('feedback_submissions')
      .filter((q) =>
        q.or(
          ...allPredictionIds.map((id) => q.eq(q.field('predictionId'), id))
        )
      )
      .collect();

    const positiveFeedbackCount = allFeedback.filter(
      (f) => f.userResponse === 'yes'
    ).length;
    const totalFeedbackCount = allFeedback.length;
    const positivePercentage =
      totalFeedbackCount > 0 ? positiveFeedbackCount / totalFeedbackCount : 0;

    const meetsThresholds =
      totalFeedbackCount >= COURT_VERIFICATION.MIN_FEEDBACK_COUNT &&
      positivePercentage >= COURT_VERIFICATION.MIN_POSITIVE_PERCENTAGE;

    const courtStatus: CourtStatus = meetsThresholds ? 'verified' : 'pending';

    await ctx.db.patch(court._id, {
      status: courtStatus,
      verifiedAt: courtStatus === 'verified' ? Date.now() : court.verifiedAt,
      totalFeedbackCount,
      positiveFeedbackCount,
    });

    for (const feedback of allFeedback) {
      if (feedback.courtId !== court._id) {
        await ctx.db.patch(feedback._id, { courtId: court._id });
      }
    }

    console.log('complete', {
      durationMs: Date.now() - startTs,
      action: 'verify_from_feedback',
      predictionId: args.predictionId,
      courtId: court._id,
      previousStatus: court.status,
      newStatus: courtStatus,
      linkedPredictionsCount: allCourtPredictions.length,
      totalFeedbackCount,
      positiveFeedbackCount,
      positivePercentage: (positivePercentage * 100).toFixed(2),
      meetsThresholds,
    });

    return court._id;
  },
});

export const createPendingCourtFromPrediction = internalMutation({
  args: {
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      console.error('error: prediction not found', {
        predictionId: args.predictionId,
        action: 'create_pending_court',
      });
      throw new Error('Prediction not found');
    }

    const tile = await ctx.db.get(prediction.tileId);
    if (!tile) {
      console.error('error: tile not found', {
        tileId: prediction.tileId,
        predictionId: args.predictionId,
        action: 'create_pending_court',
      });
      throw new Error('Tile not found');
    }

    const { lon, lat } = pixelOnTileToLngLat(
      tile.z,
      tile.x,
      tile.y,
      prediction.x as number,
      prediction.y as number,
      1024,
      1024,
      512
    );

    const courtId = await ctx.db.insert('courts', {
      latitude: lat,
      longitude: lon,
      class: prediction.class,
      status: 'pending' as CourtStatus,
      sourcePredictionId: args.predictionId,
      sourceModel: prediction.model,
      sourceVersion: prediction.version,
      sourceConfidence: prediction.confidence as number,
      totalFeedbackCount: 0,
      positiveFeedbackCount: 0,
      tileId: prediction.tileId,
      pixelX: prediction.x as number,
      pixelY: prediction.y as number,
      pixelWidth: prediction.width as number,
      pixelHeight: prediction.height as number,
    });

    console.log('created_pending_court', {
      predictionId: args.predictionId,
      courtId,
      class: prediction.class,
      latitude: lat,
      longitude: lon,
    });

    return courtId;
  },
});

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

    const courts = await ctx.db.query('courts').collect();

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
