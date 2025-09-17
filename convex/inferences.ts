import { query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import {
  predictionToFeature,
  tilesIntersectingBbox,
  type GeoJSONPointFeature,
} from './lib/tiles';
import type { RoboflowPrediction } from './lib/roboflow';
import {
  MARKER_DEDUP_RADIUS_BY_CLASS_M,
  MARKER_DEDUP_BASE_RADIUS_M,
  MARKER_DEDUP_CONFIDENCE_TIE_EPSILON,
} from './lib/constants';
import {
  metersToLatDegrees,
  metersToLngDegrees,
  haversineMeters,
} from './lib/spatial';

// Get available zoom levels in the database
export const getAvailableZoomLevels = query({
  args: {},
  handler: async (ctx) => {
    // Get all tiles to find available zoom levels
    const tiles = await ctx.db.query('tiles').collect();

    const zoomLevels = [...new Set(tiles.map((tile) => tile.z))].sort(
      (a, b) => a - b
    );
    return zoomLevels;
  },
});

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
  },
  handler: async (ctx, args) => {
    console.log('[inferences.featuresByViewport]');
    const features: GeoJSONPointFeature[] = [];

    // Get ALL predictions from database (across all models)
    const allPredictions = await ctx.db
      .query('inference_predictions')
      .collect();

    // Group by zoom level and create tile lookup map
    const zoomGroups = new Map<number, typeof allPredictions>();
    const tileMap = new Map<Id<'tiles'>, { x: number; y: number; z: number }>();

    for (const pred of allPredictions) {
      const tile = await ctx.db.get(pred.tileId);
      if (!tile) continue;

      // Store tile data for later lookup
      tileMap.set(pred.tileId, { x: tile.x, y: tile.y, z: tile.z });

      if (!zoomGroups.has(tile.z)) {
        zoomGroups.set(tile.z, []);
      }
      zoomGroups.get(tile.z)!.push(pred);
    }

    // Process each zoom level's data
    for (const [zoomLevel, zoomResults] of zoomGroups.entries()) {
      // Get tiles that intersect with the viewport at this zoom level
      const tiles = tilesIntersectingBbox(args.bbox, zoomLevel);

      for (const t of tiles) {
        // Find matching tile in this zoom level's results
        const tileMatches = zoomResults.filter((r: any) => {
          const tileData = tileMap.get(r.tileId);
          if (!tileData) return false;
          return tileData.z === t.z && tileData.x === t.x && tileData.y === t.y;
        });

        if (!tileMatches.length) continue;

        // Get the latest result for this tile (across all models)
        // Use the per-prediction records directly
        for (const pred of tileMatches) {
          const p: RoboflowPrediction = {
            x: pred.x as number,
            y: pred.y as number,
            width: pred.width as number,
            height: pred.height as number,
            confidence: pred.confidence as number,
            class: pred.class,
            class_id: (pred.classId as number | undefined) ?? -1,
            detection_id: pred.roboflowDetectionId,
          };

          if ((p.confidence ?? 0) < (args.confidenceThreshold ?? 0.5)) {
            continue;
          }

          const { point } = predictionToFeature(
            t.z,
            t.x,
            t.y,
            p,
            // Assume 1024px images for normalization since tiles are 512@2x
            1024,
            1024,
            { includePolygon: false }
          );

          point.properties = {
            ...point.properties,
            model: pred.model,
            version: pred.version,
          };

          features.push(point);
        }
      }
    }

    // Run proximity-based deduplication by class
    const centerLat = (args.bbox.minLat + args.bbox.maxLat) / 2;
    // Use the maximum radius to build buckets so neighbor search doesn't miss larger per-class radii
    const maxRadius = Math.max(
      MARKER_DEDUP_BASE_RADIUS_M,
      ...Object.values(MARKER_DEDUP_RADIUS_BY_CLASS_M)
    );
    const latDeg = metersToLatDegrees(maxRadius);
    const lngDeg = metersToLngDegrees(maxRadius, centerLat);

    type Group = {
      className: string;
      representative: {
        lat: number;
        lng: number;
        confidence: number;
        z: number | undefined;
        properties: Record<string, unknown>;
      };
      centroidLat: number;
      centroidLng: number;
      sumLat: number;
      sumLng: number;
      sourceCount: number;
      maxConfidence: number;
      sumConfidence: number;
      zMin?: number;
      zMax?: number;
      models: Set<string>;
      cellI: number;
      cellJ: number;
    };

    const cellKey = (i: number, j: number) => `${i}:${j}`;
    const toCell = (lat: number, lng: number) => ({
      i: Math.floor(lat / latDeg),
      j: Math.floor(lng / lngDeg),
    });

    const groups: Group[] = [];
    const cellToGroupIds = new Map<string, Set<number>>();

    const isBetterRep = (
      candidate: { confidence: number; z?: number },
      current: { confidence: number; z?: number }
    ) => {
      if (
        candidate.confidence >
        current.confidence + MARKER_DEDUP_CONFIDENCE_TIE_EPSILON
      )
        return true;
      if (
        Math.abs(candidate.confidence - current.confidence) <=
          MARKER_DEDUP_CONFIDENCE_TIE_EPSILON &&
        (candidate.z ?? -Infinity) > (current.z ?? -Infinity)
      )
        return true;
      return false;
    };

    const addGroupToCell = (gId: number, i: number, j: number) => {
      const key = cellKey(i, j);
      if (!cellToGroupIds.has(key)) cellToGroupIds.set(key, new Set());
      cellToGroupIds.get(key)!.add(gId);
    };

    const moveGroupCellIfNeeded = (
      gId: number,
      fromI: number,
      fromJ: number,
      toI: number,
      toJ: number
    ) => {
      if (fromI === toI && fromJ === toJ) return { i: fromI, j: fromJ };
      const fromKey = cellKey(fromI, fromJ);
      const toKey = cellKey(toI, toJ);
      const fromSet = cellToGroupIds.get(fromKey);
      if (fromSet) fromSet.delete(gId);
      if (!cellToGroupIds.has(toKey)) cellToGroupIds.set(toKey, new Set());
      cellToGroupIds.get(toKey)!.add(gId);
      return { i: toI, j: toJ };
    };

    for (const f of features) {
      const lng = f.geometry.coordinates[0] as number;
      const lat = f.geometry.coordinates[1] as number;
      const cls = String(f.properties.class ?? '');
      const pointZ = (f.properties.z as number | undefined) ?? undefined;
      const confidence = (f.properties.confidence as number | undefined) ?? 0;
      const model = (f.properties.model as string | undefined) ?? undefined;
      const { i, j } = toCell(lat, lng);

      // Collect candidate groups from this cell and 8 neighbors
      const neighborIds = new Set<number>();
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const set = cellToGroupIds.get(cellKey(i + di, j + dj));
          if (!set) continue;
          for (const id of set) neighborIds.add(id);
        }
      }

      const radiusMeters =
        MARKER_DEDUP_RADIUS_BY_CLASS_M[cls] ?? MARKER_DEDUP_BASE_RADIUS_M;
      let attachedGroupId: number | null = null;
      let bestDist = Infinity;

      for (const gId of neighborIds) {
        const g = groups[gId];
        if (!g || g.className !== cls) continue;
        const d = haversineMeters(
          { lat, lng },
          {
            lat: g.centroidLat ?? g.representative.lat,
            lng: g.centroidLng ?? g.representative.lng,
          }
        );
        if (d <= radiusMeters && d < bestDist) {
          bestDist = d;
          attachedGroupId = gId;
        }
      }

      if (attachedGroupId === null) {
        // Create a new group
        const repProps = { ...f.properties } as Record<string, unknown>;
        const newGroup: Group = {
          className: cls,
          representative: {
            lat,
            lng,
            confidence,
            z: pointZ,
            properties: repProps,
          },
          centroidLat: lat,
          centroidLng: lng,
          sumLat: lat,
          sumLng: lng,
          sourceCount: 1,
          maxConfidence: confidence,
          sumConfidence: confidence,
          zMin: pointZ,
          zMax: pointZ,
          models: new Set(model ? [model] : []),
          cellI: i,
          cellJ: j,
        };
        const gId = groups.push(newGroup) - 1;
        addGroupToCell(gId, i, j);
        continue;
      }

      // Attach to existing group and update aggregates
      const g = groups[attachedGroupId];
      g.sourceCount += 1;
      g.maxConfidence = Math.max(g.maxConfidence, confidence);
      g.sumConfidence += confidence;
      g.sumLat += lat;
      g.sumLng += lng;
      if (typeof pointZ === 'number') {
        g.zMin = typeof g.zMin === 'number' ? Math.min(g.zMin, pointZ) : pointZ;
        g.zMax = typeof g.zMax === 'number' ? Math.max(g.zMax, pointZ) : pointZ;
      }
      if (model) g.models.add(model);

      if (
        isBetterRep(
          { confidence, z: pointZ },
          { confidence: g.representative.confidence, z: g.representative.z }
        )
      ) {
        g.representative = {
          lat,
          lng,
          confidence,
          z: pointZ,
          properties: { ...f.properties } as Record<string, unknown>,
        };
      }
      const newCentroidLat = g.sumLat / g.sourceCount;
      const newCentroidLng = g.sumLng / g.sourceCount;
      g.centroidLat = newCentroidLat;
      g.centroidLng = newCentroidLng;
      const centroidCell = toCell(newCentroidLat, newCentroidLng);
      const moved = moveGroupCellIfNeeded(
        attachedGroupId,
        g.cellI,
        g.cellJ,
        centroidCell.i,
        centroidCell.j
      );
      g.cellI = moved.i;
      g.cellJ = moved.j;
    }

    // Final consolidation pass: Merge groups of the same class whose centroids are still within radius
    const classToGroups = new Map<string, number[]>();
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!classToGroups.has(g.className)) classToGroups.set(g.className, []);
      classToGroups.get(g.className)!.push(i);
    }

    const merged = new Array<boolean>(groups.length).fill(false);
    for (const [cls, idxs] of classToGroups.entries()) {
      const radiusMeters =
        MARKER_DEDUP_RADIUS_BY_CLASS_M[cls] ?? MARKER_DEDUP_BASE_RADIUS_M;
      for (let a = 0; a < idxs.length; a++) {
        const ia = idxs[a];
        if (merged[ia]) continue;
        for (let b = a + 1; b < idxs.length; b++) {
          const ib = idxs[b];
          if (merged[ib]) continue;
          const ga = groups[ia];
          const gb = groups[ib];
          const d = haversineMeters(
            {
              lat: ga.centroidLat ?? ga.representative.lat,
              lng: ga.centroidLng ?? ga.representative.lng,
            },
            {
              lat: gb.centroidLat ?? gb.representative.lat,
              lng: gb.centroidLng ?? gb.representative.lng,
            }
          );
          if (d <= radiusMeters) {
            // Merge gb into ga
            ga.sourceCount += gb.sourceCount;
            ga.maxConfidence = Math.max(ga.maxConfidence, gb.maxConfidence);
            ga.sumConfidence += gb.sumConfidence;
            ga.sumLat += gb.sumLat;
            ga.sumLng += gb.sumLng;
            ga.centroidLat = ga.sumLat / ga.sourceCount;
            ga.centroidLng = ga.sumLng / ga.sourceCount;
            if (typeof gb.zMin === 'number')
              ga.zMin =
                typeof ga.zMin === 'number'
                  ? Math.min(ga.zMin, gb.zMin)
                  : gb.zMin;
            if (typeof gb.zMax === 'number')
              ga.zMax =
                typeof ga.zMax === 'number'
                  ? Math.max(ga.zMax, gb.zMax)
                  : gb.zMax;
            for (const m of gb.models) ga.models.add(m);
            // Representative selection per tie-break
            if (
              isBetterRep(
                {
                  confidence: gb.representative.confidence,
                  z: gb.representative.z,
                },
                {
                  confidence: ga.representative.confidence,
                  z: ga.representative.z,
                }
              )
            ) {
              ga.representative = gb.representative;
            }
            merged[ib] = true;
          }
        }
      }
    }

    const dedupedFeatures: GeoJSONPointFeature[] = groups
      .filter((_, idx) => !merged[idx])
      .map((g) => {
        const avgConfidence = g.sumConfidence / Math.max(1, g.sourceCount);
        const models = Array.from(g.models);
        const props: Record<string, unknown> = {
          ...g.representative.properties,
          // Aggregates
          sourceCount: g.sourceCount,
          maxConfidence: g.maxConfidence,
          avgConfidence,
          models,
          zRange:
            typeof g.zMin === 'number' && typeof g.zMax === 'number'
              ? [g.zMin, g.zMax]
              : undefined,
        };
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [g.representative.lng, g.representative.lat],
          },
          properties: props,
        } as GeoJSONPointFeature;
      });

    console.log('[inferences.featuresByViewport] dedup', {
      input: features.length,
      output: dedupedFeatures.length,
    });
    return { type: 'FeatureCollection', features: dedupedFeatures } as const;
  },
});
