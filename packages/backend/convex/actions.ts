import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
  createBoundingBoxFromCenter,
  splitBoundingBoxIntoSubBoxes,
  generateMapboxUrlsForSubBoxes,
  detectObjectsWithRoboflow,
} from './lib';

export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    console.log('[scanArea] start', {
      latitude: args.latitude,
      longitude: args.longitude,
      query: args.query ?? '',
    });
    const mapboxToken = process.env.MAPBOX_API_KEY;
    const roboflowKey = process.env.ROBOFLOW_API_KEY;

    if (!mapboxToken) {
      throw new Error('Missing MAPBOX_API_KEY environment variable');
    }
    if (!roboflowKey) {
      throw new Error('Missing ROBOFLOW_API_KEY environment variable');
    }

    const bbox = createBoundingBoxFromCenter(args.latitude, args.longitude);
    console.log('[scanArea] bbox computed', bbox);
    const subBoxes = splitBoundingBoxIntoSubBoxes(bbox);
    console.log('[scanArea] subBoxes generated', { count: subBoxes.length });
    const imageUrls = generateMapboxUrlsForSubBoxes(subBoxes, mapboxToken);
    console.log('[scanArea] image URLs generated', { count: imageUrls.length });

    // Look for an existing scan with same center & query
    const existingScans: any[] = await ctx.runQuery(
      internal.scans.findByCenter,
      {
        centerLat: args.latitude,
        centerLong: args.longitude,
        query: args.query ?? '',
      }
    );
    let scanId: any = existingScans?.length ? existingScans[0]._id : undefined;
    console.log('[scanArea] existing scan lookup', {
      foundCount: existingScans?.length ?? 0,
      reusedScanId: scanId ?? null,
    });

    if (!scanId) {
      scanId = await ctx.runMutation(internal.scans.create, {
        centerLat: args.latitude,
        centerLong: args.longitude,
        query: args.query ?? '',
      });
      console.log('[scanArea] created new scan', { scanId });
    }

    // Check for existing inferences for this scan
    const existingInferences: any[] = await ctx.runQuery(
      internal.inferences.getByScan,
      {
        scanId,
      }
    );
    console.log('[scanArea] existing inferences', {
      foundCount: existingInferences?.length ?? 0,
    });

    let results: Array<{ url: string; detections: unknown }> = [];
    if (existingInferences && existingInferences.length === imageUrls.length) {
      results = existingInferences.map((inf: any) => ({
        url: inf.imageUrl,
        detections: inf.response,
      }));
      console.log('[scanArea] reusing cached inferences', {
        count: results.length,
      });
    } else {
      results = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const subBox = subBoxes[i];
        console.log('[scanArea] inferring', {
          index: i + 1,
          total: imageUrls.length,
          url,
        });
        const detections = await detectObjectsWithRoboflow(url, roboflowKey);
        const predictionsCount = Array.isArray((detections as any)?.predictions)
          ? (detections as any).predictions.length
          : undefined;
        console.log('[scanArea] inference complete', {
          index: i + 1,
          predictionsCount,
        });
        results.push({ url, detections });
        // store inference per sub-box
        await ctx.runMutation(internal.inferences.create, {
          scanId,
          bbox: subBox,
          imageUrl: url,
          model: 'satellite-sports-facilities-bubrg',
          version: '4',
          response: detections,
        });
        console.log('[scanArea] inference stored', { index: i + 1, url });
      }
    }

    const endTs = Date.now();
    console.log('[scanArea] done', {
      scanId,
      resultsCount: results.length,
      durationMs: endTs - startTs,
    });
    return { scanId, bbox, subBoxes, results };
  },
});
