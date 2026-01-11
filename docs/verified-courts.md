# Verified Courts and Prediction Linking

## Problem Statement

The current system has an issue where predictions from different model versions for the same real-world court are not properly linked together. This can lead to:

1. **Duplicate court records**: When a new model version scans an area that already has a verified court, it can create a new court record instead of linking to the existing one
2. **Fragmented feedback**: Feedback on predictions from different model versions is not aggregated to the same court
3. **Verification inconsistencies**: A court might be verified based on feedback from one model version's prediction, but predictions from other versions remain unlinked

### Current Behavior

- Predictions are stored per tile/model/version combination in the `inference_predictions` table
- Courts are created when a prediction receives enough positive feedback
- Each prediction can have at most one court linked via `prediction.courtId`
- Courts have a source prediction (`sourcePredictionId`) but can only track one prediction

### Desired Behavior

- **Every prediction should have a court ID**, whether it has feedback or not
- **Predictions from different model versions of the same court should all link to the same court record**
- **Feedback from all linked predictions should be aggregated** to determine court verification status
- **No duplicate court records should exist** for the same real-world location

## Solution Architecture

### Key Design Decisions

1. **1-to-Many Relationship**: One court can have many predictions linked to it
2. **Pending Courts Created Immediately**: New predictions automatically create a pending court (no longer waiting for positive feedback)
3. **Automatic Linking**: When a prediction is upserted, it automatically finds or creates a court
4. **Aggregated Verification**: Court verification status is calculated from ALL feedback across ALL linked predictions
5. **Duplicate Prevention**: Uses haversine distance and class-specific radius thresholds to ensure predictions link to nearest matching court

### Implementation Components

#### 1. Updated `findNearbyCourt` Query
- **Location**: `convex/courts.ts:282-316`
- **Change**: Search ALL courts (pending + verified) instead of only verified courts
- **Purpose**: Allows predictions to link to pending courts, not just verified ones

```typescript
// Before: .withIndex('by_status', (q) => q.eq('status', 'verified'))
// After: .query('courts').collect()
```

#### 2. New `createPendingCourtFromPrediction` Mutation
- **Location**: `convex/courts.ts`
- **Purpose**: Creates a new court in "pending" state from a prediction
- **Behavior**:
  - Always creates court with `status: 'pending'`
  - Sets `sourceConfidence`, `sourceModel`, `sourceVersion` from the prediction
  - Does NOT calculate feedback (handled separately)
  - Returns the new court ID

#### 3. Rewritten `verifyFromFeedback` Mutation
- **Location**: `convex/courts.ts:18-119`
- **Complete rewrite**: Aggregates feedback from ALL linked predictions
- **Logic**:
  1. Get the prediction's court (every prediction now has one)
  2. Get ALL predictions linked to that court
  3. Get ALL feedback for ALL those predictions
  4. Aggregate `totalFeedbackCount` and `positiveFeedbackCount`
  5. Update court with aggregated counts
  6. Mark court as 'verified' if thresholds are met
  7. Update all feedback records' `courtId` field

```typescript
// Key changes:
- Removed: check for single prediction feedback
- Removed: court creation logic (now handled in upsert)
- Added: aggregation across all linked predictions
- Added: feedback.courtId updates for all feedback
```

#### 4. Updated `inference_predictions.upsert` Mutation
- **Location**: `convex/inference_predictions.ts:9-147`
- **New behavior after upsert**:
  1. Convert prediction pixel coordinates to lat/lng
  2. Call `findNearbyCourt` to find matching courts
  3. **If found**: Link prediction to existing court
  4. **If NOT found**: Create new pending court and link to it

```typescript
// Added at end of handler:
const { lon, lat } = pixelOnTileToLngLat(...);
const nearbyCourt = await ctx.runQuery(internal.courts.findNearbyCourt, {
  latitude: lat, longitude: lon, class: updateData.class
});

if (nearbyCourt) {
  await ctx.db.patch(predictionId, { courtId: nearbyCourt.id });
} else {
  const courtId = await ctx.runMutation(
    internal.courts.createPendingCourtFromPrediction,
    { predictionId }
  );
  await ctx.db.patch(predictionId, { courtId });
}
```

#### 5. Migration for Backfill
- **Location**: `convex/migrations.ts`
- **Purpose**: Link all existing predictions to courts and aggregate feedback
- **Process**:
  1. For each prediction without a courtId:
     - Find nearby court (pending OR verified)
     - If found: Link to existing court
     - If NOT found: Create new pending court and link
  2. For each court:
     - Get all linked predictions
     - Get all feedback for those predictions
     - Aggregate counts
     - Update court status based on thresholds

## Duplicate Court Prevention Strategy

To prevent creating duplicate courts for the same real-world location:

1. **Find ALL courts** of the same class (pending + verified)
2. **Calculate distance** from prediction to each court using haversine formula
3. **Find the nearest court** within the class-specific radius:
   - `basketball-court`: 10 meters
   - `tennis-court`: 8 meters
   - `soccer-ball-field`: 16 meters
   - `baseball-diamond`: 32 meters
   - `ground-track-field`: 16 meters
   - Default: 20 meters
4. **Link to nearest matching court** (not just any court)
5. **Only create new court** if no courts exist OR nearest is outside radius

### Edge Cases Handled

- **Multiple nearby courts**: Links to the NEAREST one, not the first found
- **Court already verified**: Still allows linking (no longer restricted)
- **Same prediction different model/version**: Creates separate prediction records but links to same court
- **No courts in database**: Creates new pending court

## Current Implementation Status

### Completed ✅

- [x] Updated `findNearbyCourt` to search all courts
- [x] Created `createPendingCourtFromPrediction` mutation
- [x] Rewrote `verifyFromFeedback` to aggregate feedback
- [x] Started updating `inference_predictions.upsert` (in progress)

### In Progress 🔄

- [ ] Complete `inference_predictions.upsert` implementation
- [ ] Update `inferences.ts: autoLinkPredictionsToCourts` to search all courts
- [ ] Update `feedback_submissions.ts` to trigger `verifyFromFeedback` asynchronously
- [ ] Add migration to backfill existing predictions

### Pending ⏳

- [ ] Run type check and verify implementation
- [ ] Test the complete flow

## Technical Challenges Encountered

### Challenge 1: TypeScript Type Errors

**Issue**: When modifying `inference_predictions.upsert`, encountered several type errors:
- `existing` is possibly `null`
- Argument of type `string | Id<"inference_predictions">` not assignable to `Id<"inference_predictions">`
- Cannot find name `Id` (missing import)
- Property 'createPendingCourtFromPrediction' does not exist on internal courts API

**Resolution**: 
- Need to add `import { Id } from './_generated/dataModel'`
- Need to properly type-cast predictionId as `Id<'inference_predictions'>`
- Need to ensure `createPendingCourtFromPrediction` is properly exported
- May need to regenerate Convex types after changes

### Challenge 2: Removed Functions

**Issue**: The original `verifyFromFeedback` relied on helper functions that no longer make sense:
- `updateFeedbackCourtIds` - Only updated feedback for a single prediction
- `createCourtFromPrediction` - Created courts with verification logic included

**Resolution**:
- `updateFeedbackCourtIds` logic now integrated into `verifyFromFeedback`
- `createCourtFromPrediction` replaced with `createPendingCourtFromPrediction` (simpler, no feedback logic)

### Challenge 3: Async Verification

**Requirement**: Trigger `verifyFromFeedback` asynchronously after feedback submission

**Approach**: 
- In `feedback_submissions.ts`, after inserting feedback, call `verifyFromFeedback`
- This can be done via a Convex action or scheduled task
- Ensures immediate feedback aggregation without blocking the submission

## Data Flow

### New Prediction Flow

```
1. Prediction upserted
   ↓
2. Find nearby courts (all classes, pending + verified)
   ↓
3. If found: Link prediction to existing court
   If not found: Create new pending court and link
   ↓
4. Prediction now has courtId
```

### Feedback Submission Flow

```
1. User submits feedback for prediction
   ↓
2. Feedback inserted into database
   ↓
3. Trigger verifyFromFeedback asynchronously
   ↓
4. Get prediction's court
   ↓
5. Get ALL predictions linked to that court
   ↓
6. Get ALL feedback for ALL those predictions
   ↓
7. Aggregate feedback counts
   ↓
8. Update court with aggregated data
   ↓
9. Check verification thresholds
   ↓
10. Update court status if thresholds met
   ↓
11. Update all feedback records with courtId
```

### Migration Flow

```
1. Get all predictions without courtId
   ↓
2. For each prediction:
   a. Convert to lat/lng
   b. Find nearby court (all courts)
   c. Link to existing court or create new
   ↓
3. Get all courts
   ↓
4. For each court:
   a. Get all linked predictions
   b. Get all feedback for those predictions
   c. Aggregate counts
   d. Update court status
```

## Constants Used

### Verification Thresholds
```typescript
COURT_VERIFICATION = {
  MIN_FEEDBACK_COUNT: 3,
  MIN_POSITIVE_PERCENTAGE: 0.75,
}
```

### Class-Specific Radius Thresholds
```typescript
MARKER_DEDUP_RADIUS_BY_CLASS_M = {
  'basketball-court': 10,
  'tennis-court': 8,
  'soccer-ball-field': 16,
  'baseball-diamond': 32,
  'ground-track-field': 16,
}
MARKER_DEDUP_BASE_RADIUS_M = 20 // fallback
```

## Future Considerations

### Possible Enhancements

1. **Multi-model confidence aggregation**: Average confidence across all linked predictions
2. **Prediction version tracking**: Track which model versions contributed to each court
3. **Conflict resolution**: Handle cases where predictions from different models disagree
4. **Temporal awareness**: Prefer newer model versions for court metadata
5. **Manual override**: Allow admins to manually merge duplicate courts

### Performance Considerations

- **Scanning all courts**: `findNearbyCourt` scans all courts - may need geospatial index for large datasets
- **Aggregation queries**: Getting all predictions and feedback for a court could be expensive
- **Migration**: Large-scale migration may need batching for large databases

### Data Integrity

- **Court without predictions**: Should throw error (data inconsistency)
- **Prediction without court**: Should never happen after migration
- **Orphaned feedback**: Should be handled gracefully (courtId = undefined)

## Related Files

- `convex/schema.ts` - Database schema definitions
- `convex/courts.ts` - Court-related queries and mutations
- `convex/inference_predictions.ts` - Prediction CRUD operations
- `convex/inferences.ts` - Inference batch operations
- `convex/feedback_submissions.ts` - Feedback submission logic
- `convex/migrations.ts` - Database migration scripts
- `convex/lib/spatial.ts` - Haversine distance calculations
- `convex/lib/tiles.ts` - Tile coordinate conversions
- `convex/lib/constants.ts` - Radius and threshold constants
