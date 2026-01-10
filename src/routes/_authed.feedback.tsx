import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { useNavigate, createFileRoute } from '@tanstack/react-router';
import { getVisualForClass } from '@/lib/constants';
import ImageViewer from '@/components/training/ImageViewer';
import { LoadingSkeleton } from '@/components/training/LoadingSkeleton';
import { AllDoneCard } from '@/components/training/AllDoneCard';
import { ErrorCard } from '@/components/training/ErrorCard';
import { FeedbackHeader } from '@/components/training/FeedbackHeader';
import { FeedbackActions } from '@/components/training/FeedbackActions';
import { useFeedbackPage, useFeedbackSubmission } from '@/hooks';

export const Route = createFileRoute('/_authed/feedback')({
  component: TrainingFeedbackPage,
});

export function TrainingFeedbackPage() {
  const navigate = useNavigate();
  const stats = useQuery(api.feedback_submissions.getFeedbackStats);

  // Manage all feedback page state (locking, data, transitions, loading)
  const {
    displayData,
    isInitialLoad,
    isComplete,
    isActuallyLoading,
    handleImageLoadingChange,
    clearLock,
  } = useFeedbackPage();

  // Handle feedback submission
  const { submit, isSubmitting } = useFeedbackSubmission({
    detectionId: displayData?.prediction?.roboflowDetectionId,
    onSuccess: clearLock,
  });

  const handleFeedback = async (response: 'yes' | 'no' | 'unsure') => {
    if (!displayData || isSubmitting || isActuallyLoading) return;
    await submit(response);
  };

  const predictionsLeft = stats
    ? Math.max(0, stats.totalPredictions - stats.userSubmissionCount)
    : null;

  // Render loading state
  if (isInitialLoad) {
    return <LoadingSkeleton />;
  }

  // Render completion state
  if (isComplete) {
    return <AllDoneCard onNavigateToMap={() => navigate({ to: '/map' })} />;
  }

  // Type guard: displayData should always be defined at this point
  if (!displayData) {
    return null;
  }

  const { prediction, inference, imageUrl } = displayData;
  const { displayName, emoji } = getVisualForClass(prediction.class);
  const imageWidth = inference.response?.image?.width;
  const imageHeight = inference.response?.image?.height;

  // Render error state if image metadata is missing
  if (!imageWidth || !imageHeight) {
    return (
      <ErrorCard message='Image metadata (width/height) is missing for this inference. Cannot display.' />
    );
  }

  // Render main feedback interface
  return (
    <div className='h-full w-full flex flex-col'>
      <FeedbackHeader predictionsLeft={predictionsLeft} />

      <div className='flex flex-col items-center justify-center p-4 flex-1 min-h-0'>
        <ImageViewer
          imageUrl={imageUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          bbox={{
            x: prediction.x as number,
            y: prediction.y as number,
            width: prediction.width as number,
            height: prediction.height as number,
          }}
          onLoadingChange={handleImageLoadingChange}
        />
      </div>

      <FeedbackActions
        displayName={displayName}
        emoji={emoji}
        onSubmit={handleFeedback}
        disabled={isSubmitting || isActuallyLoading}
      />
    </div>
  );
}
