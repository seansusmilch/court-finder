import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Check, X } from 'lucide-react';
import { redirect, useNavigate } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router';
import type { Id } from '@/../convex/_generated/dataModel';
import { getVisualForClass } from '@/lib/constants';

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

function ImageViewer({
  imageUrl,
  imageWidth,
  imageHeight,
  prediction,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  prediction: { x: number; y: number; width: number; height: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(300);

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize(containerRef.current.offsetWidth);
    }
  }, [containerRef.current]);

  useEffect(() => {
    // Show more of the image by increasing padding
    const initialPadding = 3.0;
    const newScale = Math.min(
      containerSize / (prediction.width * initialPadding),
      containerSize / (prediction.height * initialPadding)
    );
    setTransform({
      scale: newScale,
      x: containerSize / 2 - prediction.x * newScale,
      y: containerSize / 2 - prediction.y * newScale,
    });
  }, [prediction, imageWidth, imageHeight, containerSize]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const zoomFactor = 1.1;
    const newScale =
      e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ scale: newScale, x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform({
      ...transform,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className='relative mx-auto rounded-lg overflow-hidden border touch-none w-[90vw] h-[90vw] sm:w-[500px] sm:h-[500px]'
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <img
          src={imageUrl}
          alt='Satellite image for feedback'
          style={{
            width: imageWidth,
            height: imageHeight,
            maxWidth: 'none',
          }}
          draggable={false}
        />
        <div
          className='absolute border border-red-500'
          style={{
            left: prediction.x - prediction.width / 2,
            top: prediction.y - prediction.height / 2,
            width: prediction.width,
            height: prediction.height,
            boxSizing: 'border-box',
          }}
        ></div>
      </div>
    </div>
  );
}

export function TrainingFeedbackPage() {
  const navigate = useNavigate();
  const [skippedIds, setSkippedIds] = useState<Id<"inference_predictions">[]>(() => {
    const savedSkips = localStorage.getItem('skippedIds');
    return savedSkips ? JSON.parse(savedSkips) : [];
  });

  useEffect(() => {
    localStorage.setItem('skippedIds', JSON.stringify(skippedIds));
  }, [skippedIds]);

  const stats = useQuery(api.feedback_submissions.getFeedbackStats);
  const feedbackData = useQuery(
    api.feedback_submissions.getNextPredictionForFeedback,
    { skipIds: skippedIds }
  );
  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (response: 'yes' | 'no') => {
    if (!feedbackData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        predictionId: feedbackData.prediction._id,
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

  const handleSkip = () => {
    if (!feedbackData) return;
    setSkippedIds((prev) => [...prev, feedbackData.prediction._id]);
  };

  const predictionsLeft = stats ? stats.totalPredictions - stats.userSubmissionCount - skippedIds.length : null;

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

  const { prediction, inference } = feedbackData;
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
    <div className='container mx-auto px-4 py-8 flex flex-col items-center space-y-6'>
      {predictionsLeft !== null && (
        <p className="text-center text-sm text-muted-foreground">
          {predictionsLeft} predictions left to evaluate
        </p>
      )}
      <h1 className='text-2xl font-bold text-center'>
        {emoji} Is this a {displayName}?
      </h1>

      <ImageViewer
        imageUrl={inference.imageUrl}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        prediction={prediction}
      />

      <div className='flex space-x-4'>
        <Button
          size='lg'
          variant='outline'
          className='bg-red-500 hover:bg-red-600 text-white'
          onClick={() => handleFeedback('no')}
          disabled={isSubmitting}
        >
          <X className='mr-2 h-6 w-6' /> No
        </Button>
        <Button
          size='lg'
          variant='outline'
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip
        </Button>
        <Button
          size='lg'
          variant='outline'
          className='bg-green-500 hover:bg-green-600 text-white'
          onClick={() => handleFeedback('yes')}
          disabled={isSubmitting}
        >
          <Check className='mr-2 h-6 w-6' /> Yes
        </Button>
      </div>
      {isSubmitting && <Loader2 className='h-6 w-6 animate-spin' />}
    </div>
  );
}
