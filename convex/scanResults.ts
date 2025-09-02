import { api, internal } from './_generated/api';
import type { Id, Doc } from './_generated/dataModel';
import { query } from './_generated/server';
import { v } from 'convex/values';
import {
  PERMISSIONS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
} from './lib/constants';

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

    // For each tile, fetch latest inference by tile coordinates
    const resultTiles: TileResultItem[] = await Promise.all(
      tiles.map(async (t: Doc<'tiles'>) => {
        const matches = await ctx.db
          .query('inferences')
          .withIndex('by_tile', (q) =>
            q
              .eq('z', t.z as number)
              .eq('x', t.x as number)
              .eq('y', t.y as number)
              .eq('model', model)
              .eq('version', version)
          )
          .collect();
        if (!matches.length) {
          return { z: t.z, x: t.x, y: t.y, detections: null };
        }
        matches.sort((a, b) => b._creationTime - a._creationTime);
        const latest = matches[0];
        return {
          z: latest.z as number,
          x: latest.x as number,
          y: latest.y as number,
          url: latest.imageUrl as string,
          detections: latest.response as unknown,
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
