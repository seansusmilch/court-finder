import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import type { Id } from '@/../convex/_generated/dataModel';

type FeedbackResponse = 'yes' | 'no' | 'unsure';

type UseFeedbackSubmissionParams = {
  detectionId: string | undefined;
  onSuccess?: () => void;
};

/**
 * Hook to manage feedback submission logic.
 */
export function useFeedbackSubmission({
  detectionId,
  onSuccess,
}: UseFeedbackSubmissionParams) {
  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (response: FeedbackResponse) => {
    if (!detectionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        detectionId,
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
