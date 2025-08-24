import React, { useState, useEffect } from 'react';
import type { TrainingFeedbackItem, FeedbackSubmission } from './types';
import type { RoboflowPrediction } from '../../../convex/lib/roboflow';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getVisualForClass } from '@/lib/constants';

interface FeedbackItemProps {
  item: TrainingFeedbackItem;
  onSubmit: (feedback: FeedbackSubmission) => void;
  onSkip: () => void;
  isLast: boolean;
}

export function FeedbackItem({
  item,
  onSubmit,
  onSkip,
  isLast,
}: FeedbackItemProps) {
  const [selectedPrediction, setSelectedPrediction] =
    useState<RoboflowPrediction | null>(null);
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Reset state when item changes
    setSelectedPrediction(null);
    setFeedback(null);
    setComment('');
  }, [item.id]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setImageLoaded(true);
  };

  const handleSubmit = () => {
    if (feedback === null) return;

    onSubmit({
      itemId: item.id,
      predictionId:
        `${selectedPrediction?.x}-${selectedPrediction?.y}-${selectedPrediction?.class}` ||
        'unknown',
      isCourt: feedback === 'yes',
      comment: comment.trim() || undefined,
      userId: 'current-user', // This will be replaced with actual user ID from auth
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'y' || event.key === 'Y') {
      setFeedback('yes');
    } else if (event.key === 'n' || event.key === 'N') {
      setFeedback('no');
    } else if (event.key === 'Enter' && feedback !== null) {
      handleSubmit();
    }
  };

  return (
    <div className='space-y-6' onKeyDown={handleKeyPress} tabIndex={0}>
      {/* Header with item info */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>Training Feedback</span>
            <div className='flex gap-2'>
              <Badge variant='outline'>Model: {item.model}</Badge>
              <Badge variant='outline'>v{item.version}</Badge>
              <Badge variant='outline'>
                Tile: {item.tileInfo.z}/{item.tileInfo.x}/{item.tileInfo.y}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            {item.predictions.length} detection
            {item.predictions.length !== 1 ? 's' : ''} found
          </p>
        </CardContent>
      </Card>

      {/* Main content area */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Image display */}
        <div className='lg:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Satellite Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative bg-gray-100 rounded-lg overflow-hidden'>
                {!imageLoaded && (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                  </div>
                )}
                <img
                  src={item.imageUrl}
                  alt='Satellite image for training feedback'
                  className='w-full h-auto'
                  onLoad={handleImageLoad}
                  style={{ display: imageLoaded ? 'block' : 'none' }}
                />
                {imageLoaded && (
                  <BoundingBoxOverlay
                    predictions={item.predictions}
                    imageWidth={imageDimensions.width}
                    imageHeight={imageDimensions.height}
                    onBoxClick={setSelectedPrediction}
                    selectedPrediction={selectedPrediction}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback sidebar */}
        <div className='space-y-4'>
          {/* Prediction details */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {selectedPrediction ? (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-2xl'>
                      {getVisualForClass(selectedPrediction.class).emoji}
                    </span>
                    <div>
                      <p className='font-medium'>
                        {
                          getVisualForClass(selectedPrediction.class)
                            .displayName
                        }
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        Confidence:{' '}
                        {Math.round(selectedPrediction.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className='text-xs text-muted-foreground space-y-1'>
                    <p>
                      Position: ({Math.round(selectedPrediction.x)},{' '}
                      {Math.round(selectedPrediction.y)})
                    </p>
                    <p>
                      Size: {Math.round(selectedPrediction.width)} ×{' '}
                      {Math.round(selectedPrediction.height)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Click on a bounding box to see prediction details
                </p>
              )}
            </CardContent>
          </Card>

          {/* Feedback form */}
          <Card>
            <CardHeader>
              <CardTitle>Provide Feedback</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <Label htmlFor='feedback-question'>
                  Is this a court/field?
                </Label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant={feedback === 'yes' ? 'default' : 'outline'}
                    onClick={() => setFeedback('yes')}
                    className='flex-1'
                  >
                    Yes (Y)
                  </Button>
                  <Button
                    type='button'
                    variant={feedback === 'no' ? 'default' : 'outline'}
                    onClick={() => setFeedback('no')}
                    className='flex-1'
                  >
                    No (N)
                  </Button>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='comment'>Additional Comments (Optional)</Label>
                <Input
                  id='comment'
                  placeholder='Any additional notes...'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={handleSubmit}
                  disabled={feedback === null}
                  className='flex-1'
                >
                  Submit Feedback
                </Button>
                <Button variant='outline' onClick={onSkip}>
                  Skip
                </Button>
              </div>

              {!isLast && (
                <p className='text-xs text-muted-foreground text-center'>
                  Press Y for Yes, N for No, or Enter to submit
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
