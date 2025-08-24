import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    permissions: v.optional(v.array(v.string())),
  }).index('email', ['email']),
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
