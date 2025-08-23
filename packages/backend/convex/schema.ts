import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  scans: defineTable({
    centerLat: v.number(),
    centerLong: v.number(),
    tiles: v.array(
      v.object({
        z: v.number(),
        x: v.number(),
        y: v.number(),
      })
    ),
  }).index('by_center', ['centerLat', 'centerLong']),
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
