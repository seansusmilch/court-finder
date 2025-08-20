import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  scans: defineTable({
    query: v.string(),
    centerLat: v.number(),
    centerLong: v.number(),
    createdAt: v.number(),
    // Association to tile inferences used for this scan
    inferenceIds: v.array(v.id('inferences')),
  }).index('by_center_query', ['centerLat', 'centerLong', 'query']),
  inferences: defineTable({
    // Slippy tile coordinates
    z: v.number(),
    x: v.number(),
    y: v.number(),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    requestedAt: v.number(),
    response: v.any(),
  }).index('by_tile', ['z', 'x', 'y', 'model', 'version']),
});
