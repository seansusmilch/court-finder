import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  scans: defineTable({
    query: v.string(),
    centerLat: v.number(),
    centerLong: v.number(),
    createdAt: v.number(),
  }).index('by_center_query', ['centerLat', 'centerLong', 'query']),
  inferences: defineTable({
    scanId: v.id('scans'),
    bbox: v.object({
      minLong: v.number(),
      minLat: v.number(),
      maxLong: v.number(),
      maxLat: v.number(),
    }),
    imageUrl: v.string(),
    model: v.string(),
    version: v.string(),
    requestedAt: v.number(),
    response: v.any(),
  }).index('by_scan', ['scanId']),
});
