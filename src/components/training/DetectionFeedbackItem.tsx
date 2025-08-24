import React, { useState } from 'react';
import type { RoboflowPrediction, FeedbackSubmission } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getVisualForClass } from '@/lib/constants';
import { DetectionImageView } from './DetectionImageView';

interface DetectionFeedbackItemProps {
  itemId: string;
  prediction: RoboflowPrediction;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onSubmit: (feedback: FeedbackSubmission) => void;
  onSkip: () => void;
  isLast: boolean;
  existingFeedback?: {
    isCourt: boolean;
    comment?: string;
  };
}

export function DetectionFeedbackItem({
  itemId,
  prediction,
  imageUrl,
  imageWidth,
  imageHeight,
  onSubmit,
  onSkip,
  isLast,
  existingFeedback,
}: DetectionFeedbackItemProps) {
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(
    existingFeedback ? (existingFeedback.isCourt ? 'yes' : 'no') : null
  );
  const [comment, setComment] = useState(existingFeedback?.comment || '');

  const visual = getVisualForClass(prediction.class);

  const handleSubmit = () => {
    if (feedback === null) return;

    onSubmit({
      itemId,
      predictionId: `${prediction.x}-${prediction.y}-${prediction.class}`,
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
      {/* Header with detection info */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span className='flex items-center gap-2'>
              <span className='text-2xl'>{visual.emoji}</span>
              <span>Detection Feedback</span>
            </span>
            <div className='flex gap-2'>
              <Badge variant='outline'>{visual.displayName}</Badge>
              <Badge variant='outline'>
                {Math.round(prediction.confidence * 100)}% confidence
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            Position: ({Math.round(prediction.x)}, {Math.round(prediction.y)}) |
            Size: {Math.round(prediction.width)} ×{' '}
            {Math.round(prediction.height)}
          </p>
        </CardContent>
      </Card>

      {/* Main content area */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Detection image display */}
        <div className='lg:col-span-2'>
          <DetectionImageView
            prediction={prediction}
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            visual={visual}
          />
        </div>

        {/* Feedback sidebar */}
        <div className='space-y-4'>
          {/* Detection details */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-2xl'>{visual.emoji}</span>
                  <div>
                    <p className='font-medium'>{visual.displayName}</p>
                    <p className='text-sm text-muted-foreground'>
                      Confidence: {Math.round(prediction.confidence * 100)}%
                    </p>
                  </div>
                </div>
                <div className='text-xs text-muted-foreground space-y-1'>
                  <p>
                    Position: ({Math.round(prediction.x)},{' '}
                    {Math.round(prediction.y)})
                  </p>
                  <p>
                    Size: {Math.round(prediction.width)} ×{' '}
                    {Math.round(prediction.height)}
                  </p>
                </div>
              </div>
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
