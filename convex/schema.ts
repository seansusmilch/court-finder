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
    inferenceId: v.id('inferences'),
    lastBatchId: v.optional(v.id('upload_batches')),
    predictionId: v.id('inference_predictions'),
    uploadStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('batched'),
        v.literal('uploaded'),
        v.literal('failed')
      )
    ),
    userId: v.id('users'),
    userResponse: v.string(),
  })
    .index('by_inference', ['inferenceId'])
    .index('by_upload_status', ['uploadStatus'])
    .index('by_user_and_prediction', ['userId', 'predictionId']),
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

    // REMOVE BELOW
    detectionId: v.optional(v.string()),
  })
    .index('by_inference', ['inferenceId'])
    .index('by_inference_and_detection', ['inferenceId', 'detectionId'])
    .index('by_inf_and_roboflow_detection_id', [
      'inferenceId',
      'roboflowDetectionId',
    ]),
  inferences: defineTable({
    tileId: v.optional(v.id('tiles')),
    model: v.string(),
    version: v.string(),
    response: v.any(),

    // REMOVE BELOW
    imageUrl: v.string(),
    requestedAt: v.float64(),
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
  })
    .index('by_tile', ['z', 'x', 'y', 'model', 'version'])
    .index('by_tileId', ['tileId', 'model', 'version']),
  scans: defineTable({
    userId: v.optional(v.id('users')),
    model: v.optional(v.string()),
    version: v.optional(v.string()),
    radius: v.optional(v.number()),
    centerLat: v.float64(),
    centerLong: v.float64(),

    // REMOVE BELOW
    centerTile: v.object({
      x: v.float64(),
      y: v.float64(),
      z: v.float64(),
    }),
    tiles: v.optional(
      v.array(
        v.object({
          x: v.float64(),
          y: v.float64(),
          z: v.float64(),
        })
      )
    ),
  })
    .index('by_center', ['centerLat', 'centerLong'])
    .index('by_center_tile', ['centerTile']),
  upload_batches: defineTable({
    annotationCount: v.float64(),
    batchId: v.string(),
    createdAt: v.optional(v.float64()),
    createdBy: v.optional(v.id('users')),
    feedbackCount: v.float64(),
    imageUrl: v.string(),
    inferenceId: v.id('inferences'),
    reviewNotes: v.optional(v.string()),
    reviewedAt: v.optional(v.float64()),
    reviewedBy: v.optional(v.id('users')),
    roboflowAnnotationId: v.optional(v.string()),
    roboflowImageId: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('uploaded'),
      v.literal('failed'),
      v.literal('approved'),
      v.literal('rejected')
    ),
    tileCoordinates: v.object({
      x: v.float64(),
      y: v.float64(),
      z: v.float64(),
    }),
  })
    .index('by_inference', ['inferenceId'])
    .index('by_status', ['status'])
    .index('by_tile', ['tileCoordinates']),
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
