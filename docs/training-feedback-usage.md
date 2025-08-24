# Training Feedback Feature Usage Guide

## Overview

The Training Feedback feature allows authenticated users to help improve the court detection model by providing feedback on AI predictions. Users can view satellite images with bounding boxes around detected objects and indicate whether each detection is actually a court/field or a false positive.

## Access

- **Route**: `/training-feedback`
- **Authentication**: Required - users must be logged in
- **Navigation**: Available in the main navigation menu as "Training"

## How It Works

### 1. Viewing Predictions

- The page displays cropped satellite images focused on individual AI-detected objects
- Each cropped view shows:
  - Object class (basketball court, tennis court, soccer field, etc.)
  - Confidence score (percentage)
  - Visual indicators (emoji + color coding)
  - Highlighted detection area with dashed border

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

### Cropped Detection Views

- Each detection is displayed in a focused, cropped view
- Detection areas are highlighted with white dashed borders
- Images are automatically cropped around each detection with padding

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

- `TrainingFeedbackPage`: Main page orchestrator
- `CroppedDetectionItem`: Individual detection feedback interface
- `FeedbackControls`: Navigation and progress controls
- `BoundingBoxOverlay`: SVG overlay for bounding boxes

### State Management

- Local React state for current item, detection, and feedback
- Map-based storage for submitted feedback per detection
- Automatic navigation between detections and items

### Authentication

- Uses Convex auth system
- Redirects unauthenticated users to login
- User ID tracking for feedback attribution

## Future Enhancements

- Database storage for feedback submissions
- User reputation system
- Feedback analytics and insights
- Model retraining based on user feedback
- Batch feedback processing
- Export functionality for feedback data

## Getting Started

1. **Login**: Ensure you're authenticated in the application
2. **Navigate**: Go to `/training-feedback` or click "Training" in the navigation
3. **Start**: Begin with the first detection and provide feedback
4. **Continue**: Use navigation controls to move through detections and items
5. **Submit**: Submit all feedback when complete

## Support

If you encounter issues or have questions about the training feedback feature:

- Check that you're logged in
- Ensure you have access to the training data
- Contact the development team for technical support
