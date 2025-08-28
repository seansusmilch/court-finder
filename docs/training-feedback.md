# Training Feedback Feature Usage Guide

## Overview

The Training Feedback feature allows authenticated users to help improve the court detection model by providing feedback on AI predictions. Users can view satellite images with bounding boxes around detected objects and indicate whether each detection is actually a court/field or a false positive.

## Access

- **Route**: `/training-feedback`
- **Authentication**: Required - users must be logged in
- **Navigation**: Available in the main navigation menu as "Training"

## How It Works

### 1. Viewing Predictions

- The page displays satellite images with AI-detected objects highlighted
- Each detection shows:
  - Object class (basketball court, tennis court, soccer field, etc.)
  - Confidence score (percentage)
  - Visual indicators (emoji + color coding)
  - Highlighted detection area with red dashed border
  - Position coordinates and dimensions

### 2. Providing Feedback

- **Primary Question**: "Is this a court/field?" with Yes / No / Unsure buttons
- The question appears next to the action buttons below the image
- Submitting records feedback and automatically loads the next item

### 3. Navigation

- **Auto-advance**: After answering, the next prediction is loaded automatically
- **Unsure**: Use Unsure if you can't tell; it will move you to the next item
- **Progress**: Text shows remaining predictions count

## Features

### Detection Image Display

- **Full Image View**: Shows the complete satellite tile with detection overlay
- **Bounding Box Overlay**: Red border around detected objects
- **Zoom & Pan**: Interactive image viewing with mouse wheel, drag, and touch pinch
- **Auto-fit**: Initial view zooms to show the detection with padding

### Progress Tracking

- Real-time progress indicator
- Count of completed vs. remaining detections
- Success message when feedback is submitted
- Individual feedback tracking per detection

### Responsive Design

- Works on desktop and mobile devices
- Grid layout that adapts to screen size
- Optimized for both mouse and touch interactions

## Data Source

The feature reads from Convex tables and writes user feedback:

- `inference_predictions`: Individual predictions awaiting user review (with bbox, class, confidence).
- `inferences`: Source image and metadata; provides `imageUrl`, `response.image.width`, and `response.image.height` for rendering.
- `feedback_submissions`: Stores per-user feedback for each prediction (yes/no/unsure).

### Data Structure

Feedback is stored per prediction in `feedback_submissions` and linked to the authenticated user. Image dimensions come from the associated `inferences` row.

## User Experience

### For Model Improvement

- High-quality feedback helps retrain the AI model
- User comments provide context for edge cases
- Feedback is tracked per user for accountability

### For Users

- Contribute to improving court detection accuracy
- Learn about AI model performance
- See real satellite imagery and predictions
- Track personal contribution progress

## Technical Details

### Components

- `TrainingFeedbackPage` (in `src/routes/_authed.training-feedback.tsx`): Main page orchestrator with state management, data fetching, and submission.
- `ImageViewer` (inline in `TrainingFeedbackPage`): Custom pan/zoom with mouse wheel, drag, and touch pinch; renders a red bounding box overlay.

### State Management

- Local React state for skip tracking (stored in `localStorage`) and submission busy state
- Server queries for stats and next item are handled via Convex `useQuery`
- Auto-advance is driven by query refetch after submitting feedback

### Authentication

- Uses Convex auth system
- Redirects unauthenticated users to login
- Feedback is attributed to the authenticated user server-side

### Data Fetching

- `api.feedback_submissions.getNextPredictionForFeedback`
- `api.feedback_submissions.getFeedbackStats`
- `api.feedback_submissions.submitFeedback`

## Current Implementation Status

### ✅ Implemented

- Auth-gated route at `/training-feedback` with redirect for unauthenticated users
- Inline `ImageViewer` with pan/zoom and red bbox overlay
- Yes / No / Unsure feedback; submission persists via Convex mutation
- Auto-advance to the next prediction on submit
- Remaining predictions count (non-negative)
- "All Done" empty state when no more predictions

### ⚠️ Partially Implemented

- Skips are local-only (stored in `localStorage`), not persisted server-side
- Remaining count ignores local skips
- No global progress bar UI

### ❌ Not Implemented

- Keyboard shortcuts (Y/N/Enter)
- Comment input
- Previous/Next or batch submission controls
- Analytics/reputation and model retraining integration

## Future Development Requirements

### Database Schema Updates

The current `inferences` table needs to be extended to store user feedback:

```typescript
// Add to convex/schema.ts
inferences: defineTable({
  // ... existing fields ...
  userFeedback: v.optional(v.array(v.object({
    userId: v.string(),
    isCourt: v.boolean(),
    comment: v.optional(v.string()),
    timestamp: v.number(),
    predictionId: v.string(), // "x-y-class" format
  }))),
}),
```

### New Convex Functions Needed

1. **Store Feedback**: Mutation to save user feedback to database
2. **Retrieve Feedback**: Query to get existing feedback for a user
3. **Feedback Analytics**: Query to analyze feedback patterns
4. **User Progress**: Query to track user's training contribution

### Authentication Integration

- Replace hardcoded `'current-user'` with actual user ID from Convex auth
- Ensure user can only modify their own feedback
- Add user permission checks for training data access

### Data Persistence

- Implement actual feedback submission to database
- Add feedback retrieval for existing submissions
- Handle feedback updates and deletions
- Add data validation and error handling

### Performance Considerations

- Current implementation loads all training data at once (limited to 50 items)
- Consider pagination for larger datasets
- Implement caching for frequently accessed feedback
- Optimize image loading and bounding box calculations

### Testing Requirements

- Unit tests for feedback submission logic
- Integration tests for database operations
- UI tests for keyboard shortcuts and navigation
- Performance tests for image rendering and zoom/pan

## Getting Started

1. **Login**: Ensure you're authenticated in the application
2. **Navigate**: Go to `/training-feedback` or click "Training" in the navigation
3. **Start**: Begin with the first detection and provide feedback
4. **Continue**: Use navigation controls to move through detections and items
5. **Submit**: Submit all feedback when complete (currently simulated)

## Support

If you encounter issues or have questions about the training feedback feature:

- Check that you're logged in
- Ensure you have access to the training data
- Contact the development team for technical support

## Development Notes

### Key Files to Modify

- `src/routes/_authed.training-feedback.tsx` — Main page logic, UI, and inline `ImageViewer`
- `convex/feedback_submissions.ts` — Stats, next prediction, and submission
- `convex/schema.ts` — Database schema (`inference_predictions`, `inferences`, `feedback_submissions`)

### Constants

- `INFER_MODEL` and `INFER_VERSION` from `@/lib/constants` control which model data is loaded
- Feedback is limited to 50 items to prevent overwhelming users
- Image zoom is set to 3x initial scale with 0.5x to 4x range

### Known Issues

- Feedback is not persisted between sessions
- User ID is hardcoded instead of using actual auth
- Submit All function only shows success message, no actual submission
- No error handling for failed feedback submissions
- Bounding box positioning may need fine-tuning for edge cases
