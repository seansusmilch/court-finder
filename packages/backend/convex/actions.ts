import { action } from './_generated/server';
import { v } from 'convex/values';
import {
  createBoundingBoxFromCenter,
  splitBoundingBoxIntoSubBoxes,
  generateMapboxUrlsForSubBoxes,
} from './poc';
import { detectObjectsWithRoboflow } from './poc';

export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const mapboxToken = process.env.MAPBOX_API_KEY;
    const roboflowKey = process.env.ROBOFLOW_API_KEY;

    if (!mapboxToken) {
      throw new Error('Missing MAPBOX_API_KEY environment variable');
    }
    if (!roboflowKey) {
      throw new Error('Missing ROBOFLOW_API_KEY environment variable');
    }

    const bbox = createBoundingBoxFromCenter(args.latitude, args.longitude);
    const subBoxes = splitBoundingBoxIntoSubBoxes(bbox);
    const imageUrls = generateMapboxUrlsForSubBoxes(subBoxes, mapboxToken);

    const results = [] as Array<{ url: string; detections: unknown }>;
    for (const url of imageUrls) {
      const detections = await detectObjectsWithRoboflow(url, roboflowKey);
      results.push({ url, detections });
    }

    return { bbox, subBoxes, results };
  },
});
