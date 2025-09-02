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
  feedback_submissions: defineTable({
    predictionId: v.id('inference_predictions'),
    userId: v.id('users'),
    userResponse: v.string(),
    tileId: v.optional(v.id('tiles')),
    batchId: v.optional(v.id('upload_batches')),
  }).index('by_user_and_prediction', ['userId', 'predictionId']),
  inference_predictions: defineTable({
    roboflowDetectionId: v.optional(v.string()),
    tileId: v.optional(v.id('tiles')),
    inferenceId: v.id('inferences'),
    class: v.string(),
    classId: v.optional(v.float64()),
    confidence: v.float64(),
    height: v.float64(),
    width: v.float64(),
    x: v.float64(),
    y: v.float64(),
  })
    .index('by_inference', ['inferenceId'])
    .index('by_inf_and_roboflow_detection_id', [
      'inferenceId',
      'roboflowDetectionId',
    ]),
  inferences: defineTable({
    tileId: v.id('tiles'),
    model: v.string(),
    version: v.string(),
    response: v.any(),

    // REMOVE BELOW
    imageUrl: v.optional(v.string()),
    requestedAt: v.optional(v.float64()),
    x: v.optional(v.float64()),
    y: v.optional(v.float64()),
    z: v.optional(v.float64()),
  }).index('by_tileId', ['tileId', 'model', 'version']),
  scans: defineTable({
    userId: v.optional(v.id('users')),
    model: v.string(),
    version: v.string(),
    radius: v.number(),
    centerLat: v.float64(),
    centerLong: v.float64(),
    centerTile: v.object({
      x: v.float64(),
      y: v.float64(),
      z: v.float64(),
    }),
  }).index('by_center_tile', ['centerTile']),
  upload_batches: defineTable({
    tileId: v.id('tiles'),
    roboflowName: v.string(),
    roboflowImageId: v.string(),
    roboflowAnnotationId: v.string(),
  }),
  tiles: defineTable({
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
  }).index('by_tile', ['x', 'y', 'z']),
  scans_x_tiles: defineTable({
    scanId: v.id('scans'),
    tileId: v.id('tiles'),
  }).index('by_scan_and_tile', ['scanId', 'tileId']),
});
