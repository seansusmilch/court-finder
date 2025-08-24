import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { redirect, useNavigate } from '@tanstack/react-router';
import { api } from '@backend/api';
import { DetectionFeedbackItem } from '@/components/training/DetectionFeedbackItem';
import { FeedbackControls } from '@/components/training/FeedbackControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { FeedbackSubmission } from '@/components/training/types';
import { INFER_MODEL, INFER_VERSION } from '@/lib/constants';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/training-feedback')({
  component: TrainingFeedbackPage,
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({
        to: '/login',
        search: { redirect: '/training-feedback' },
      });
  },
});

export function TrainingFeedbackPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentDetectionIndex, setCurrentDetectionIndex] = useState(0);
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Map<string, FeedbackSubmission>
  >(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch training data
  const trainingData = useQuery(api.inferences.getTrainingData, {
    model: INFER_MODEL,
    version: INFER_VERSION,
    limit: 50, // Limit to prevent overwhelming the user
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Reset to first item when data changes
  useEffect(() => {
    if (trainingData && trainingData.length > 0) {
      setCurrentItemIndex(0);
      setCurrentDetectionIndex(0);
    }
  }, [trainingData]);

  if (authLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (!trainingData) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>Loading Training Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin mr-3' />
              <span>Loading training data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trainingData.length === 0) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>No Training Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center py-8'>
              <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
              <p className='text-muted-foreground mb-4'>
                No inference results are available for training feedback at the
                moment.
              </p>
              <Button onClick={() => navigate({ to: '/map' })}>
                Go to Map
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = trainingData[currentItemIndex];
  const currentDetection = currentItem?.predictions[currentDetectionIndex];
  const submittedCount = submittedFeedback.size;
  const isLastItem = currentItemIndex === trainingData.length - 1;
  const isLastDetection =
    currentDetectionIndex === (currentItem?.predictions.length || 0) - 1;

  const handleFeedbackSubmit = (feedback: FeedbackSubmission) => {
    setSubmittedFeedback((prev) =>
      new Map(prev).set(feedback.predictionId, feedback)
    );

    // Auto-advance to next detection or item
    if (!isLastDetection) {
      setCurrentDetectionIndex((prev) => prev + 1);
    } else if (!isLastItem) {
      setCurrentItemIndex((prev) => prev + 1);
      setCurrentDetectionIndex(0);
    }
  };

  const handleSkip = () => {
    if (!isLastDetection) {
      setCurrentDetectionIndex((prev) => prev + 1);
    } else if (!isLastItem) {
      setCurrentItemIndex((prev) => prev + 1);
      setCurrentDetectionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentDetectionIndex > 0) {
      setCurrentDetectionIndex((prev) => prev - 1);
    } else if (currentItemIndex > 0) {
      const prevItem = trainingData[currentItemIndex - 1];
      setCurrentItemIndex((prev) => prev - 1);
      setCurrentDetectionIndex(prevItem.predictions.length - 1);
    }
  };

  const handleNext = () => {
    if (currentDetectionIndex < (currentItem?.predictions.length || 0) - 1) {
      setCurrentDetectionIndex((prev) => prev + 1);
    } else if (currentItemIndex < trainingData.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
      setCurrentDetectionIndex(0);
    }
  };

  const handleSubmitAll = async () => {
    if (submittedCount === 0) return;

    setIsSubmitting(true);

    try {
      // TODO: Implement actual feedback submission to database
      // For now, just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message and reset
      alert(
        `Successfully submitted feedback for ${submittedCount} detections!`
      );
      setSubmittedFeedback(new Map());
      setCurrentItemIndex(0);
      setCurrentDetectionIndex(0);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>
          Model Training Feedback
        </h1>
        <p className='text-muted-foreground mt-2'>
          Help improve our court detection model by providing feedback on
          predictions.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        {/* Main content area */}
        <div className='lg:col-span-3'>
          {currentItem && currentDetection ? (
            <DetectionFeedbackItem
              itemId={currentItem.id}
              prediction={currentDetection}
              imageUrl={currentItem.imageUrl}
              imageWidth={currentItem.imageWidth}
              imageHeight={currentItem.imageHeight}
              onSubmit={handleFeedbackSubmit}
              onSkip={handleSkip}
              isLast={isLastItem && isLastDetection}
              existingFeedback={submittedFeedback.get(
                `${currentDetection.x}-${currentDetection.y}-${currentDetection.class}`
              )}
            />
          ) : (
            <Card>
              <CardContent className='pt-6'>
                <div className='text-center py-8'>
                  <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                  <p className='text-muted-foreground'>
                    No detections available for feedback.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar with controls */}
        <div className='lg:col-span-1'>
          <FeedbackControls
            currentIndex={currentItemIndex}
            totalItems={trainingData.length}
            submittedCount={submittedCount}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSkip={handleSkip}
            onSubmitAll={handleSubmitAll}
            canGoPrevious={currentItemIndex > 0 || currentDetectionIndex > 0}
            canGoNext={
              currentItemIndex < trainingData.length - 1 ||
              currentDetectionIndex < (currentItem?.predictions.length || 0) - 1
            }
            isSubmitting={isSubmitting}
          />

          {/* Quick stats */}
          <Card className='mt-4'>
            <CardHeader>
              <CardTitle className='text-sm'>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>Total Detections:</span>
                <span className='font-medium'>
                  {trainingData.reduce(
                    (total, item) => total + item.predictions.length,
                    0
                  )}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Completed:</span>
                <span className='font-medium text-green-600'>
                  {submittedCount}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Current:</span>
                <span className='font-medium text-blue-600'>
                  Item {currentItemIndex + 1}, Detection{' '}
                  {currentDetectionIndex + 1}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success message when all feedback is submitted */}
      {submittedCount > 0 && trainingData.length > 0 && (
        <Card className='mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3 text-green-800 dark:text-green-200'>
              <CheckCircle className='h-5 w-5' />
              <span className='font-medium'>
                Great job! You've provided feedback on {submittedCount}{' '}
                detection{submittedCount !== 1 ? 's' : ''}.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
