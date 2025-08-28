import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Check, X, HelpCircle } from 'lucide-react';
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
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [pinchState, setPinchState] = useState<{
    lastDistance: number;
  } | null>(null);

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

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const zoomFactor = 1.1;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        const newScale =
          e.deltaY < 0 ? prev.scale * zoomFactor : prev.scale / zoomFactor;
        const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
        const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
        return { scale: newScale, x: newX, y: newY };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef.current]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current!.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x, y });

    if (pointersRef.current.size === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const distance = Math.hypot(dx, dy);
      setPinchState({ lastDistance: distance });
      setIsDragging(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x, y });
    }

    if (pointersRef.current.size === 2 && pinchState) {
      const pts = Array.from(pointersRef.current.values());
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const distance = Math.hypot(dx, dy);
      const scaleFactor = distance / pinchState.lastDistance;

      setTransform((prev) => {
        const newScale = prev.scale * scaleFactor;
        const newX = midX - (midX - prev.x) * (newScale / prev.scale);
        const newY = midY - (midY - prev.y) * (newScale / prev.scale);
        return { scale: newScale, x: newX, y: newY };
      });

      setPinchState({ lastDistance: distance });
      return;
    }

    if (isDragging && pointersRef.current.size === 1) {
      e.preventDefault();
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.delete(e.pointerId);
    }
    if (pointersRef.current.size < 2) {
      setPinchState(null);
    }
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className='relative mx-auto rounded-lg overflow-hidden border touch-none w-full h-full max-w-[90vw] max-h-[60vh] sm:max-w-[500px] sm:max-h-[500px]'
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
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
  const [skippedIds, setSkippedIds] = useState<Id<'inference_predictions'>[]>(
    () => {
      const savedSkips = localStorage.getItem('skippedIds');
      return savedSkips ? JSON.parse(savedSkips) : [];
    }
  );

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

  const handleFeedback = async (response: 'yes' | 'no' | 'unsure') => {
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

  const handleUnsure = async () => {
    if (!feedbackData) return;
    await handleFeedback('unsure');
    setSkippedIds((prev) => [...prev, feedbackData.prediction._id]);
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
    <div className='h-screen w-full flex flex-col'>
      {/* Top section with help button and progress */}
      <div className='flex justify-between items-center p-4 border-b'>
        <div className='flex items-center space-x-2'>
          {predictionsLeft !== null && (
            <span className='text-sm text-muted-foreground'>
              {predictionsLeft} left
            </span>
          )}
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate({ to: '/training-help' })}
          className='flex items-center space-x-2'
        >
          <HelpCircle className='h-4 w-4' />
          <span className='hidden sm:inline'>Help</span>
        </Button>
      </div>

      {/* Main content area - takes remaining space */}
      <div className='flex-1 flex flex-col items-center justify-center p-4 min-h-0'>
        <div className='w-full h-full flex items-center justify-center'>
          <ImageViewer
            imageUrl={inference.imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            prediction={prediction}
          />
        </div>
      </div>

      {/* Bottom section with question and buttons */}
      <div className='border-t bg-background p-4 space-y-4'>
        <div className='text-center'>
          <div className='text-lg font-medium flex items-center justify-center'>
            <span className='mr-2'>{emoji}</span> Is this a {displayName}?
          </div>
        </div>
        
        <div className='flex justify-center space-x-4'>
          <Button
            size='lg'
            variant='outline'
            className='bg-red-500 hover:bg-red-600 text-white flex-1 max-w-[120px]'
            onClick={() => handleFeedback('no')}
            disabled={isSubmitting}
          >
            <X className='mr-2 h-6 w-6' /> No
          </Button>
          <Button
            size='lg'
            variant='outline'
            onClick={handleUnsure}
            disabled={isSubmitting}
            className='flex-1 max-w-[120px]'
          >
            Unsure
          </Button>
          <Button
            size='lg'
            variant='outline'
            className='bg-green-500 hover:bg-green-600 text-white flex-1 max-w-[120px]'
            onClick={() => handleFeedback('yes')}
            disabled={isSubmitting}
          >
            <Check className='mr-2 h-6 w-6' /> Yes
          </Button>
        </div>
        
        {isSubmitting && (
          <div className='flex justify-center'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        )}
      </div>
    </div>
  );
}
