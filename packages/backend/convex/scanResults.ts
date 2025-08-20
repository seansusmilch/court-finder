import { query } from './_generated/server';
import { v } from 'convex/values';

export const getByScanId = query({
  args: { scanId: v.id('scans') },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      return null;
    }
    let inferences: any[] = [];
    if (
      Array.isArray((scan as any).inferenceIds) &&
      (scan as any).inferenceIds.length
    ) {
      const fetched = await Promise.all(
        ((scan as any).inferenceIds as string[]).map((id) =>
          ctx.db.get(id as any)
        )
      );
      inferences = fetched.filter(Boolean) as any[];
    }

    if (!inferences.length) {
      return {
        scanId: args.scanId,
        zoom: null,
        cols: 0,
        rows: 0,
        tiles: [],
      };
    }

    const zoom = inferences[0].z as number;
    const tiles = inferences.map((i) => ({
      z: i.z as number,
      x: i.x as number,
      y: i.y as number,
      url: i.imageUrl as string,
      detections: i.response as unknown,
    }));
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
      tiles,
    };
  },
});
