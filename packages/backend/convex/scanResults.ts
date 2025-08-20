import { query } from './_generated/server';
import { v } from 'convex/values';
import { createBoundingBoxFromCenter } from './poc';

export const getByScanId = query({
  args: { scanId: v.id('scans') },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      return null;
    }

    const inferences = await ctx.db
      .query('inferences')
      .withIndex('by_scan', (q) => q.eq('scanId', args.scanId))
      .collect();

    const subBoxes = inferences.map((i) => i.bbox);
    const results = inferences.map((i) => ({
      url: i.imageUrl,
      detections: i.response,
    }));
    const bbox = createBoundingBoxFromCenter(scan.centerLat, scan.centerLong);

    return { scanId: args.scanId, bbox, subBoxes, results };
  },
});
