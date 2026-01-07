import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the feedback page.
 */
export function LoadingSkeleton() {
  return (
    <div className='h-full w-full flex flex-col'>
      <div className='flex justify-between items-center p-4 flex-shrink-0'>
        <Skeleton className='h-5 w-20' />
        <Skeleton className='h-9 w-16' />
      </div>
      <div className='flex flex-col items-center justify-center p-4 flex-1'>
        <Skeleton className='w-full max-w-2xl aspect-square rounded-lg' />
      </div>
      <div className='bg-background p-4 pb-20 space-y-4 flex-shrink-0'>
        <Skeleton className='h-6 w-48 mx-auto' />
        <div className='flex justify-center gap-3'>
          <Skeleton className='h-12 w-24' />
          <Skeleton className='h-12 w-24' />
          <Skeleton className='h-12 w-24' />
        </div>
      </div>
    </div>
  );
}
