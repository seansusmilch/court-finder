import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, HelpCircle } from 'lucide-react';
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
      <div className='h-full w-full flex flex-col'>
        <div className='flex justify-between items-center p-4 flex-shrink-0'>
          <Skeleton className='h-5 w-20' />
          <Skeleton className='h-9 w-16' />
        </div>
        <div className='flex flex-col items-center justify-center p-4 flex-1'>
          <Skeleton className='w-full max-w-2xl aspect-square rounded-lg' />
        </div>
        <div className='bg-background p-4 pb-20 space-y-4 flex-shrink-0'>
          <Skeleton className='h-6 w-48 mx-auto' />
          <div className='flex justify-center gap-3'>
            <Skeleton className='h-12 w-24' />
            <Skeleton className='h-12 w-24' />
            <Skeleton className='h-12 w-24' />
          </div>
        </div>
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
      {/* Compact header */}
      <div className='flex justify-between items-center p-4 flex-shrink-0'>
        {predictionsLeft !== null && (
          <span className='text-sm text-muted-foreground'>
            {predictionsLeft} left
          </span>
        )}
        <Button
          asChild
          variant='ghost'
          size='sm'
          className='flex items-center gap-2'
        >
          <Link to='/feedback/help'>
            <HelpCircle className='h-4 w-4' />
            <span className='hidden sm:inline'>Help</span>
          </Link>
        </Button>
      </div>

      {/* Image viewer - takes majority of screen */}
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
        />
      </div>

      {/* Fixed bottom action bar - thumb zone optimized */}
      <div className='bg-background border-t p-4 pb-20 md:pb-4 space-y-4 flex-shrink-0'>
        <div className='text-center'>
          <div className='text-xl font-medium flex items-center justify-center gap-2'>
            <span>{emoji}</span>
            <span>Is this a {displayName}?</span>
          </div>
        </div>

        <div className='flex gap-3 justify-center'>
          <Button
            size='lg'
            variant='outline'
            className='bg-red-500 hover:bg-red-600 text-white h-12 flex-1 max-w-[120px]'
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
            className='h-12 flex-1 max-w-[120px]'
          >
            🤔 Unsure
          </Button>
          <Button
            size='lg'
            variant='outline'
            className='bg-green-500 hover:bg-green-600 text-white h-12 flex-1 max-w-[120px]'
            onClick={() => handleFeedback('yes')}
            disabled={isSubmitting}
          >
            ✅ Yes
          </Button>
        </div>
      </div>
    </div>
  );
}
