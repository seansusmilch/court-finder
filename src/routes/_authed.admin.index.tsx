import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authed/admin/')({
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({ to: '/login', search: { redirect: '/_authed/admin' } });
  },
  loader: async ({ context }) => {
    const [pending, processed, scans] = await Promise.all([
      context.convex.query(api.upload_batches.getPendingBatches, {
        onlyLatestModelVersion: true,
      }),
      context.convex.query(api.upload_batches.getProcessedBatches, {
        onlyLatestModelVersion: true,
      }),
      context.convex.query(api.scans.listAll, {}),
    ]);

    const totalFeedback =
      pending.reduce(
        (acc: number, item: any) => acc + (item.feedbackCount ?? 0),
        0
      ) +
      processed.reduce(
        (acc: number, item: any) => acc + (item.feedbackCount ?? 0),
        0
      );

    return {
      metrics: {
        pendingTiles: pending.length,
        processedBatches: processed.length,
        scansCount: scans.length,
        totalFeedback,
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { metrics } = Route.useLoaderData() as {
    metrics: {
      pendingTiles: number;
      processedBatches: number;
      scansCount: number;
      totalFeedback: number;
    };
  };

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold'>Admin Dashboard</h1>
      <p className='text-muted-foreground'>
        Overview of model training and scans
      </p>

      <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='hover:shadow'>
          <Link
            to={'/admin/review'}
            className='block focus:outline-none focus:ring-2 focus:ring-ring'
          >
            <CardHeader>
              <CardTitle>Training Data Review</CardTitle>
              <CardDescription>
                Pending tiles needing processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline gap-2'>
                <span className='text-3xl font-semibold'>
                  {metrics.pendingTiles}
                </span>
                <Badge variant='secondary'>pending</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className='hover:shadow'>
          <Link
            to={'/admin/review'}
            className='block focus:outline-none focus:ring-2 focus:ring-ring'
          >
            <CardHeader>
              <CardTitle>Processed Batches</CardTitle>
              <CardDescription>Batches already created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-semibold'>
                {metrics.processedBatches}
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className='hover:shadow'>
          <Link
            to={'/admin/scans'}
            className='block focus:outline-none focus:ring-2 focus:ring-ring'
          >
            <CardHeader>
              <CardTitle>Scans</CardTitle>
              <CardDescription>Total recorded scans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-semibold'>{metrics.scansCount}</div>
            </CardContent>
          </Link>
        </Card>

        <Card className='hover:shadow'>
          <Link
            to={'/admin/review'}
            className='block focus:outline-none focus:ring-2 focus:ring-ring'
          >
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>All user training responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-semibold'>
                {metrics.totalFeedback}
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className='mt-6'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <Card className='hover:shadow'>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap gap-2'>
                <Button asChild size='sm'>
                  <Link to={'/admin/review'}>Review Training Data</Link>
                </Button>
                <Button asChild variant='secondary' size='sm'>
                  <Link to={'/admin/scans'}>Browse Scans</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className='hover:shadow'>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Documentation and help</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className='list-inside list-disc text-sm text-muted-foreground'>
                <li>
                  <Link to={'/feedback/help'}>How feedback works</Link>
                </li>
                <li>
                  <Link to={'/admin/review'}>Processed batches</Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
