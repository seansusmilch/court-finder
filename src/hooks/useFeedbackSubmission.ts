import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import type { Id } from '@/../convex/_generated/dataModel';

type FeedbackResponse = 'yes' | 'no' | 'unsure';

type UseFeedbackSubmissionParams = {
  predictionId: Id<'inference_predictions'> | undefined;
  onSuccess?: () => void;
};

/**
 * Hook to manage feedback submission logic.
 */
export function useFeedbackSubmission({
  predictionId,
  onSuccess,
}: UseFeedbackSubmissionParams) {
  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (response: FeedbackResponse) => {
    if (!predictionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        predictionId,
        userResponse: response,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit feedback', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
  };
}
