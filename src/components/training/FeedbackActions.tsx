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
          className='bg-destructive hover:bg-destructive/90 text-destructive-foreground h-12 flex-1 max-w-[120px] border-destructive'
          onClick={() => onSubmit('no')}
          disabled={disabled}
        >
          ❌ No
        </Button>
        <Button
          size='lg'
          variant='outline'
          onClick={() => onSubmit('unsure')}
          disabled={disabled}
          className='h-12 flex-1 max-w-[120px]'
        >
          🤔 Unsure
        </Button>
        <Button
          size='lg'
          variant='outline'
          className='bg-success hover:bg-success/90 text-success-foreground h-12 flex-1 max-w-[120px] border-success'
          onClick={() => onSubmit('yes')}
          disabled={disabled}
        >
          ✅ Yes
        </Button>
      </div>
    </div>
  );
}
