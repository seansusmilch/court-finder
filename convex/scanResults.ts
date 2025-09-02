import { api, internal } from './_generated/api';
import type { Id, Doc } from './_generated/dataModel';
import { query } from './_generated/server';
import { v } from 'convex/values';
import {
  PERMISSIONS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
} from './lib/constants';
import { styleTileUrl } from './lib/tiles';

type TileResultItem = {
  z: number;
  x: number;
  y: number;
  url?: string;
  detections: unknown | null;
};

type GetByScanIdResponse = {
  scanId: Id<'scans'>;
  zoom: number | null;
  cols: number;
  rows: number;
  tiles: TileResultItem[];
} | null;

export const getByScanId = query({
  args: { scanId: v.id('scans') },
  handler: async (ctx, args): Promise<GetByScanIdResponse> => {
    const canViewScans = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.SCANS.READ,
    });
    if (!canViewScans) {
      throw new Error('Unauthorized');
    }
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      return null;
    }

    // Fetch tiles via join table
    const tiles = await ctx.runQuery(internal.scans_x_tiles.getTilesForScan, {
      scanId: args.scanId,
    });

    if (!tiles.length) {
      return {
        scanId: args.scanId,
        zoom: null,
        cols: 0,
        rows: 0,
        tiles: [],
      };
    }

    // Use default model/version for now - in the future we could store these on the scan
    const model = ROBOFLOW_MODEL_NAME;
    const version = ROBOFLOW_MODEL_VERSION;
    const zoom = tiles[0].z as number;

    // For each tile, fetch predictions by tile/model/version
    const resultTiles: TileResultItem[] = await Promise.all(
      tiles.map(async (t: Doc<'tiles'>) => {
        const tileUrl = styleTileUrl(t.z, t.x, t.y);
        const preds = await ctx.db
          .query('inference_predictions')
          .withIndex('by_tile_model_version', (q) =>
            q.eq('tileId', t._id).eq('model', model).eq('version', version)
          )
          .collect();
        if (!preds.length) {
          return { z: t.z, x: t.x, y: t.y, url: tileUrl, detections: null };
        }
        // Build a Roboflow-like detections object for compatibility
        const detections = {
          image: { width: 1024, height: 1024 },
          predictions: preds.map((p) => ({
            x: p.x as number,
            y: p.y as number,
            width: p.width as number,
            height: p.height as number,
            confidence: p.confidence as number,
            class: p.class,
            class_id: p.classId as number | undefined,
            detection_id: p.roboflowDetectionId,
          })),
          time: Date.now(),
        } as const;
        return {
          z: t.z as number,
          x: t.x as number,
          y: t.y as number,
          url: tileUrl,
          detections: detections as unknown,
        };
      })
    );

    const uniqueXs: number[] = Array.from(
      new Set<number>(tiles.map((t) => t.x as number))
    ).sort((a: number, b: number) => a - b);
    const uniqueYs: number[] = Array.from(
      new Set<number>(tiles.map((t) => t.y as number))
    ).sort((a: number, b: number) => a - b);

    return {
      scanId: args.scanId,
      zoom,
      cols: uniqueXs.length,
      rows: uniqueYs.length,
      tiles: resultTiles,
    };
  },
});
