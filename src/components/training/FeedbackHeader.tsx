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
    <div className='flex justify-between items-center p-4 flex-shrink-0'>
      {predictionsLeft !== null && (
        <span className='text-sm text-muted-foreground'>
          {predictionsLeft} left
        </span>
      )}
      <Button
        asChild
        variant='ghost'
        size='sm'
        className='flex items-center gap-2'
      >
        <Link to='/feedback/help'>
          <HelpCircle className='h-4 w-4' />
          <span className='hidden sm:inline'>Help</span>
        </Link>
      </Button>
    </div>
  );
}
