import { useQuery } from 'convex/react';
import { useClerk, useUser, UserAvatar } from '@clerk/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '@/../convex/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gauge, Settings, Shield } from 'lucide-react';

export const Route = createFileRoute('/_authed/account')({
  component: AccountPage,
});

function AccountPage() {
  const { openUserProfile } = useClerk();
  const { isLoaded: isClerkLoaded, user: clerkUser } = useUser();
  const user = useQuery(api.users.me);
  const stats = useQuery(api.feedback_submissions.getFeedbackStats);
  const scanLimitStatus = useQuery(api.scans.getScanInitiationLimitStatus);

  if (user === undefined || !isClerkLoaded) {
    return (
      <div className='container mx-auto max-w-2xl px-4 py-8'>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-48' />
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className='container mx-auto max-w-2xl px-4 py-8'>
        <Card>
          <CardContent className='pt-6 space-y-4'>
            <p className='text-muted-foreground'>Not authenticated</p>
            <Button asChild>
              <Link to='/login'>Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scanLimitPercent = scanLimitStatus
    ? Math.min(
        100,
        Math.max(0, (scanLimitStatus.count / scanLimitStatus.limit) * 100)
      )
    : 0;
  const resetTime =
    scanLimitStatus?.resetAtMs !== null && scanLimitStatus?.resetAtMs
      ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(scanLimitStatus.resetAtMs))
      : null;

  return (
    <div className='container mx-auto max-w-2xl space-y-6 px-4 py-8 md:pb-8'>
      <div>
        <h1 className='text-3xl font-bold'>Account</h1>
        <p className='mt-1 text-muted-foreground'>Your Court Finder activity and access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity &amp; security</CardTitle>
          <CardDescription>
            Clerk securely manages your photo, name, email addresses, password, and sign-in security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex min-w-0 items-center gap-4'>
              <UserAvatar
                rounded
                appearance={{ elements: { avatarBox: 'h-14 w-14 shrink-0' } }}
              />
              <dl className='min-w-0 space-y-1'>
                <div>
                  <dt className='sr-only'>Name</dt>
                  <dd className='truncate font-medium'>
                    {clerkUser?.fullName || 'Add your name in Clerk'}
                  </dd>
                </div>
                <div>
                  <dt className='sr-only'>Email</dt>
                  <dd className='truncate text-sm text-muted-foreground'>
                    {clerkUser?.primaryEmailAddress?.emailAddress || 'No email address added'}
                  </dd>
                </div>
              </dl>
            </div>
            <Button
              type='button'
              variant='outline'
              className='shrink-0'
              onClick={() => openUserProfile()}
            >
              <Settings className='mr-2 h-4 w-4' />
              Manage in Clerk
            </Button>
          </div>
          <p className='mt-5 border-t pt-4 text-xs text-muted-foreground'>
            Changes sync to Court Finder automatically after you save them in Clerk.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>Your Court Finder permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2'>
            <div>
              <p className='text-sm font-medium'>Role</p>
              <p className='text-sm text-muted-foreground'>
                {user.role === 'admin' ? 'Administrator' : 'Member'}
              </p>
            </div>
            {user.role === 'admin' ? (
              <Shield className='h-5 w-5 text-orange-600 dark:text-orange-400' aria-hidden='true' />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <CardTitle>Limits</CardTitle>
              <CardDescription>Current scan usage for this account</CardDescription>
            </div>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40'>
              <Gauge className='h-5 w-5 text-muted-foreground' />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {scanLimitStatus === undefined ? (
            <div className='space-y-3'>
              <Skeleton className='h-5 w-40' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : scanLimitStatus === null ? (
            <p className='text-sm text-muted-foreground'>
              Sign in to view account limits.
            </p>
          ) : (
            <>
              <div className='flex items-end justify-between gap-4'>
                <div>
                  <p className='text-sm font-medium'>Area scans</p>
                  <p className='text-sm text-muted-foreground'>
                    {scanLimitStatus.remaining} of {scanLimitStatus.limit} scans remaining
                  </p>
                </div>
                <Badge
                  variant={scanLimitStatus.remaining === 0 ? 'destructive' : 'secondary'}
                  className='shrink-0'
                >
                  {scanLimitStatus.count}/{scanLimitStatus.limit} used
                </Badge>
              </div>
              <Progress value={scanLimitPercent} className='h-3' />
              <div className='rounded-md border bg-muted/30 px-3 py-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='text-muted-foreground'>Window</span>
                  <span className='font-medium'>
                    {Math.round(scanLimitStatus.windowMs / (60 * 60 * 1000))} hour
                  </span>
                </div>
                <div className='mt-1 flex items-center justify-between gap-3 text-sm'>
                  <span className='text-muted-foreground'>Resets</span>
                  <span className='font-medium'>{resetTime ?? 'Ready now'}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Your feedback contribution summary</CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='rounded-lg border p-4'>
                <p className='text-sm text-muted-foreground'>Feedback submissions</p>
                <p className='mt-1 text-2xl font-semibold'>{stats.userSubmissionCount}</p>
              </div>
              <div className='rounded-lg border p-4'>
                <p className='text-sm text-muted-foreground'>Total predictions</p>
                <p className='mt-1 text-2xl font-semibold'>{stats.totalPredictions}</p>
              </div>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>Loading stats...</p>
          )}
        </CardContent>
      </Card>

      {user.permissions.includes('admin.access') ? (
        <Card className='border-orange-500/30 bg-orange-500/5 dark:border-orange-500/20 dark:bg-orange-500/10'>
          <CardHeader>
            <CardTitle className='text-orange-700 dark:text-orange-400'>
              Administration
            </CardTitle>
            <CardDescription>Admin tools and dashboards</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant='outline' className='w-full justify-start'>
              <Link to='/admin'>
                <Shield className='mr-2 h-4 w-4' />
                Admin Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
