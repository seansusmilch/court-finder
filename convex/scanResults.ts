import { api } from './_generated/api';
import { query } from './_generated/server';
import { v } from 'convex/values';
import {
  PERMISSIONS,
  ROBOFLOW_MODEL_NAME,
  ROBOFLOW_MODEL_VERSION,
} from './lib/constants';

export const getByScanId = query({
  args: { scanId: v.id('scans') },
  handler: async (ctx, args) => {
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

    const tiles = Array.isArray(scan.tiles)
      ? (scan.tiles as Array<{
          z: number;
          x: number;
          y: number;
        }>)
      : [];

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
    const resultTiles = await Promise.all(
      tiles.map(async (t) => {
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
        matches.sort(
          (a, b) => (b.requestedAt as number) - (a.requestedAt as number)
        );
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

    const uniqueXs = Array.from(new Set(tiles.map((t) => t.x))).sort(
      (a, b) => a - b
    );
    const uniqueYs = Array.from(new Set(tiles.map((t) => t.y))).sort(
      (a, b) => a - b
    );

    return {
      scanId: args.scanId,
      zoom,
      cols: uniqueXs.length,
      rows: uniqueYs.length,
      tiles: resultTiles,
    };
  },
});
