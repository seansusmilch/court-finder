# Verified Courts Feature - Implementation Plan

## Overview

Transform the court finder from a **prediction-centric** to a **court-centric** model where:
- The map displays ONLY court records (never raw predictions)
- Every prediction MUST be linked to a court (no null `courtId`)
- Courts aggregate predictions using **75% bounding box overlap** logic
- Verification uses aggregated feedback from all linked predictions
- Admins can override court status to "rejected"

## Current State Analysis

### What's Already Working
- `courts` table exists with `status` field ('verified', 'pending', 'rejected')
- Verification thresholds configured (3 feedbacks, 75% positive rate)
- `createPendingCourtFromPrediction` mutation exists
- `verifyFromFeedback` correctly aggregates feedback across predictions
- Feedback submission triggers verification check
- Schema has `courtId` on predictions (nullable)

### What Needs To Change
1. **Linking logic**: Uses proximity (20m radius) instead of bounding box overlap
2. **Map display**: Shows both predictions AND courts (should show ONLY courts)
3. **Court enforcement**: No guarantee every prediction has a `courtId`
4. **Admin controls**: No interface for status override
5. **Migration**: Existing predictions without courts need linking

---

## Implementation Phases

### Phase 1: Bounding Box Overlap Logic

**Create**: `/home/sean/code/court-finder/convex/lib/bbox.ts` (NEW FILE)

```typescript
/**
 * Calculate intersection area of two bounding boxes
 */
export function bboxIntersectionArea(
  bbox1: { x: number; y: number; width: number; height: number },
  bbox2: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(bbox1.x, bbox2.x);
  const y1 = Math.max(bbox1.y, bbox2.y);
  const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
  const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

/**
 * Check if two bounding boxes overlap by at least the given threshold
 * @param overlapThreshold - Minimum overlap ratio (0-1), e.g., 0.75 for 75%
 */
export function bboxOverlapMeetsThreshold(
  bbox1: { x: number; y: number; width: number; height: number },
  bbox2: { x: number; y: number; width: number; height: number },
  overlapThreshold: number = 0.75
): boolean {
  const area1 = bbox1.width * bbox1.height;
  const area2 = bbox2.width * bbox2.height;
  const intersection = bboxIntersectionArea(bbox1, bbox2);

  if (intersection === 0) return false;

  const overlap1 = intersection / area1;
  const overlap2 = intersection / area2;

  // Both boxes must have at least threshold overlap
  return overlap1 >= overlapThreshold && overlap2 >= overlapThreshold;
}
```

---

### Phase 2: Update Court Linking Logic

**Modify**: `/home/sean/code/court-finder/convex/courts.ts`

**Add new query** (replace `findNearbyCourt`):

```typescript
export const findOverlappingCourt = internalQuery({
  args: {
    tileId: v.id('tiles'),
    pixelX: v.number(),
    pixelY: v.number(),
    pixelWidth: v.number(),
    pixelHeight: v.number(),
    class: v.string(),
  },
  handler: async (ctx, args) => {
    const OVERLAP_THRESHOLD = 0.75;

    // Get all courts on same tile with same class
    const allCourts = await ctx.db.query('courts').collect();

    const candidateCourts = allCourts.filter(court => {
      if (court.tileId !== args.tileId) return false;
      if (court.class !== args.class) return false;
      if (!court.pixelX || !court.pixelY || !court.pixelWidth || !court.pixelHeight) {
        return false;
      }
      return true;
    });

    // Find court with maximum overlap that meets threshold
    let bestMatch: { courtId: Id<'courts'>; overlap: number } | null = null;
    let maxOverlap = 0;

    for (const court of candidateCourts) {
      const overlaps = bboxOverlapMeetsThreshold(
        { x: args.pixelX, y: args.pixelY, width: args.pixelWidth, height: args.pixelHeight },
        { x: court.pixelX!, y: court.pixelY!, width: court.pixelWidth!, height: court.pixelHeight! },
        OVERLAP_THRESHOLD
      );

      if (overlaps) {
        // Calculate IoU for best match selection
        const intersection = bboxIntersectionArea(
          { x: args.pixelX, y: args.pixelY, width: args.pixelWidth, height: args.pixelHeight },
          { x: court.pixelX!, y: court.pixelY!, width: court.pixelWidth!, height: court.pixelHeight! }
        );
        const area1 = args.pixelWidth * args.pixelHeight;
        const area2 = court.pixelWidth! * court.pixelHeight!;
        const union = area1 + area2 - intersection;
        const iou = union > 0 ? intersection / union : 0;

        if (iou > maxOverlap) {
          maxOverlap = iou;
          bestMatch = { courtId: court._id, overlap: iou };
        }
      }
    }

    return bestMatch;
  },
});
```

---

### Phase 3: Update Prediction Upsert to Use BBox Overlap

**Modify**: `/home/sean/code/court-finder/convex/inference_predictions.ts`

**Replace lines 120-144** (proximity-based linking) with:

```typescript
// Try to find overlapping court on same tile
const overlappingCourt = await ctx.runQuery(
  internal.courts.findOverlappingCourt,
  {
    tileId: args.tileId,
    pixelX: updateData.x,
    pixelY: updateData.y,
    pixelWidth: updateData.width,
    pixelHeight: updateData.height,
    class: updateData.class,
  }
);

if (overlappingCourt) {
  await ctx.db.patch(predictionId, { courtId: overlappingCourt.courtId });
  console.log('linked_to_existing_court', {
    predictionId,
    courtId: overlappingCourt.courtId,
    overlapRatio: overlappingCourt.overlap,
    algorithm: 'bbox_overlap_75pct',
  });
} else {
  const courtId = await ctx.runMutation(
    internal.courts.createPendingCourtFromPrediction,
    { predictionId }
  );
  await ctx.db.patch(predictionId, { courtId });
  console.log('created_new_court', {
    predictionId,
    courtId,
    reason: 'no_overlapping_court_found',
  });
}
```

**Key change**: Replaced `findNearbyCourt` with `findOverlappingCourt` (bbox-based, same-tile only).

---

### Phase 4: Simplify Map Query to Return Only Courts

**Modify**: `/home/sean/code/court-finder/convex/inferences.ts`

**Major refactor** of `featuresByViewport` query (currently ~570 lines → ~80 lines):

**Current behavior**: Fetches predictions, runs complex deduplication, merges with courts

**New behavior**: Fetch ONLY courts, return directly

```typescript
export const featuresByViewport = query({
  args: {
    bbox: v.object({
      minLat: v.number(),
      minLng: v.number(),
      maxLat: v.number(),
      maxLng: v.number(),
    }),
    zoom: v.number(),
    confidenceThreshold: v.optional(v.number()),
    statusFilter: v.optional(
      v.union(
        v.literal('all'),
        v.literal('verified'),
        v.literal('pending')
      )
    ),
  },
  handler: async (ctx, args) => {
    const startTs = Date.now();
    const statusFilter = args.statusFilter ?? 'all';

    console.log('start', {
      startTs,
      bbox: args.bbox,
      zoom: args.zoom,
      statusFilter,
    });

    // Get tiles intersecting viewport
    const tiles = tilesIntersectingBbox(args.bbox, args.zoom);
    const tileIds = new Set(tiles.map((t) => `${t.z}:${t.x}:${t.y}`));

    // Get courts ONLY (no predictions)
    let courts = await ctx.db.query('courts').collect();

    // Apply status filter
    if (statusFilter === 'verified') {
      courts = courts.filter((c) => c.status === 'verified');
    } else if (statusFilter === 'pending') {
      courts = courts.filter((c) => c.status === 'pending' || c.status === 'verified');
    }

    // Build features from courts
    const features: GeoJSONPointFeature[] = [];

    for (const court of courts) {
      if (!court.tileId) continue;

      const tile = await ctx.db.get(court.tileId);
      if (!tile) continue;

      const tileKey = `${tile.z}:${tile.x}:${tile.y}`;
      if (!tileIds.has(tileKey)) continue;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [court.longitude, court.latitude],
        },
        properties: {
          z: tile.z,
          x: tile.x,
          y: tile.y,
          class: court.class,
          class_id: 0,
          confidence: court.sourceConfidence ?? 1.0,
          detection_id: '',
          status: court.status,
          verifiedAt: court.verifiedAt,
          sourceModel: court.sourceModel,
          sourceVersion: court.sourceVersion,
          totalFeedbackCount: court.totalFeedbackCount,
          positiveFeedbackCount: court.positiveFeedbackCount,
        },
      });
    }

    console.log('complete', {
      durationMs: Date.now() - startTs,
      statusFilter,
      bbox: args.bbox,
      zoom: args.zoom,
      featureCount: features.length,
    });

    return { type: 'FeatureCollection', features } as const;
  },
});
```

**Benefits**: 10-100x faster, simpler code, court-centric architecture.

---

### Phase 5: Add Admin Status Override

**Modify**: `/home/sean/code/court-finder/convex/courts.ts`

**Add internal mutation**:

```typescript
export const setCourtStatus = internalMutation({
  args: {
    courtId: v.id('courts'),
    status: v.union(v.literal('verified'), v.literal('pending'), v.literal('rejected')),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const court = await ctx.db.get(args.courtId);
    if (!court) {
      throw new Error('Court not found');
    }

    await ctx.db.patch(args.courtId, {
      status: args.status,
      verifiedAt: args.status === 'verified' ? Date.now() : court.verifiedAt,
    });

    console.log('court_status_updated', {
      courtId: args.courtId,
      userId: args.userId,
      previousStatus: court.status,
      newStatus: args.status,
    });

    return args.courtId;
  },
});
```

**Add public API mutation**:

```typescript
export const updateCourtStatus = mutation({
  args: {
    courtId: v.id('courts'),
    status: v.union(v.literal('verified'), v.literal('pending'), v.literal('rejected')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check admin permission (adjust permission check as needed)
    const user = await ctx.db.get(userId);
    const isAdmin = user?.permissions?.includes('admin.access');

    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    return await ctx.runMutation(internal.courts.setCourtStatus, {
      courtId: args.courtId,
      status: args.status,
      userId,
    });
  },
});
```

---

### Phase 6: Data Migration for Existing Predictions

**Create/Modify**: `/home/sean/code/court-finder/convex/migrations.ts`

```typescript
export const linkPredictionsToCourtsByBboxOverlap = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('[migration] starting bbox overlap linking');

    // Get all predictions without courts
    const allPredictions = await ctx.db.query('inference_predictions').collect();
    const predictionsWithoutCourts = allPredictions.filter(p => !p.courtId);

    console.log('[migration] found predictions without courts', {
      total: allPredictions.length,
      withoutCourts: predictionsWithoutCourts.length,
    });

    let linkedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const prediction of predictionsWithoutCourts) {
      try {
        const overlappingCourt = await ctx.runQuery(
          internal.courts.findOverlappingCourt,
          {
            tileId: prediction.tileId,
            pixelX: prediction.x as number,
            pixelY: prediction.y as number,
            pixelWidth: prediction.width as number,
            pixelHeight: prediction.height as number,
            class: prediction.class,
          }
        );

        if (overlappingCourt) {
          await ctx.db.patch(prediction._id, { courtId: overlappingCourt.courtId });
          linkedCount++;
        } else {
          const courtId = await ctx.runMutation(
            internal.courts.createPendingCourtFromPrediction,
            { predictionId: prediction._id }
          );
          await ctx.db.patch(prediction._id, { courtId: courtId });
          createdCount++;
        }

        if ((linkedCount + createdCount) % 100 === 0) {
          console.log('[migration] progress', {
            linked: linkedCount,
            created: createdCount,
            processed: linkedCount + createdCount,
          });
        }
      } catch (error) {
        console.error('[migration] error', {
          predictionId: prediction._id,
          error: error instanceof Error ? error.message : String(error),
        });
        errorCount++;
      }
    }

    console.log('[migration] complete', {
      total: predictionsWithoutCourts.length,
      linked: linkedCount,
      created: createdCount,
      errors: errorCount,
    });

    return { total: predictionsWithoutCourts.length, linked: linkedCount, created: createdCount, errors: errorCount };
  },
});
```

**Execute migration**:
```bash
bun convex run --no-push internal:migrations:linkPredictionsToCourtsByBboxOverlap
```

---

### Phase 7: Cleanup

**Remove deprecated code**:

1. `/home/sean/code/court-finder/convex/courts.ts` - Remove `findNearbyCourt` query (proximity-based)
2. `/home/sean/code/court-finder/convex/inferences.ts` - Remove `autoLinkPredictionsToCourts` mutation (lines 575-638)
3. Mark proximity constants as deprecated in `/home/sean/code/court-finder/convex/lib/constants.ts`:
   - `MARKER_DEDUP_BASE_RADIUS_M`
   - `MARKER_DEDUP_RADIUS_BY_CLASS_M`

---

## Critical Files Summary

| File | Action | Phase |
|------|--------|-------|
| `/home/sean/code/court-finder/convex/lib/bbox.ts` | **CREATE** | 1 |
| `/home/sean/code/court-finder/convex/courts.ts` | Add `findOverlappingCourt`, `setCourtStatus`, `updateCourtStatus` | 2, 5 |
| `/home/sean/code/court-finder/convex/inference_predictions.ts` | Replace lines 120-144 | 3 |
| `/home/sean/code/court-finder/convex/inferences.ts` | Refactor `featuresByViewport` | 4 |
| `/home/sean/code/court-finder/convex/migrations.ts` | Add migration function | 6 |

---

## Testing & Verification

### Unit Tests
1. **BBox overlap logic**: Test 0%, 50%, 75%, 100% overlap scenarios
2. **Court linking**: Test same-tile, same-class, 75% threshold
3. **Verification aggregation**: Test feedback across multiple predictions

### Integration Tests
1. **Full prediction flow**: Scan → predictions → courts → map display
2. **Feedback loop**: Submit feedback → verification → status update
3. **Admin override**: Manual status changes

### Manual Testing Checklist
- [ ] Map displays only courts (no raw predictions)
- [ ] New predictions auto-link or create courts
- [ ] 75% bbox overlap correctly links predictions
- [ ] Verification works with thresholds
- [ ] Admin can override to 'rejected'
- [ ] Migration completes successfully
- [ ] Map filters work (all, verified, pending)

---

## Rollout Strategy

1. **Stage 1**: Deploy bbox overlap logic (no user impact)
2. **Stage 2**: Run data migration during low-traffic period
3. **Stage 3**: Deploy simplified map query (user-visible)
4. **Stage 4**: Deploy admin override controls

**Rollback**: Revert `featuresByViewport` if issues occur.
