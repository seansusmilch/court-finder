import { Button } from '@/components/ui/button';

type FeedbackResponse = 'yes' | 'no' | 'unsure';

type FeedbackActionsProps = {
  displayName: string;
  emoji: string;
  onSubmit: (response: FeedbackResponse) => void;
  disabled: boolean;
};

/**
 * Action buttons for submitting feedback.
 */
export function FeedbackActions({
  displayName,
  emoji,
  onSubmit,
  disabled,
}: FeedbackActionsProps) {
  return (
    <section
      className='rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-6'
      aria-labelledby='feedback-question'
    >
      <div className='flex items-start gap-3'>
        <span
          className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl shadow-inner'
          role='img'
          aria-label={`${displayName} sport marker`}
        >
          {emoji}
        </span>
        <div className='min-w-0 pt-0.5'>
          <h2
            id='feedback-question'
            className='text-lg font-semibold leading-snug tracking-tight sm:text-xl'
          >
            Is this a {displayName}?
          </h2>
          <p className='mt-1.5 text-sm leading-5 text-muted-foreground'>
            Use the outline as a guide. It is okay to choose unsure when the
            image is ambiguous.
          </p>
        </div>
      </div>

      <div
        className='mt-6 grid grid-cols-3 gap-2 sm:gap-3'
        role='group'
        aria-label='Feedback response'
      >
        <Button
          size='lg'
          variant='outline'
          type='button'
          className='h-16 min-w-0 flex-col rounded-xl border-destructive/40 bg-destructive/10 px-2 text-destructive shadow-none hover:bg-destructive/20 hover:text-destructive hover:shadow-sm focus-visible:ring-destructive/40 disabled:cursor-wait'
          onClick={() => onSubmit('no')}
          disabled={disabled}
        >
          <span className='text-lg leading-none' aria-hidden='true'>
            ❌
          </span>
          <span className='text-xs font-semibold sm:text-sm'>No</span>
        </Button>
        <Button
          size='lg'
          variant='outline'
          type='button'
          onClick={() => onSubmit('unsure')}
          disabled={disabled}
          className='h-16 min-w-0 flex-col rounded-xl border-warning/40 bg-warning/10 px-2 text-foreground shadow-none hover:bg-warning/20 hover:text-foreground hover:shadow-sm focus-visible:ring-warning/40 disabled:cursor-wait'
        >
          <span className='text-lg leading-none' aria-hidden='true'>
            🤔
          </span>
          <span className='text-xs font-semibold sm:text-sm'>Unsure</span>
        </Button>
        <Button
          size='lg'
          variant='outline'
          type='button'
          className='h-16 min-w-0 flex-col rounded-xl border-success/40 bg-success/10 px-2 text-success shadow-none hover:bg-success/20 hover:text-success hover:shadow-sm focus-visible:ring-success/40 disabled:cursor-wait'
          onClick={() => onSubmit('yes')}
          disabled={disabled}
        >
          <span className='text-lg leading-none' aria-hidden='true'>
            ✅
          </span>
          <span className='text-xs font-semibold sm:text-sm'>Yes</span>
        </Button>
      </div>

      <p className='mt-4 text-center text-xs leading-5 text-muted-foreground'>
        Your answer helps separate useful leads from false positives.
      </p>
    </section>
  );
}
