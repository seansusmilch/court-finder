import { internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

interface PredictionUpsertData {
  roboflowInferenceId: string;
  roboflowDetectionId: string;
  tileId: Id<'tiles'>;
  class: string;
  classId: number | undefined;
  confidence: number;
  height: number;
  width: number;
  x: number;
  y: number;
  model: string;
  version: string;
}

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
  detection_id: string;
}

function buildPredictionUpsertData(
  tileId: Id<'tiles'>,
  model: string,
  version: string,
  inference_id: string,
  prediction: RoboflowPrediction
): PredictionUpsertData {
  return {
    roboflowInferenceId: inference_id,
    roboflowDetectionId: prediction.detection_id,
    tileId,
    class: prediction.class,
    classId: prediction.class_id,
    confidence: prediction.confidence,
    height: prediction.height,
    width: prediction.width,
    x: prediction.x,
    y: prediction.y,
    model,
    version,
  };
}

async function linkPredictionToCourt(
  ctx: MutationCtx,
  predictionId: Id<'inference_predictions'>,
  tileId: Id<'tiles'>,
  pixelX: number,
  pixelY: number,
  pixelWidth: number,
  pixelHeight: number,
  courtClass: string
): Promise<void> {
  const overlappingCourt = await ctx.runQuery(
    internal.courts.findOverlappingCourt,
    {
      tileId,
      pixelX,
      pixelY,
      pixelWidth,
      pixelHeight,
      class: courtClass,
    }
  );

  if (overlappingCourt) {
    await ctx.db.patch(predictionId, { courtId: overlappingCourt.courtId });
    console.log('linked_to_existing_court', {
      predictionId,
      courtId: overlappingCourt.courtId,
      overlapRatio: overlappingCourt.overlap,
      algorithm: 'bbox_overlap_75pct',
    });
  } else {
    const courtId = await ctx.runMutation(
      internal.courts.createPendingCourtFromPrediction,
      { predictionId }
    );
    await ctx.db.patch(predictionId, { courtId });
    console.log('created_new_court', {
      predictionId,
      courtId,
      reason: 'no_overlapping_court_found',
    });
  }
}

export const upsert = internalMutation({
  args: {
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
    inference_id: v.string(),
    prediction: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
      confidence: v.number(),
      class: v.string(),
      class_id: v.optional(v.number()),
      detection_id: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Check for existing prediction
    const existing = await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile_model_version_detection', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
          .eq('roboflowDetectionId', args.prediction.detection_id)
      )
      .unique();

    const updateData = buildPredictionUpsertData(
      args.tileId,
      args.model,
      args.version,
      args.inference_id,
      args.prediction
    );
    let predictionId: Id<'inference_predictions'>;

    // Upsert prediction
    if (existing) {
      await ctx.db.patch(existing._id, updateData);
      console.log('patched', {
        table: 'inference_predictions',
        predictionId: existing._id,
        fields: Object.keys(updateData),
        tileId: args.tileId,
        model: args.model,
        version: args.version,
      });
      predictionId = existing._id;
    } else {
      const id = await ctx.db.insert('inference_predictions', updateData);
      console.log('created', {
        table: 'inference_predictions',
        predictionId: id,
        data: {
          tileId: args.tileId,
          model: args.model,
          version: args.version,
          class: args.prediction.class,
          confidence: args.prediction.confidence,
        },
      });
      predictionId = id as Id<'inference_predictions'>;
    }

    // Verify tile exists before court linking
    const tile = await ctx.db.get(args.tileId);
    if (!tile) {
      console.error('error: tile not found during court linking', {
        tileId: args.tileId,
        predictionId,
        action: 'upsert_prediction',
      });
      return predictionId;
    }

    // Link prediction to court (find existing or create new)
    await linkPredictionToCourt(
      ctx,
      predictionId,
      args.tileId,
      updateData.x,
      updateData.y,
      updateData.width,
      updateData.height,
      updateData.class
    );

    return predictionId;
  },
});

export const listByTileModelVersion = internalQuery({
  args: {
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile_model_version', (q) =>
        q
          .eq('tileId', args.tileId)
          .eq('model', args.model)
          .eq('version', args.version)
      )
      .collect();
  },
});

export const listByTile = internalQuery({
  args: { tileId: v.id('tiles') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('inference_predictions')
      .withIndex('by_tile', (q) => q.eq('tileId', args.tileId))
      .collect();
  },
});
