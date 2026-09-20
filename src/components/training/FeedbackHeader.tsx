import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { Link } from '@tanstack/react-router';

type FeedbackHeaderProps = {
  predictionsLeft: number | null;
};

/**
 * Header component for the feedback page.
 */
export function FeedbackHeader({ predictionsLeft }: FeedbackHeaderProps) {
  return (
    <header className='mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 md:px-8 md:pb-6 md:pt-8'>
      <div className='max-w-2xl'>
        <h1 className='font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl'>
          Review a possible facility
        </h1>
        <p className='mt-1.5 max-w-xl text-sm leading-5 text-muted-foreground md:mt-2 md:leading-6 md:text-base'>
          Check the highlighted area in the satellite image, then tell us what
          the model found.
        </p>
      </div>

      <div className='flex items-center justify-between gap-2 sm:justify-end'>
        {predictionsLeft !== null && (
          <div
            className='flex min-h-12 items-center gap-2 rounded-lg border border-border/70 bg-card px-3.5 shadow-sm'
            aria-label={`${predictionsLeft} reviews left`}
          >
            <span className='font-mono text-lg font-semibold tabular-nums'>
              {predictionsLeft}
            </span>
            <span className='text-xs text-muted-foreground'>to review</span>
          </div>
        )}
        <Button
          asChild
          variant='outline'
          size='sm'
          className='min-h-12 rounded-lg px-3.5 sm:px-4'
        >
          <Link to='/feedback/help'>
            <HelpCircle aria-hidden='true' className='size-4' />
            <span>How it works</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
