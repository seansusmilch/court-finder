import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.id('_storage')),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    permissions: v.array(v.string()),
  }).index('email', ['email']),
  feedback_submissions: defineTable({
    predictionId: v.id('inference_predictions'),
    userId: v.id('users'),
    userResponse: v.string(),
    tileId: v.id('tiles'),
    batchId: v.optional(v.id('upload_batches')),
  })
    .index('by_user_and_prediction', ['userId', 'predictionId'])
    .index('by_tile', ['tileId']),

  inference_predictions: defineTable({
    roboflowDetectionId: v.string(),
    tileId: v.id('tiles'),
    class: v.string(),
    classId: v.optional(v.float64()),
    confidence: v.float64(),
    height: v.float64(),
    width: v.float64(),
    x: v.float64(),
    y: v.float64(),
    model: v.optional(v.string()),
    version: v.optional(v.string()),
    roboflowInferenceId: v.optional(v.string()),
  })
    .index('by_tile', ['tileId'])
    .index('by_tile_model_version', ['tileId', 'model', 'version'])
    .index('by_tile_model_version_detection', [
      'tileId',
      'model',
      'version',
      'roboflowDetectionId',
    ]),
  scans: defineTable({
    userId: v.id('users'),
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
    roboflowImageId: v.optional(v.string()),
    roboflowAnnotatedAt: v.optional(v.number()),
  }).index('by_tile', ['tileId']),
  tiles: defineTable({
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
    reverseGeocode: v.optional(v.string()),
  }).index('by_tile', ['x', 'y', 'z']),
  scans_x_tiles: defineTable({
    scanId: v.id('scans'),
    tileId: v.id('tiles'),
  }).index('by_scan_and_tile', ['scanId', 'tileId']),
});
