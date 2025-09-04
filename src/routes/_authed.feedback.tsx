import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import {
  redirect,
  useNavigate,
  Link,
  createFileRoute,
} from '@tanstack/react-router';
import type { Id } from '@/../convex/_generated/dataModel';
import { getVisualForClass } from '@/lib/constants';
import ImageViewer from '@/components/training/ImageViewer';

export const Route = createFileRoute('/_authed/feedback')({
  component: TrainingFeedbackPage,
});

export function TrainingFeedbackPage() {
  const navigate = useNavigate();

  const stats = useQuery(api.feedback_submissions.getFeedbackStats);
  const feedbackData = useQuery(
    api.feedback_submissions.getNextPredictionForFeedback,
    {}
  );
  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (response: 'yes' | 'no' | 'unsure') => {
    if (!feedbackData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        predictionId: feedbackData.prediction
          ._id as Id<'inference_predictions'>,
        userResponse: response,
      });
      // The query will automatically refetch and get the next item.
    } catch (error) {
      console.error('Failed to submit feedback', error);
      // Handle error, maybe show a toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const predictionsLeft = stats
    ? Math.max(0, stats.totalPredictions - stats.userSubmissionCount)
    : null;

  if (feedbackData === undefined) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (feedbackData === null) {
    return (
      <div className='container mx-auto px-4 py-8 text-center'>
        <Card className='max-w-md mx-auto'>
          <CardHeader>
            <CardTitle>All Done!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground mb-4'>
              You have provided feedback on all available images. Thank you!
            </p>
            <Button onClick={() => navigate({ to: '/map' })}>
              Back to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { prediction, inference, imageUrl, tile } = feedbackData;
  const { displayName, emoji } = getVisualForClass(prediction.class);

  // Roboflow response contains image dimensions
  const imageWidth = inference.response?.image?.width;
  const imageHeight = inference.response?.image?.height;

  if (!imageWidth || !imageHeight) {
    return (
      <div className='container mx-auto px-4 py-4'>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center py-8'>
              <AlertCircle className='h-12 w-12 text-destructive mx-auto mb-4' />
              <p className='text-muted-foreground mb-4'>
                Image metadata (width/height) is missing for this inference.
                Cannot display.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='h-full w-full flex flex-col'>
      {/* Top section with help button and progress */}
      <div className='flex justify-between items-center p-4 flex-shrink-0'>
        <div className='flex items-center space-x-2'>
          {predictionsLeft !== null && (
            <span className='text-sm text-muted-foreground'>
              {predictionsLeft} left
            </span>
          )}
        </div>
        <Button
          asChild
          variant='ghost'
          size='sm'
          className='flex items-center space-x-2'
        >
          <Link to='/feedback/help'>
            <HelpCircle className='h-4 w-4' />
            <span className='hidden sm:inline'>Help</span>
          </Link>
        </Button>
      </div>

      {/* Main content area - fixed height for image viewer */}
      <div className='flex flex-col items-center justify-center p-4 flex-shrink-0'>
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
        />
      </div>

      {/* Bottom section with question and buttons - grows to fill remaining space */}
      <div className='bg-background p-4 pb-20 space-y-4 flex-1 flex flex-col justify-end'>
        <div className='text-center'>
          <div className='text-lg font-medium flex items-center justify-center'>
            <span className='mr-2'>{emoji}</span> Is this a {displayName}?
          </div>
        </div>

        <div className='flex justify-center space-x-2 sm:space-x-4'>
          <Button
            size='lg'
            variant='outline'
            className='bg-red-500 hover:bg-red-600 text-white flex-1 max-w-[100px] sm:max-w-[120px]'
            onClick={() => handleFeedback('no')}
            disabled={isSubmitting}
          >
            ❌ No
          </Button>
          <Button
            size='lg'
            variant='outline'
            onClick={() => handleFeedback('unsure')}
            disabled={isSubmitting}
            className='flex-1 max-w-[100px] sm:max-w-[120px]'
          >
            🤔 Unsure
          </Button>
          <Button
            size='lg'
            variant='outline'
            className='bg-green-500 hover:bg-green-600 text-white flex-1 max-w-[100px] sm:max-w-[120px]'
            onClick={() => handleFeedback('yes')}
            disabled={isSubmitting}
          >
            ✅ Yes
          </Button>
        </div>
        <div className='text-center text-xs text-muted-foreground pt-4'>
          <p>Prediction ID: {prediction._id}</p>
          <p>
            Tile: {tile.z}/{tile.x}/{tile.y}
          </p>
        </div>
      </div>
    </div>
  );
}
