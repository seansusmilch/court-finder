import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { redirect, useNavigate } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { DetectionFeedbackItem } from '@/components/training/DetectionFeedbackItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import type { FeedbackSubmission } from '@/components/training/types';
import { INFER_MODEL, INFER_VERSION } from '@/lib/constants';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/training-feedback')({
  component: TrainingFeedbackPage,
  beforeLoad: async ({ context }) => {
    if (!context.me) {
      throw redirect({
        to: '/login',
        search: { redirect: '/training-feedback' },
      });
    }
  },
});

export function TrainingFeedbackPage() {
  const navigate = useNavigate();

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentDetectionIndex, setCurrentDetectionIndex] = useState(0);
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Map<string, FeedbackSubmission>
  >(new Map());
  // Fetch training data
  const trainingData = useQuery(api.inferences.getTrainingData, {
    model: INFER_MODEL,
    version: INFER_VERSION,
    limit: 50, // Limit to prevent overwhelming the user
  });

  // Reset to first item when data changes
  useEffect(() => {
    if (trainingData && trainingData.length > 0) {
      setCurrentItemIndex(0);
      setCurrentDetectionIndex(0);
    }
  }, [trainingData]);

  if (!trainingData) {
    return (
      <div className='container mx-auto px-4 py-4'>
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
      <div className='container mx-auto px-4 py-4'>
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

  return (
    <div className='px-4 py-4'>
      {/* Main content */}
      <div className='space-y-6'>
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
    </div>
  );
}
