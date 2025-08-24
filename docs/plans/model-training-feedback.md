# Model Training Feedback Page Implementation Plan

## Overview

Create a new page that allows authenticated users to help train the model by providing feedback on predictions. Users will see cropped images with bounding boxes and indicate whether the detected object is actually a court/field or a false positive. All feedback is tracked with the user ID for accountability and future analysis.

## Page Structure

### Route

- **Path**: `/training-feedback`
- **Component**: `TrainingFeedbackPage`
- **Location**: `src/routes/training-feedback.tsx`

### Navigation

- Add link to header navigation (only visible when authenticated)
- Consider adding to footer or main navigation menu
- Redirect unauthenticated users to login page

## Core Components

### 1. TrainingFeedbackPage (`src/routes/training-feedback.tsx`)

Main page component that orchestrates the feedback workflow. Includes authentication check and redirects unauthenticated users.

### 2. FeedbackItem (`src/components/training/FeedbackItem.tsx`)

Individual feedback item showing:

- Cropped image with bounding box overlay
- Prediction details (class, confidence, coordinates)
- Feedback buttons (Yes/No for "Is this a court?")
- Optional text input for additional comments

### 3. FeedbackControls (`src/components/training/FeedbackControls.tsx`)

Navigation and control elements:

- Previous/Next buttons
- Progress indicator
- Submit all feedback button
- Skip button

### 4. BoundingBoxOverlay (`src/components/training/BoundingBoxOverlay.tsx`)

SVG overlay component that draws bounding boxes on images based on prediction coordinates.

## Data Structure

### Data Source

Read from the `inferences` table in Convex, which contains:

- Tile coordinates (z, x, y)
- Image URL from the inference
- Model and version information
- Roboflow response with predictions

### Data Structure

```typescript
interface TrainingFeedbackItem {
  id: string; // inference._id
  imageUrl: string; // inference.imageUrl
  tileInfo: {
    z: number;
    x: number;
    y: number;
  };
  model: string;
  version: string;
  predictions: RoboflowPrediction[]; // from inference.response.predictions
  userFeedback?: {
    isCourt: boolean;
    comment?: string;
    timestamp: Date;
    userId: string; // ID of the user who provided feedback
  };
}

interface TrainingFeedbackState {
  items: TrainingFeedbackItem[];
  currentIndex: number;
  submittedFeedback: Map<string, TrainingFeedbackItem['userFeedback']>;
  isLoading: boolean;
  error?: string;
}

// From convex/lib/roboflow.ts
interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
  detection_id?: string;
}
```

### Data Fetching

- Query the inferences table to get available inference results
- Filter by model/version if needed
- Transform inference data to TrainingFeedbackItem format
- Handle loading states and errors gracefully
- Ensure user is authenticated before allowing access to training data

### New Convex Query Function

Add to `convex/inferences.ts`:

```typescript
export const getTrainingData = query({
  args: {
    model: v.optional(v.string()),
    version: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Query inferences table and return items suitable for training feedback
    // Filter by model/version if specified
    // Limit results and order by most recent
    // Transform to TrainingFeedbackItem format
  },
});
```

## UI/UX Design

### Layout

- **Header**: Page title, progress indicator, navigation
- **Main Content**: Large image display with bounding box overlay
- **Sidebar**: Prediction details, feedback form
- **Footer**: Navigation controls

### Image Display

- Show cropped version of original satellite image
- Overlay bounding boxes using SVG
- Color-code boxes by confidence level
- Show prediction class and confidence score on hover

### Feedback Interface

- **Primary Question**: "Is this a court/field?" with Yes/No buttons
- **Secondary Input**: Optional text field for comments
- **Visual Feedback**: Clear indication of selected answer
- **Accessibility**: Keyboard navigation, screen reader support

## Implementation Steps

### Phase 1: Basic Structure

1. Create route file and add to navigation
2. Create main page component with basic layout and authentication check
3. Implement data fetching from inferences table with auth validation
4. Create basic feedback item component

### Phase 2: Core Functionality

1. Implement bounding box overlay component
2. Add feedback form with Yes/No buttons
3. Implement navigation between items
4. Add progress tracking
5. Capture and store user ID with each feedback submission

### Phase 3: Enhanced Features

1. Add keyboard shortcuts (Y/N for Yes/No)
2. Implement feedback submission logic
3. Add visual feedback and animations
4. Improve accessibility

### Phase 4: Polish

1. Add loading states and error handling
2. Implement responsive design
3. Add keyboard navigation
4. Performance optimization

## Authentication & User Management

### Authentication Requirements

- Users must be logged in to access the training feedback page
- Redirect unauthenticated users to the login page
- Use existing Convex auth system (`useConvexAuth` hook)

### User ID Tracking

- Capture authenticated user ID from Convex auth context
- Associate all feedback with the user who provided it
- Store user ID locally with feedback data (for future database integration)
- Display user attribution in feedback history

### Route Protection

- Implement route-level authentication check
- Use TanStack Router's beforeLoad for authentication validation
- Provide clear feedback when access is denied

## Technical Considerations

### Image Handling

- Use HTML5 Canvas or SVG for bounding box overlays
- Ensure proper scaling for different image sizes
- Handle image loading states gracefully

### State Management

- Use React state for current item and feedback
- Consider using React Context for larger state
- Implement proper cleanup and memory management
- Track authenticated user ID for feedback attribution

### Performance

- Lazy load images as needed
- Optimize re-renders with React.memo
- Use virtual scrolling if dealing with many items

### Accessibility

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Future Enhancements

### Database Integration

- Store user feedback in Convex database with user ID tracking
- Track feedback history per user
- Analytics on feedback patterns and user contributions
- User reputation system based on feedback quality

### Model Improvement

- Use feedback to retrain model
- Confidence score adjustments
- New class detection

### User Experience

- Batch feedback submission
- Export feedback data
- Feedback review and editing
- User reputation system
- Personal feedback dashboard showing user's contribution history

## File Structure

```
src/
├── routes/
│   └── training-feedback.tsx
├── components/
│   └── training/
│       ├── index.ts
│       ├── TrainingFeedbackPage.tsx
│       ├── FeedbackItem.tsx
│       ├── FeedbackControls.tsx
│       ├── BoundingBoxOverlay.tsx
│       └── types.ts
└── convex/
    └── inferences.ts (existing - add new query function)
```

## Dependencies

- No new external dependencies required
- Uses existing shadcn UI components
- Leverages existing court detection logic and constants
- Uses existing Convex backend for data fetching
- Extends existing inferences table schema
- Uses existing Convex auth system for user authentication

## Testing Strategy

- Unit tests for individual components
- Integration tests for feedback workflow
- Authentication and authorization testing
- Accessibility testing with screen readers
- Cross-browser compatibility testing
