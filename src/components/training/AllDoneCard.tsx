import { Button } from '@/components/ui/button';
import { CheckCircle2, Map } from 'lucide-react';

type AllDoneCardProps = {
  onNavigateToMap: () => void;
};

/**
 * Card shown when user has completed all feedback.
 */
export function AllDoneCard({ onNavigateToMap }: AllDoneCardProps) {
  return (
    <div className='grid min-h-full place-items-center px-4 py-12 pb-24 md:px-8 md:py-16 md:pb-16'>
      <section
        className='w-full max-w-lg rounded-2xl border border-border/70 bg-card px-6 py-10 text-center shadow-sm sm:px-10'
        aria-labelledby='feedback-complete-heading'
      >
        <div className='mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/15 text-success'>
          <CheckCircle2 aria-hidden='true' className='size-8' />
        </div>
        <h1
          id='feedback-complete-heading'
          className='mt-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl'
        >
          You’re all caught up
        </h1>
        <p className='mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base'>
          You’ve reviewed every available image for now. Thanks for helping
          keep the map useful.
        </p>
        <Button
          type='button'
          onClick={onNavigateToMap}
          className='mt-8 min-h-12 w-full rounded-lg sm:w-auto sm:px-8'
        >
          <Map aria-hidden='true' className='size-4' />
          Return to map
        </Button>
      </section>
    </div>
  );
}
