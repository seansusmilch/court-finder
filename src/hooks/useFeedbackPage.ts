import { useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { usePredictionLock, useImageLoadingState } from './';

type FeedbackData = NonNullable<
  ReturnType<typeof useQuery<typeof api.feedback_submissions.getNextPredictionForFeedback>>
>;

/**
 * Combined hook that manages all feedback page state:
 * - Prediction locking to prevent view changes during sync
 * - Data fetching with transition handling
 * - Image loading state
 */
export function useFeedbackPage() {
  // Get initial feedback data
  const initialFeedbackData = useQuery(
    api.feedback_submissions.getNextPredictionForFeedback,
    {}
  );

  // Lock onto the current prediction when we receive it
  const { lockedPredictionId, clearLock } = usePredictionLock(
    initialFeedbackData?.prediction?._id
  );

  // Get feedback data with locked prediction ID
  const feedbackData = useQuery(
    api.feedback_submissions.getNextPredictionForFeedback,
    { currentPredictionId: lockedPredictionId }
  );

  // Keep track of the last valid feedback data to prevent flashing
  const lastValidDataRef = useRef<FeedbackData | null>(null);
  if (feedbackData) {
    lastValidDataRef.current = feedbackData;
  }

  // Use current data, or fall back to last valid data while transitioning
  const displayData = feedbackData ?? lastValidDataRef.current;

  // Determine if we're in a transitioning state
  const isTransitioning =
    feedbackData === undefined && lastValidDataRef.current !== null;
  const isInitialLoad =
    feedbackData === undefined && lastValidDataRef.current === null;
  const isComplete = feedbackData === null && !isTransitioning;

  // Manage image loading state
  const { isActuallyLoading, handleImageLoadingChange } = useImageLoadingState(
    isTransitioning,
    displayData?.imageUrl
  );

  return {
    displayData,
    isTransitioning,
    isInitialLoad,
    isComplete,
    isActuallyLoading,
    handleImageLoadingChange,
    clearLock,
  };
}
