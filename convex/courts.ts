import { internalMutation, internalQuery, query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  pixelOnTileToLngLat,
  type GeoJSONPointFeature,
} from './lib/tiles';
import { bboxOverlapMeetsThreshold, bboxIntersectionArea, type BBox } from './lib/bbox';
import { COURT_VERIFICATION, BBOX_OVERLAP_THRESHOLD } from './lib/constants';
import type { CourtStatus } from './lib/types';

interface CourtVerificationMetrics {
  totalFeedbackCount: number;
  positiveFeedbackCount: number;
  positivePercentage: number;
  meetsThresholds: boolean;
  status: CourtStatus;
}

async function getPredictionOrThrow(
  ctx: MutationCtx,
  predictionId: Id<'inference_predictions'>
) {
  const prediction = await ctx.db.get(predictionId);
  if (!prediction) {
    console.error('error: prediction not found', { predictionId });
    throw new Error('Prediction not found');
  }
  return prediction;
}

async function getCourtOrThrow(
  ctx: MutationCtx,
  courtId: Id<'courts'>
) {
  const court = await ctx.db.get(courtId);
  if (!court) {
    console.error('error: court not found', { courtId });
    throw new Error('Court not found');
  }
  return court;
}

function calculateVerificationMetrics(
  positiveCount: number,
  totalCount: number
): CourtVerificationMetrics {
  const positivePercentage = totalCount > 0 ? positiveCount / totalCount : 0;
  const meetsThresholds =
    totalCount >= COURT_VERIFICATION.MIN_FEEDBACK_COUNT &&
    positivePercentage >= COURT_VERIFICATION.MIN_POSITIVE_PERCENTAGE;

  return {
    totalFeedbackCount: totalCount,
    positiveFeedbackCount: positiveCount,
    positivePercentage,
    meetsThresholds,
    status: meetsThresholds ? 'verified' : 'pending',
  };
}

async function createCourtFromPrediction(
  ctx: MutationCtx,
  prediction: { _id: Id<'inference_predictions'>; class?: string; confidence: number | null | undefined; x: number | null; y: number | null; width: number | null; height: number | null; model?: string; version?: string; tileId: Id<'tiles'> },
  status: CourtStatus = 'pending',
  verifiedAt?: number,
  totalFeedbackCount = 0,
  positiveFeedbackCount = 0
): Promise<Id<'courts'>> {
  const tile = await ctx.db.get(prediction.tileId);
  if (!tile) {
    console.error('error: tile not found', { tileId: prediction.tileId });
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

  return ctx.db.insert('courts', {
    latitude: lat,
    longitude: lon,
    class: prediction.class ?? 'unknown',
    status,
    verifiedAt,
    sourcePredictionId: prediction._id,
    sourceModel: prediction.model ?? 'unknown',
    sourceVersion: prediction.version ?? 'unknown',
    sourceConfidence: prediction.confidence as number,
    totalFeedbackCount,
    positiveFeedbackCount,
    tileId: prediction.tileId,
    pixelX: prediction.x as number,
    pixelY: prediction.y as number,
    pixelWidth: prediction.width as number,
    pixelHeight: prediction.height as number,
  });
}

export const verifyFromFeedback = internalMutation({
  args: {
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();

    const prediction = await getPredictionOrThrow(ctx, args.predictionId);

    if (!prediction.courtId) {
      console.error('error: prediction has no courtId', { predictionId: args.predictionId });
      throw new Error('Prediction has no courtId');
    }

    const court = await getCourtOrThrow(ctx, prediction.courtId);

    // Gather all feedback for this court (including predictions linked to it)
    const allCourtPredictions = await ctx.db
      .query('inference_predictions')
      .withIndex('by_court', (q) => q.eq('courtId', court._id))
      .collect();

    if (allCourtPredictions.length === 0) {
      console.error('error: court has no predictions', { courtId: court._id });
      throw new Error('Court has no predictions linked to it');
    }

    const allFeedback = await ctx.db
      .query('feedback_submissions')
      .filter((q) =>
        q.or(
          ...allCourtPredictions.map((p) => q.eq(q.field('predictionId'), p._id))
        )
      )
      .collect();

    const positiveCount = allFeedback.filter((f) => f.userResponse === 'yes').length;
    const metrics = calculateVerificationMetrics(positiveCount, allFeedback.length);

    // Update court status
    await ctx.db.patch(court._id, {
      status: metrics.status,
      verifiedAt: metrics.status === 'verified' ? Date.now() : court.verifiedAt,
      totalFeedbackCount: metrics.totalFeedbackCount,
      positiveFeedbackCount: metrics.positiveFeedbackCount,
    });

    // Link feedback to court
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
      newStatus: metrics.status,
      linkedPredictionsCount: allCourtPredictions.length,
      ...metrics,
      positivePercentage: (metrics.positivePercentage * 100).toFixed(2),
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
      console.error('error: prediction not found', { predictionId: args.predictionId });
      throw new Error('Prediction not found');
    }

    const courtId = await createCourtFromPrediction(ctx, prediction);

    console.log('created_pending_court', {
      predictionId: args.predictionId,
      courtId,
      class: prediction.class,
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
      });
      throw new Error('Court or prediction not found');
    }

    // Skip if classes don't match
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

    // Skip if already linked
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

    await ctx.db.patch(prediction._id, { courtId: args.courtId });

    console.log('complete', {
      durationMs: Date.now() - startTs,
      action: 'auto_link_prediction',
      courtId: args.courtId,
      predictionId: args.predictionId,
    });
  },
});

export const findOverlappingCourt = internalQuery({
  args: {
    tileId: v.id('tiles'),
    pixelX: v.number(),
    pixelY: v.number(),
    pixelWidth: v.number(),
    pixelHeight: v.number(),
    class: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.pixelX < 0 || args.pixelY < 0) {
      console.error('error: invalid pixel coordinates', {
        tileId: args.tileId,
        pixelX: args.pixelX,
        pixelY: args.pixelY,
      });
      throw new Error('Pixel coordinates must be non-negative');
    }

    if (args.pixelWidth <= 0 || args.pixelHeight <= 0) {
      console.error('error: invalid dimensions', {
        tileId: args.tileId,
        pixelWidth: args.pixelWidth,
        pixelHeight: args.pixelHeight,
      });
      throw new Error('Width and height must be positive');
    }

    const searchBbox: BBox = {
      x: args.pixelX,
      y: args.pixelY,
      width: args.pixelWidth,
      height: args.pixelHeight,
    };

    // Get all candidate courts (same tile and class)
    const allCourts = await ctx.db.query('courts').collect();
    const candidateCourts = allCourts.filter((court) => {
      if (court.tileId !== args.tileId) return false;
      if (court.class !== args.class) return false;
      if (!court.pixelX || !court.pixelY || !court.pixelWidth || !court.pixelHeight) {
        return false;
      }
      return true;
    });

    // Find court with maximum IoU that meets overlap threshold
    let bestMatch: { courtId: Id<'courts'>; overlap: number } | null = null;
    let maxOverlap = 0;

    for (const court of candidateCourts) {
      const courtBbox: BBox = {
        x: court.pixelX!,
        y: court.pixelY!,
        width: court.pixelWidth!,
        height: court.pixelHeight!,
      };

      if (bboxOverlapMeetsThreshold(searchBbox, courtBbox, BBOX_OVERLAP_THRESHOLD)) {
        const intersection = bboxIntersectionArea(searchBbox, courtBbox);
        const searchArea = args.pixelWidth * args.pixelHeight;
        const courtArea = court.pixelWidth! * court.pixelHeight!;
        const union = searchArea + courtArea - intersection;
        const iou = union > 0 ? intersection / union : 0;

        if (iou > maxOverlap) {
          maxOverlap = iou;
          bestMatch = { courtId: court._id, overlap: iou };
        }
      }
    }

    return bestMatch;
  },
});

async function updateCourtStatusInternal(
  ctx: MutationCtx,
  courtId: Id<'courts'>,
  status: CourtStatus,
  userId?: Id<'users'>
): Promise<Id<'courts'>> {
  const court = await getCourtOrThrow(ctx, courtId);

  await ctx.db.patch(courtId, {
    status,
    verifiedAt: status === 'verified' ? Date.now() : court.verifiedAt,
  });

  console.log('court_status_updated', {
    courtId,
    userId,
    previousStatus: court.status,
    newStatus: status,
  });

  return courtId;
}

export const setCourtStatus = internalMutation({
  args: {
    courtId: v.id('courts'),
    status: v.union(v.literal('verified'), v.literal('pending'), v.literal('rejected')),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return updateCourtStatusInternal(ctx, args.courtId, args.status, args.userId);
  },
});

export const updateCourtStatus = mutation({
  args: {
    courtId: v.id('courts'),
    status: v.union(v.literal('verified'), v.literal('pending'), v.literal('rejected')),
  },
  handler: async (ctx, args): Promise<Id<'courts'>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const user = await ctx.db.get(userId);
    const isAdmin = user?.permissions?.includes('admin.access');

    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    return updateCourtStatusInternal(ctx, args.courtId, args.status, userId);
  },
});

export const getByPredictionId = query({
  args: {
    predictionId: v.id('inference_predictions'),
  },
  handler: async (ctx, args) => {
    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction?.courtId) return null;

    return ctx.db.get(prediction.courtId);
  },
});
