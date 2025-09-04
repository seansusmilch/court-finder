import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/unauthorized')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || '/',
    reason: (search.reason as string) || 'insufficient_permissions',
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const { redirect, reason } = Route.useSearch();

  return (
    <div className='container mx-auto px-4 py-12 max-w-3xl'>
      <div className='rounded-lg border bg-card text-card-foreground shadow-sm'>
        <div className='border-b px-6 py-5'>
          <h1 className='text-2xl font-bold tracking-tight'>Access denied</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            You dont have the required permissions to view this page.
          </p>
        </div>
        <div className='px-6 py-6 space-y-4'>
          <div className='space-y-2'>
            <h2 className='font-semibold'>What happened</h2>
            <p className='text-muted-foreground'>
              This area is restricted to users with administrative access. Your
              account currently does not include the necessary permission
              <code className='mx-1 rounded bg-muted px-1.5 py-0.5 text-xs'>
                admin.access
              </code>
              .
            </p>
          </div>

          <div className='space-y-2'>
            <h2 className='font-semibold'>How to proceed</h2>
            <ul className='list-disc list-inside text-muted-foreground space-y-1'>
              <li>Return to the previous page or the home page.</li>
              <li>
                If you believe this is an error, contact an administrator.
              </li>
            </ul>
          </div>

          <div className='flex items-center gap-3 pt-2'>
            <Link
              to={redirect || '/'}
              className='inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            >
              Go back
            </Link>
            <Link
              to='/'
              className='inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            >
              Home
            </Link>
          </div>

          <div className='pt-4'>
            <p className='text-xs text-muted-foreground'>Reference: {reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
