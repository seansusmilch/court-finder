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
      <ErrorCard message='The satellite image metadata is incomplete, so this review cannot be displayed.' />
    );
  }

  // Render main feedback interface
  return (
    <div className='feedback-page min-h-full w-full bg-muted/20'>
      <FeedbackHeader predictionsLeft={predictionsLeft} />

      <div className='mx-auto grid w-full max-w-6xl items-start gap-4 px-4 pb-4 sm:px-6 md:gap-6 md:px-8 md:pb-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-8'>
        <section className='min-w-0' aria-labelledby='feedback-evidence-heading'>
          <div className='mb-2 flex items-end justify-between gap-4 px-1 md:mb-3'>
            <div>
              <h2
                id='feedback-evidence-heading'
                className='text-sm font-semibold tracking-tight sm:text-base'
              >
                Satellite evidence
              </h2>
              <p className='mt-1 text-xs text-muted-foreground sm:text-sm'>
                The outline marks the area the model classified.
              </p>
            </div>
            <span className='hidden shrink-0 rounded-full border border-border/70 bg-card px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex'>
              Drag · pinch · scroll
            </span>
          </div>

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
            className='aspect-[5/3] min-h-[13rem] max-h-[62vh] rounded-2xl sm:aspect-[4/3] sm:min-h-0'
            onLoadingChange={handleImageLoadingChange}
          />
          <p className='mt-3 px-1 text-xs leading-5 text-muted-foreground'>
            Review the surrounding context before choosing an answer.
          </p>
        </section>

        <FeedbackActions
          displayName={displayName}
          emoji={emoji}
          onSubmit={handleFeedback}
          disabled={isSubmitting || isActuallyLoading}
        />
      </div>
    </div>
  );
}
