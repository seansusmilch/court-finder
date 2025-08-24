import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
} from 'lucide-react';

interface FeedbackControlsProps {
  currentIndex: number;
  totalItems: number;
  submittedCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSubmitAll: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
}

export function FeedbackControls({
  currentIndex,
  totalItems,
  submittedCount,
  onPrevious,
  onNext,
  onSkip,
  onSubmitAll,
  canGoPrevious,
  canGoNext,
  isSubmitting,
}: FeedbackControlsProps) {
  const progress = totalItems > 0 ? (submittedCount / totalItems) * 100 : 0;
  const currentItemNumber = currentIndex + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <span>Progress</span>
          <span className='text-sm font-normal text-muted-foreground'>
            {currentItemNumber} of {totalItems}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Progress bar */}
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span>Completed: {submittedCount}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className='h-2' />
        </div>

        {/* Navigation controls */}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className='flex-1'
          >
            <ChevronLeft className='mr-2 h-4 w-4' />
            Previous
          </Button>

          <Button
            variant='outline'
            onClick={onNext}
            disabled={!canGoNext}
            className='flex-1'
          >
            Next
            <ChevronRight className='ml-2 h-4 w-4' />
          </Button>
        </div>

        {/* Action buttons */}
        <div className='flex gap-2'>
          <Button variant='outline' onClick={onSkip} className='flex-1'>
            <SkipForward className='mr-2 h-4 w-4' />
            Skip
          </Button>

          <Button
            onClick={onSubmitAll}
            disabled={submittedCount === 0 || isSubmitting}
            className='flex-1'
          >
            {isSubmitting ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className='mr-2 h-4 w-4' />
                Submit All ({submittedCount})
              </>
            )}
          </Button>
        </div>

        {/* Progress summary */}
        <div className='text-center text-sm text-muted-foreground'>
          {submittedCount > 0 && (
            <p>
              You've provided feedback on {submittedCount} item
              {submittedCount !== 1 ? 's' : ''}
              {submittedCount === totalItems && ' - All done!'}
            </p>
          )}
          {submittedCount === 0 && (
            <p>Start by providing feedback on the current item</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
