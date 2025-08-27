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
    isAnonymous: v.optional(v.boolean()),
    permissions: v.array(v.string()),
  }).index('email', ['email']),
  scans: defineTable({
    centerLat: v.number(),
    centerLong: v.number(),
    centerTile: v.object({
      z: v.number(),
      x: v.number(),
      y: v.number(),
    }),
    tiles: v.array(
      v.object({
        z: v.number(),
        x: v.number(),
        y: v.number(),
      })
    ),
    userId: v.optional(v.id('users')),
  })
    .index('by_center', ['centerLat', 'centerLong'])
    .index('by_center_tile', ['centerTile']),
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
  inference_predictions: defineTable({
    inferenceId: v.id('inferences'),
    class: v.string(),
    confidence: v.number(),
    height: v.number(),
    width: v.number(),
    x: v.number(),
    y: v.number(),
    classId: v.optional(v.number()),
    detectionId: v.string(),
  })
    .index('by_inference', ['inferenceId'])
    .index('by_inference_and_detection', ['inferenceId', 'detectionId']),
  feedback_submissions: defineTable({
    inferenceId: v.id('inferences'),
    predictionId: v.id('inference_predictions'),
    userId: v.id('users'),
    userResponse: v.string(),
  }),
});
