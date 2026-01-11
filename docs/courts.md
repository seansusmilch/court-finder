# Courts Requirements

## Overview

**Courts** are the core entity in the Court Finder application - permanent records representing real-world sports facilities (basketball courts, tennis courts, soccer fields, etc.) that have been detected via ML inference and/or verified by users.

### Key Principles

1. **Court-Centric Architecture**: The system is transitioning from prediction-centric to court-centric. Courts are the source of truth, not predictions.
2. **Spatial Aggregation**: Multiple predictions from different model versions can link to a single court record.
3. **Community Verification**: Crowdsourced feedback determines court verification status.
4. **One-Court-Per-Location**: Duplicate prevention ensures exactly one court record per real-world facility.

## Data Model

### Core Schema

Courts are stored in the `courts` table (`convex/schema.ts:15-34`):

```typescript
{
  // Geographic location
  latitude: v.float64(),        // WGS84 latitude
  longitude: v.float64(),       // WGS84 longitude

  // Classification
  class: v.string(),            // 'basketball-court', 'tennis-court', etc.

  // Verification status
  status: v.string(),           // 'pending' | 'verified' | 'rejected'
  verifiedAt: v.optional(v.number()),  // Timestamp when verified

  // Source prediction (primary prediction this court was created from)
  sourcePredictionId: v.optional(v.id('inference_predictions')),
  sourceModel: v.optional(v.string()),        // e.g., 'roboflow'
  sourceVersion: v.optional(v.string()),      // Model version
  sourceConfidence: v.optional(v.float64()),  // ML confidence score (0-1)

  // Aggregated feedback (from ALL linked predictions)
  totalFeedbackCount: v.number(),       // Total feedback submissions
  positiveFeedbackCount: v.number(),    // Positive ('yes') responses

  // Tile reference and bounding box
  tileId: v.optional(v.id('tiles')),
  pixelX: v.optional(v.float64()),
  pixelY: v.optional(v.float64()),
  pixelWidth: v.optional(v.float64()),
  pixelHeight: v.optional(v.float64()),
}
```

### Indexes

- `by_location`: (latitude, longitude) - efficient geospatial queries
- `by_status`: (status) - filter by verification status

### Relationships

```
Tile (1) ←→ (many) Courts
Court (1) ←→ (many) Predictions
Prediction (1) ←→ (many) Feedback submissions
Court (1) ←→ (many) Feedback submissions (via predictions)
```

## Court Creation

### ML Inference Pipeline

**Primary Method**: Courts are created automatically when ML predictions are upserted.

**Flow**:
1. Roboflow model detects courts in a tile image
2. `inferences:upsertPrediction` is called with detection data
3. Prediction is created/updated in `inference_predictions` table
4. System searches for nearby existing courts of the same class
5. **If found**: Links prediction to existing court
6. **If not found**: Creates new pending court and links to it

**Location**: `convex/inference_predictions.ts:99-191`

### Linking Algorithm

**Function**: `courts:findOverlappingCourt` or `courts:findNearbyCourt`

**Method**: Uses bounding box overlap (75% threshold) OR haversine distance

**Distance Thresholds** (class-specific):
- Basketball court: 10 meters
- Tennis court: 8 meters
- Soccer field: 16 meters
- Baseball diamond: 32 meters
- Track & field: 16 meters
- Default: 20 meters

**Logic**:
```typescript
1. Convert prediction pixel coordinates to lat/lng
2. Query ALL courts of same class (pending + verified)
3. Calculate distance to each court using haversine formula
4. Find nearest court within class-specific radius
5. Return nearest court if within radius, otherwise null
```

**Location**: `convex/courts.ts:282-316`

### Pending vs Verified Courts

**Initial State**: All courts start as `status: 'pending'`

**Verification Requirements**:
- Minimum 3 feedback submissions total
- Minimum 75% positive feedback
- If thresholds met → `status: 'verified'`, `verifiedAt` set to timestamp

### Manual Creation

**Admin Functions**: `courts:setCourtStatus`, `courts:updateCourtStatus`

Allows admins to:
- Override court status to any state
- Manually reject false positives
- Verify courts without meeting feedback thresholds

## Court Lifecycle

### Status States

| State | Description | Transition |
|-------|-------------|------------|
| `pending` | Newly created, awaiting verification | → `verified` (feedback thresholds met) |
| | | → `rejected` (admin action) |
| `verified` | Meets community verification criteria | → `rejected` (admin action) |
| `rejected` | Invalid detection, removed from display | Final state |

### Verification Process

**Trigger**: Feedback submission

**Function**: `courts:verifyFromFeedback` (`convex/courts.ts:110-178`)

**Algorithm**:
```typescript
1. Get the prediction's court (every prediction must have one)
2. Get ALL predictions linked to that court
3. Get ALL feedback submissions for ALL those predictions
4. Aggregate:
   - totalFeedbackCount = count(all feedback)
   - positiveFeedbackCount = count(feedback where response = 'yes')
5. Update court with aggregated counts
6. Calculate positive percentage = positiveFeedbackCount / totalFeedbackCount
7. If total >= 3 AND positive percentage >= 0.75:
     Set status = 'verified'
     Set verifiedAt = current timestamp
8. Update all feedback records' courtId field
```

**Key Insight**: Feedback from ALL linked predictions is aggregated, not just the prediction that received the feedback.

### Feedback Submission

**User Action**: User clicks "Yes", "No", or "Not sure" on a prediction

**Function**: `feedback_submissions:submitFeedback` (`convex/feedback_submissions.ts:201-290`)

**Validation**:
- One feedback per user per prediction
- Links feedback to prediction and court
- Triggers `verifyFromFeedback` asynchronously

## Display Requirements

### Map Markers

**Component**: `src/components/map/CourtMarker.tsx`

**Visual Design**:
- Verified courts: Green marker with emoji
- Pending courts: Yellow/Orange marker with emoji
- Emoji by class: 🏀 🎾 🏈 ⚾ 🏃

**Visibility**:
- Zoom level 10+: Individual markers visible
- Zoom level < 10: Clustered markers
- Filter by status (all/verified/pending)
- Filter by confidence threshold (default 0.5)

**Interaction**:
- Click marker → Open popup
- Hover → Show preview tooltip

### Popup Content

**Component**: `src/components/map/CourtPopup.tsx`

**Pending Courts**:
- Court type display name
- Class emoji
- ML confidence score
- "Pending verification" badge
- "View details" button

**Verified Courts**:
- Court type display name
- Class emoji
- ✓ Verified badge
- Feedback count (X positive of Y total)
- "View details" button

### Detail Drawer

**Component**: `src/components/map/CourtDetailDrawer.tsx`

**Sections**:
1. **Satellite Image**: Static map tile centered on court location
2. **Court Information**:
   - Type and class
   - Distance from user (if location available)
   - Verification status
3. **Source Data**:
   - Detection confidence (if pending)
   - Model version (if available)
4. **Feedback Stats** (if verified):
   - Positive count / Total count
   - Positive percentage
5. **Actions**:
   - Feedback buttons (if unverified)
   - "Open in Maps" button
   - Favorite/save button

### Clustering

**Component**: `src/components/map/CourtClusters.tsx`

**Purpose**: Group nearby courts when zoomed out

**Logic**:
- Cluster courts within ~50px of each other
- Display count and dominant class emoji
- Click cluster → Zoom to bounds
- Color code by cluster size

## API Requirements

### Queries

**`courts:getByPredictionId`** (`convex/courts.ts:45-52`)
- Input: `predictionId: Id<'inference_predictions'>`
- Output: Court record or null
- Purpose: Get court for a specific prediction

**`courts:findOverlappingCourt`** (`convex/courts.ts:55-97`)
- Input: `bbox: {x, y, width, height}`, `tileId`, `class`
- Output: Nearest overlapping court or null
- Purpose: Find court by bounding box overlap (75% threshold)

**`courts:findNearbyCourt`** (`convex/courts.ts:282-316`)
- Input: `latitude`, `longitude`, `class`
- Output: Nearest court within radius or null
- Purpose: Find court by haversine distance

**`inferences:featuresByViewport`** (`convex/inferences.ts`)
- Input: `bounds: {north, south, east, west}`, `zoom`, `filters`
- Output: GeoJSON features for map display
- Purpose: Get all courts/predictions visible in current viewport

### Mutations

**`courts:createPendingCourtFromPrediction`** (`convex/courts.ts:65-108`)
- Input: `predictionId: Id<'inference_predictions'>`
- Output: `courtId: Id<'courts'>`
- Purpose: Create new court from prediction
- Side effects: Sets court status to 'pending', copies prediction metadata

**`courts:verifyFromFeedback`** (`convex/courts.ts:110-178`)
- Input: `predictionId: Id<'inference_predictions'>`
- Output: void
- Purpose: Aggregate feedback and update court status
- Side effects: Updates court status, links all feedback to court

**`courts:updateCourtStatus`** (admin only)
- Input: `courtId`, `status`
- Output: void
- Purpose: Manual status override
- Side effects: Updates court status, sets verifiedAt if verifying

### Internal Functions

**`courts:setCourtStatus`**
- Internal version of `updateCourtStatus`
- Bypasses RLS for admin operations

## Edge Cases & Constraints

### Duplicate Prevention

**Problem**: Multiple model versions scanning the same area can create duplicate courts

**Solution**:
1. Search ALL existing courts (pending + verified) before creating
2. Use class-specific distance thresholds
3. Link to nearest matching court if within radius
4. Only create new court if no match found

**Constraint**: One court per real-world location

### Orphaned Predictions

**Problem**: Prediction without a linked court

**Solution**:
1. Migration ensures all predictions have courtId
2. `upsertPrediction` automatically links/creates courts
3. Query errors if prediction.courtId is null

**Constraint**: Every prediction must have exactly one court

### Feedback Aggregation

**Problem**: Feedback on different predictions for the same court not counted together

**Solution**:
1. Store feedback on predictions, not courts
2. `verifyFromFeedback` queries ALL predictions for the court
3. Aggregates feedback across all linked predictions
4. Updates feedback records with courtId

**Constraint**: Court verification = aggregated feedback from ALL linked predictions

### Multi-Class Overlap

**Problem**: A basketball court prediction overlaps a tennis court prediction

**Solution**:
1. Only compare predictions/courts of same class
2. Separate radius thresholds per class
3. Different classes can coexist at same location

**Constraint**: Courts are only linked/deduplicated within the same class

### Temporal Changes

**Problem**: Court no longer exists, or court type changed

**Solution**:
1. Admin can set status to 'rejected'
2. Negative feedback will prevent verification
3. Future: Add 'demolished' status or 'changed' status

**Constraint**: No automatic deletion, only status changes

## Performance Considerations

### Query Optimization

**Problem**: Scanning all courts for nearby search is O(n)

**Current Approach**:
- Scan all courts of same class
- Filter by distance in memory
- Acceptable for < 10,000 courts

**Future Improvements**:
- Add geospatial index (e.g., tile-based indexing)
- Cache nearby court lookups
- Pre-compute court clusters

### Aggregation Cost

**Problem**: Aggregating feedback for a court with many linked predictions

**Current Approach**:
- Query all predictions for court (typically 1-5)
- Query all feedback for those predictions
- Aggregate in memory

**Constraint**: Courts typically have < 10 linked predictions

### Migration Performance

**Problem**: Backfilling courtId for all predictions

**Approach**:
- Batch processing with pagination
- Progress tracking
- Idempotent operations

## Visual Constants

### Court Class Visuals

**Location**: `src/lib/constants.ts:29-110`

```typescript
COURT_CLASS_VISUALS: Record<string, CourtClassVisual> = {
  'basketball-court': {
    emoji: '🏀',
    displayName: 'Basketball Court',
    color: 'orange',
    dedupRadiusM: 10,
  },
  'tennis-court': {
    emoji: '🎾',
    displayName: 'Tennis Court',
    color: 'blue',
    dedupRadiusM: 8,
  },
  'soccer-ball-field': {
    emoji: '🏈',
    displayName: 'Soccer/Football Field',
    color: 'green',
    dedupRadiusM: 16,
  },
  'baseball-diamond': {
    emoji: '⚾',
    displayName: 'Baseball Field',
    color: 'red',
    dedupRadiusM: 32,
  },
  'ground-track-field': {
    emoji: '🏃',
    displayName: 'Track & Field',
    color: 'purple',
    dedupRadiusM: 16,
  },
}
```

### Verification Thresholds

```typescript
COURT_VERIFICATION = {
  MIN_FEEDBACK_COUNT: 3,
  MIN_POSITIVE_PERCENTAGE: 0.75,
}
```

## Testing Requirements

### Unit Tests Needed

1. **Court Linking**:
   - Find nearby court returns nearest within radius
   - Find nearby court returns null if no match
   - Find nearby court only searches same class

2. **Verification**:
   - Court verifies at 3 positive of 3 total
   - Court verifies at 3 positive of 4 total (75%)
   - Court doesn't verify at 2 positive of 3 total (66%)
   - Court doesn't verify with < 3 total feedback

3. **Feedback Aggregation**:
   - Aggregates feedback from 2 linked predictions
   - Correctly calculates positive percentage
   - Updates all feedback records' courtId

### Integration Tests Needed

1. **Prediction Upsert**:
   - Creates new court when no nearby court exists
   - Links to existing court when within radius
   - Creates separate court for different class

2. **Feedback Flow**:
   - Submit feedback → verification triggered
   - Court status updates after threshold met
   - Multiple predictions aggregate correctly

## Migration Strategy

### Existing Data

**Problem**: Historical predictions without courtId

**Solution**: `linkPredictionsToCourtsByBboxOverlap` migration

**Steps**:
1. For each prediction without courtId:
   - Convert to lat/lng
   - Find nearby court (all courts)
   - Link to existing court or create new pending court
2. For each court:
   - Get all linked predictions
   - Get all feedback for those predictions
   - Aggregate counts
   - Update court status based on thresholds

**Location**: `convex/migrations.ts`

### Future Schema Changes

**Backwards Compatibility**:
- Add optional fields with `v.optional()`
- Run migration to populate new fields
- Remove fields after deprecation period

**Data Integrity**:
- Never delete courts, only change status
- Preserve prediction history
- Audit trail for status changes

## Related Files

### Backend
- `convex/schema.ts` - Database schema
- `convex/courts.ts` - Court queries/mutations
- `convex/inference_predictions.ts` - Prediction CRUD
- `convex/feedback_submissions.ts` - Feedback logic
- `convex/inferences.ts` - Batch inference operations
- `convex/migrations.ts` - Data migrations

### Frontend
- `src/components/map/CourtMarker.tsx` - Map markers
- `src/components/map/CourtPopup.tsx` - Marker popups
- `src/components/map/CourtClusters.tsx` - Clustering
- `src/components/map/CourtDetailDrawer.tsx` - Detail panel
- `src/lib/constants.ts` - Visual constants and thresholds

### Utilities
- `convex/lib/spatial.ts` - Haversine distance
- `convex/lib/tiles.ts` - Tile coordinate conversions
- `convex/lib/constants.ts` - Verification and radius thresholds
