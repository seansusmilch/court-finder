import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the feedback page.
 */
export function LoadingSkeleton() {
  return (
    <div
      className='min-h-full bg-muted/20'
      role='status'
      aria-label='Loading next feedback review'
    >
      <div className='mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8'>
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-3'>
            <Skeleton className='h-8 w-64 max-w-[70vw] rounded-lg' />
            <Skeleton className='h-4 w-80 max-w-[82vw] rounded-md' />
          </div>
          <Skeleton className='h-12 w-28 shrink-0 rounded-lg' />
        </div>

        <div className='mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-8'>
          <div className='space-y-3'>
            <Skeleton className='h-5 w-36 rounded-md' />
            <Skeleton className='aspect-[4/3] w-full rounded-2xl' />
            <Skeleton className='h-4 w-72 max-w-full rounded-md' />
          </div>

          <div className='rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6'>
            <div className='flex items-start gap-3'>
              <Skeleton className='size-12 shrink-0 rounded-xl' />
              <div className='flex-1 space-y-2 pt-1'>
                <Skeleton className='h-6 w-48 max-w-full rounded-md' />
                <Skeleton className='h-4 w-full rounded-md' />
                <Skeleton className='h-4 w-4/5 rounded-md' />
              </div>
            </div>
            <div className='mt-6 grid grid-cols-3 gap-2 sm:gap-3'>
              <Skeleton className='h-16 rounded-xl' />
              <Skeleton className='h-16 rounded-xl' />
              <Skeleton className='h-16 rounded-xl' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
