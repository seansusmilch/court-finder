import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Gauge } from 'lucide-react';

export const Route = createFileRoute('/_authed/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated } = useConvexAuth();
  const pending = useQuery(
    api.upload_batches.getPendingBatches,
    isAuthenticated ? { onlyLatestModelVersion: true } : 'skip'
  );
  const processed = useQuery(
    api.upload_batches.getProcessedBatches,
    isAuthenticated ? { onlyLatestModelVersion: true } : 'skip'
  );
  const scans = useQuery(api.scans.listAll, isAuthenticated ? {} : 'skip');
  const metrics = {
    pendingTiles: pending?.length ?? 0,
    processedBatches: processed?.length ?? 0,
    scansCount: scans?.length ?? 0,
    totalFeedback:
      (pending ?? []).reduce(
        (acc: number, item: any) => acc + (item.feedbackCount ?? 0),
        0
      ) +
      (processed ?? []).reduce(
        (acc: number, item: any) => acc + (item.feedbackCount ?? 0),
        0
      ),
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
              <CardAction>
                <ChevronRight className='size-5 text-muted-foreground' />
              </CardAction>
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
              <CardAction>
                <ChevronRight className='size-5 text-muted-foreground' />
              </CardAction>
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
              <CardAction>
                <ChevronRight className='size-5 text-muted-foreground' />
              </CardAction>
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
              <CardAction>
                <ChevronRight className='size-5 text-muted-foreground' />
              </CardAction>
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
                  <Link to={'/admin/review'}>
                    <span className='inline-flex items-center gap-1'>
                      Review Training Data
                      <ChevronRight className='size-4' />
                    </span>
                  </Link>
                </Button>
                <Button asChild variant='secondary' size='sm'>
                  <Link to={'/admin/scans'}>
                    <span className='inline-flex items-center gap-1'>
                      Browse Scans
                      <ChevronRight className='size-4' />
                    </span>
                  </Link>
                </Button>
                <Button asChild variant='outline' size='sm'>
                  <Link to={'/admin/users'}>
                    <span className='inline-flex items-center gap-1'>
                      User scan limits
                      <Gauge className='size-4' />
                    </span>
                  </Link>
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
                  <Link to={'/feedback/help'}>
                    <span className='inline-flex items-center gap-1'>
                      How feedback works
                      <ChevronRight className='size-4 opacity-70' />
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to={'/admin/review'}>
                    <span className='inline-flex items-center gap-1'>
                      Processed batches
                      <ChevronRight className='size-4 opacity-70' />
                    </span>
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
