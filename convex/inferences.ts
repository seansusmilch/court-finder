import { query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  styleTileUrl,
  type GeoJSONPointFeature,
} from './lib/tiles';
import type { CourtStatus } from './lib/types';

export const getAvailableZoomLevels = query({
  args: {},
  handler: async (ctx) => {
    const tiles = await ctx.db.query('tiles').collect();
    return [...new Set(tiles.map((tile) => tile.z))].sort((a, b) => a - b);
  },
});

export const getCourtImageData = query({
  args: {
    detectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();

    // Find the prediction by detection ID
    const predictions = await ctx.db
      .query('inference_predictions')
      .filter((q) => q.eq(q.field('roboflowDetectionId'), args.detectionId))
      .collect();

    if (predictions.length === 0) {
      return null;
    }

    const pred = predictions[0];
    const tile = await ctx.db.get(pred.tileId);
    if (!tile) {
      return null;
    }

    const result = {
      tileZ: tile.z,
      tileX: tile.x,
      tileY: tile.y,
      pixelX: pred.x as number,
      pixelY: pred.y as number,
      pixelWidth: pred.width as number,
      pixelHeight: pred.height as number,
      tileUrl: styleTileUrl(tile.z, tile.x, tile.y),
      class: pred.class,
      confidence: pred.confidence as number,
    };

    console.log('getCourtImageData', {
      durationMs: Date.now() - startTs,
      detectionId: args.detectionId,
      result: {
        tile: { z: tile.z, x: tile.x, y: tile.y },
        bbox: { x: pred.x, y: pred.y, width: pred.width, height: pred.height },
      },
    });

    return result;
  },
});

interface BBoxBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

function isCourtInBounds(court: { latitude: number; longitude: number }, bounds: BBoxBounds): boolean {
  return (
    court.latitude >= bounds.minLat &&
    court.latitude <= bounds.maxLat &&
    court.longitude >= bounds.minLng &&
    court.longitude <= bounds.maxLng
  );
}

function shouldIncludeCourt(court: { status: string }, statusFilter: string): boolean {
  if (statusFilter === 'verified') {
    return court.status === 'verified';
  }
  if (statusFilter === 'pending') {
    return court.status === 'pending' || court.status === 'verified';
  }
  return true;
}

export const featuresByViewport = query({
  args: {
    bbox: v.object({
      minLat: v.number(),
      minLng: v.number(),
      maxLat: v.number(),
      maxLng: v.number(),
    }),
    zoom: v.number(),
    confidenceThreshold: v.optional(v.number()),
    statusFilter: v.optional(
      v.union(
        v.literal('all'),
        v.literal('verified'),
        v.literal('pending')
      )
    ),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    const statusFilter = args.statusFilter ?? 'all';
    const confidenceThreshold = args.confidenceThreshold ?? 0;

    console.log('start', {
      startTs,
      bbox: args.bbox,
      zoom: args.zoom,
      statusFilter,
      confidenceThreshold,
    });

    const allCourts = await ctx.db.query('courts').collect();

    const filteredCourts = allCourts.filter((court) => {
      if (!shouldIncludeCourt(court, statusFilter)) {
        return false;
      }

      if (!isCourtInBounds(court, args.bbox)) {
        return false;
      }

      const courtConfidence = court.sourceConfidence ?? 1.0;
      if (courtConfidence < confidenceThreshold) {
        return false;
      }

      return court.tileId !== null && court.tileId !== undefined;
    });

    const tileIds = [
      ...new Set(filteredCourts.map((court) => court.tileId!)),
    ];
    const tiles = await Promise.all(
      tileIds.map((tileId) => ctx.db.get(tileId))
    );
    const tileMap = new Map(
      tiles
        .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
        .map((tile) => [tile._id, tile])
    );

    const sourcePredictionIds = [
      ...new Set(
        filteredCourts
          .map((court) => court.sourcePredictionId)
          .filter(
            (id): id is NonNullable<typeof id> => id !== null && id !== undefined
          )
      ),
    ];
    const sourcePredictions = await Promise.all(
      sourcePredictionIds.map((id) => ctx.db.get(id))
    );
    const sourcePredictionMap = new Map(
      sourcePredictions
        .filter(
          (prediction): prediction is NonNullable<typeof prediction> =>
            prediction !== null
        )
        .map((prediction) => [prediction._id, prediction.roboflowDetectionId])
    );

    const features: GeoJSONPointFeature[] = [];

    for (const court of filteredCourts) {
      const tile = tileMap.get(court.tileId!);
      if (!tile) continue;

      const detectionId = court.sourcePredictionId
        ? sourcePredictionMap.get(court.sourcePredictionId) ?? ''
        : '';

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
          detection_id: detectionId,
          status: court.status,
          verifiedAt: court.verifiedAt,
          sourceModel: court.sourceModel ?? '',
          sourceVersion: court.sourceVersion ?? '',
          totalFeedbackCount: court.totalFeedbackCount,
          positiveFeedbackCount: court.positiveFeedbackCount,
        },
      });
    }

    console.log('complete', {
      durationMs: Date.now() - startTs,
      statusFilter,
      confidenceThreshold,
      bbox: args.bbox,
      zoom: args.zoom,
      featureCount: features.length,
    });

    return { type: 'FeatureCollection', features } as const;
  },
});
