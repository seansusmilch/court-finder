import {
  createFileRoute,
  redirect,
  useRouter,
  Link,
} from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAction } from 'convex/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Image as ImageIcon, Clock } from 'lucide-react';
import type { Id } from '@backend/_generated/dataModel';

export const Route = createFileRoute('/_authed/admin/review/')({
  loader: async ({ context }) => {
    const [pending, processed] = await Promise.all([
      context.convex.query(api.upload_batches.getPendingBatches, {}),
      context.convex.query(api.upload_batches.getProcessedBatches, {}),
    ]);
    return { pending, processed };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { pending, processed } = Route.useLoaderData();
  const processNewBatch = useAction(api.upload_batches.processNewBatch);
  const router = useRouter();

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const feedbackCount = useMemo(
    () => pending.reduce((acc, item) => acc + item.feedbackCount, 0),
    [pending]
  );

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold'>Training Data</h1>
      <p>{feedbackCount} feedback submissions</p>
      <Tabs defaultValue='pending' className='mt-3'>
        <TabsList className='sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/90 border-b rounded-none px-1 py-1'>
          <TabsTrigger value='pending'>Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value='processed'>
            Processed ({processed.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value='pending'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {pending.map((item) => {
              const { tile, predictionsCount, covered, missing, coveragePct } =
                item;
              const locationLabel = item.tile.reverseGeocode;

              return (
                <Card key={tile._id} className='h-full hover:shadow'>
                  <Link
                    to={'/admin/review/$tileId'}
                    params={{ tileId: String(tile._id) }}
                    className='block focus:outline-none focus:ring-2 focus:ring-ring'
                  >
                    <CardHeader className='flex flex-row items-center justify-between py-3'>
                      <CardTitle className='text-base'>
                        {locationLabel}
                      </CardTitle>
                      <CardDescription>{`x/y/z: ${tile.x}/${tile.y}/${tile.z}`}</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div className='text-sm text-muted-foreground'>
                        <span className='md:hidden'>
                          {`P: ${predictionsCount} - F: ${item.feedbackCount} - Coverage: ${coveragePct}%`}
                        </span>
                        <span className='hidden md:block'>
                          Predictions: {predictionsCount} • Feedback:{' '}
                          {item.feedbackCount} • Coverage: {coveragePct}%
                        </span>
                      </div>
                      <div className='relative mt-1 h-6 w-full overflow-hidden rounded-full bg-red-200'>
                        <div
                          className='h-full bg-green-500'
                          style={{ width: `${coveragePct}%` }}
                        />
                        <div className='absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold'>
                          <span className='text-white'>{covered}</span>
                          <span className='text-red-700'>{missing}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                  <CardFooter>
                    <Button
                      disabled={processingIds.has(String(tile._id))}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const id = String(tile._id);
                        try {
                          setProcessingIds((prev) => new Set(prev).add(id));
                          toast.info('Processing batch...');
                          await processNewBatch({
                            tileId: tile._id as Id<'tiles'>,
                          });
                          toast.success(
                            'Batch processed. Moving to Processed.'
                          );
                          router.invalidate();
                        } catch (err) {
                          toast.error('Failed to process batch');
                        } finally {
                          setProcessingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                          });
                        }
                      }}
                    >
                      {processingIds.has(String(tile._id))
                        ? 'Processing…'
                        : 'Process'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value='processed'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {processed.map((item) => {
              const { tile, batch } = item as any;
              const locationLabel = tile.reverseGeocode;
              const status = (item as any).annotated
                ? 'Annotated'
                : (item as any).imageUploaded
                ? 'Image Uploaded'
                : 'Created';
              return (
                <Card key={batch._id} className='h-full hover:shadow'>
                  <Link
                    to={'/admin/review/$tileId'}
                    params={{ tileId: String(tile._id) }}
                    className='block focus:outline-none focus:ring-2 focus:ring-ring'
                  >
                    <CardHeader className='flex flex-row items-center justify-between py-3'>
                      <div>
                        <CardTitle className='text-base'>
                          {locationLabel}
                        </CardTitle>
                        <CardDescription>{`x/y/z: ${tile.x}/${tile.y}/${tile.z}`}</CardDescription>
                      </div>
                      <div className='flex items-center gap-2'>
                        {status === 'Annotated' && (
                          <Badge className='gap-1'>
                            <CheckCircle2 className='size-3' /> Completed
                          </Badge>
                        )}
                        {status === 'Image Uploaded' && (
                          <Badge variant='secondary' className='gap-1'>
                            <ImageIcon className='size-3' /> Image uploaded
                          </Badge>
                        )}
                        {status === 'Created' && (
                          <Badge variant='outline' className='gap-1'>
                            <Clock className='size-3' /> Started
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div className='text-sm text-muted-foreground'>
                        Predictions: {(item as any).predictionsCount} •
                        Feedback: {(item as any).feedbackCount} • Coverage:{' '}
                        {(item as any).coveragePct}%
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
