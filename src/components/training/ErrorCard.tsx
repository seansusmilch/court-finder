import { TriangleAlert } from 'lucide-react';

type ErrorCardProps = {
  message: string;
};

/**
 * Card shown when there's an error displaying the prediction.
 */
export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className='grid min-h-full place-items-center px-4 py-12 pb-24 md:px-8 md:py-16 md:pb-16'>
      <section
        className='w-full max-w-xl rounded-2xl border border-destructive/30 bg-card px-6 py-10 text-center shadow-sm sm:px-10'
        role='alert'
        aria-labelledby='feedback-error-heading'
      >
        <div className='mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
          <TriangleAlert aria-hidden='true' className='size-7' />
        </div>
        <h1
          id='feedback-error-heading'
          className='mt-6 font-display text-2xl font-semibold tracking-tight'
        >
          We couldn’t load this review
        </h1>
        <p className='mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground'>
          {message}
        </p>
      </section>
    </div>
  );
}
