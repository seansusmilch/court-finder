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
    <div
      className='space-y-6 lg:space-y-0'
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Mobile Layout - Single Column */}
      <div className='lg:hidden space-y-2'>
        {/* Prediction Question Header */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className='text-2xl mr-2'>{visual.emoji}</span>
              <span>
                Is this a{' '}
                <span className='text-accent'>
                  {visual.displayName.toLowerCase()}
                </span>
                ?
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex gap-2'>
              <Badge variant='outline'>{visual.displayName}</Badge>
              <Badge variant='outline'>
                {Math.round(prediction.confidence * 100)}% confidence
              </Badge>
            </div>

            {/* Image Viewer */}
            <DetectionImageView
              prediction={prediction}
              imageUrl={imageUrl}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              visual={visual}
            />

            {/* Feedback Question */}
            <div className='space-y-3'>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={feedback === 'no' ? 'default' : 'outline'}
                  onClick={() => setFeedback('no')}
                  className='flex-1'
                >
                  No (N)
                </Button>
                <Button
                  type='button'
                  variant={feedback === 'yes' ? 'default' : 'outline'}
                  onClick={() => setFeedback('yes')}
                  className='flex-1'
                >
                  Yes (Y)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout - Two Columns */}
      <div className='hidden lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start'>
        {/* Left Column - Image Viewer */}
        <div className='space-y-4 col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <span className='text-2xl'>{visual.emoji}</span>
                <span>Detection View</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground mb-4'>
                Position: ({Math.round(prediction.x)},{' '}
                {Math.round(prediction.y)}) | Size:{' '}
                {Math.round(prediction.width)} × {Math.round(prediction.height)}
              </p>
            </CardContent>
          </Card>

          <DetectionImageView
            prediction={prediction}
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            visual={visual}
          />
        </div>

        {/* Right Column - Controls and Feedback */}
        <div className='space-y-6'>
          {/* Detection Info */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <span className='text-2xl'>{visual.emoji}</span>
                <span>Detection Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{visual.displayName}</Badge>
                <Badge variant='outline'>
                  {Math.round(prediction.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className='text-sm text-muted-foreground space-y-1'>
                <p>
                  Position: ({Math.round(prediction.x)},{' '}
                  {Math.round(prediction.y)})
                </p>
                <p>
                  Size: {Math.round(prediction.width)} ×{' '}
                  {Math.round(prediction.height)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle>Provide Feedback</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Feedback Question */}
              <div className='space-y-3'>
                <Label htmlFor='desktop-feedback-question'>
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

              {/* Comment Field */}
              <div className='space-y-2'>
                <Label htmlFor='desktop-comment'>
                  Additional Comments (Optional)
                </Label>
                <Input
                  id='desktop-comment'
                  placeholder='Any additional notes...'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className='flex gap-2'>
                <Button
                  onClick={handleSubmit}
                  disabled={feedback === null}
                  className='flex-1'
                >
                  Submit Feedback
                </Button>
                <Button variant='outline' onClick={onSkip} className='flex-1'>
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
