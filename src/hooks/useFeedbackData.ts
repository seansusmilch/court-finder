import { useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import type { Id } from '@/../convex/_generated/dataModel';

type FeedbackData = NonNullable<
  ReturnType<typeof useQuery<typeof api.feedback_submissions.getNextPredictionForFeedback>>
>;

/**
 * Hook to manage feedback data with transition handling.
 * Prevents UI flashing by maintaining cached data during transitions.
 */
export function useFeedbackData(
  lockedPredictionId: Id<'inference_predictions'> | undefined
) {
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

  // Determine if we're in a transitioning state (loading next prediction)
  const isTransitioning =
    feedbackData === undefined && lastValidDataRef.current !== null;

  const isInitialLoad = feedbackData === undefined && lastValidDataRef.current === null;
  const isComplete = feedbackData === null && !isTransitioning;

  return {
    feedbackData,
    displayData,
    isTransitioning,
    isInitialLoad,
    isComplete,
  };
}
