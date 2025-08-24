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

- **Primary Question**: "Is this a court/field?" with Yes/No buttons
- **Secondary Input**: Optional text field for additional comments
- **Keyboard Shortcuts**:
  - Press `Y` for Yes
  - Press `N` for No
  - Press `Enter` to submit (after selecting Yes/No)

### 3. Navigation

- **Previous/Next**: Navigate between different detections and inference results
- **Skip**: Skip the current detection without providing feedback
- **Progress**: Visual progress bar showing completion status
- **Submit All**: Submit all collected feedback at once

## Features

### Detection Image Display

- **Full Image View**: Shows the complete satellite tile with detection overlay
- **Bounding Box Overlay**: Red dashed border around detected objects
- **Zoom & Pan**: Interactive image viewing with react-zoom-pan-pinch
- **Auto-centering**: Automatically centers view on the current detection
- **Detection Label**: Shows class name and confidence percentage above bounding box

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

The training data comes from the Convex `inferences` table, which contains:

- Satellite image tiles processed by the AI model
- Model predictions with bounding box coordinates
- Confidence scores and object classifications
- Timestamp and model version information

### Data Structure

```typescript
interface TrainingFeedbackItem {
  id: string; // inference._id
  imageUrl: string; // inference.imageUrl
  imageWidth: number; // inference.response.image.width
  imageHeight: number; // inference.response.image.height
  tileInfo: {
    z: number;
    x: number;
    y: number;
  };
  model: string;
  version: string;
  predictions: RoboflowPrediction[]; // from inference.response.predictions
  requestedAt: number;
}

interface FeedbackSubmission {
  itemId: string;
  predictionId: string; // Format: "x-y-class"
  isCourt: boolean;
  comment?: string;
  userId: string; // Currently hardcoded as 'current-user'
}
```

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

- `TrainingFeedbackPage`: Main page orchestrator with state management
- `DetectionFeedbackItem`: Individual detection feedback interface
- `DetectionImageView`: Image display with bounding box overlay and zoom/pan
- `FeedbackControls`: Navigation and progress controls
- `BoundingBoxOverlay`: SVG overlay for bounding boxes

### State Management

- Local React state for current item, detection, and feedback
- Map-based storage for submitted feedback per detection
- Automatic navigation between detections and items
- Progress tracking across multiple inference results

### Authentication

- Uses Convex auth system
- Redirects unauthenticated users to login
- User ID tracking for feedback attribution (currently hardcoded)

### Data Fetching

- Uses `api.inferences.getTrainingData` Convex query
- Filters by model and version constants
- Limits to 50 items to prevent overwhelming users
- Sorts by most recent inference results

## Current Implementation Status

### ✅ Implemented

- Complete UI for feedback collection
- Image display with bounding box overlays
- Navigation between detections and items
- Progress tracking and submission
- Keyboard shortcuts for quick feedback
- Responsive design and mobile support

### ⚠️ Partially Implemented

- **Feedback Storage**: Currently only stores in local state, not persisted to database
- **User ID**: Hardcoded as 'current-user' instead of actual authenticated user ID
- **Submit All**: Simulates submission with alert, no actual database persistence

### ❌ Not Implemented

- Database schema for storing user feedback
- Feedback retrieval and analysis
- User reputation system
- Model retraining pipeline
- Feedback analytics and insights

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

- `src/routes/training-feedback.tsx` - Main page logic
- `src/components/training/DetectionFeedbackItem.tsx` - Feedback interface
- `src/components/training/types.ts` - Type definitions
- `convex/inferences.ts` - Database queries and mutations
- `convex/schema.ts` - Database schema

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
