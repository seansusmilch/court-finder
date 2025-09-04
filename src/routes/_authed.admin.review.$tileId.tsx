import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAction } from 'convex/react';
import type { Id } from '@backend/_generated/dataModel';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ImageIcon, CheckCircle2 } from 'lucide-react';
import ImageViewer from '@/components/training/ImageViewer';
import { useMutation } from '@tanstack/react-query';
import { getVisualForClass } from '@/lib/constants';

export const Route = createFileRoute('/_authed/admin/review/$tileId')({
  loader: async ({ context, params }) => {
    const details = await context.convex.query(
      api.upload_batches.getTileBatchDetails,
      {
        tileId: params.tileId as unknown as Id<'tiles'>,
      }
    );
    return { details };
  },
  component: TileDetailsPage,
});

function TileDetailsPage() {
  const { details } = Route.useLoaderData();
  const router = useRouter();

  const processNewBatch = useAction(api.upload_batches.processNewBatch);
  const addAnnotation = useAction(api.upload_batches.addAnnotationToRoboflow);
  const mutation = useMutation({
    mutationKey: ['processBatch', details.tile._id],
    mutationFn: async () =>
      processNewBatch({ tileId: details.tile._id as Id<'tiles'> }),
    onSuccess: () => {
      toast.success('Batch processed');
      router.invalidate();
    },
    onError: () => toast.error('Failed to process batch'),
  });

  const annotateMutation = useMutation({
    mutationKey: ['annotate', details.batch?._id],
    mutationFn: async () =>
      addAnnotation({
        batchId: details.batch!._id as Id<'upload_batches'>,
        imageId: details.batch!.roboflowImageId as string,
        imageName: details.batch!.roboflowName as string,
      }),
    onSuccess: () => toast.success('Annotation submitted to Roboflow'),
    onError: () => toast.error('Failed to submit annotation'),
  });

  const title = useMemo(
    () =>
      `${details.tile.reverseGeocode ?? ''} (${details.tile.z}/${
        details.tile.x
      }/${details.tile.y})`,
    [details.tile]
  );

  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Tile Details</h1>
          <p className='text-muted-foreground mt-1'>{title}</p>
        </div>
        <div className='flex items-center gap-2'>
          {!details.batch && (
            <Button
              size='sm'
              onClick={async () => {
                try {
                  await processNewBatch({
                    tileId: details.tile._id as Id<'tiles'>,
                  });
                  toast.success('Batch processed');
                } catch (e) {
                  toast.error('Failed to process batch');
                }
              }}
            >
              Process Batch
            </Button>
          )}
          {details.batch &&
            details.batch.roboflowImageId &&
            !details.batch.roboflowAnnotatedAt && (
              <Button size='sm' onClick={() => annotateMutation.mutate()}>
                <ImageIcon className='mr-2 size-4' /> Submit to Roboflow
              </Button>
            )}
          {details.batch && details.batch.roboflowAnnotatedAt && (
            <span className='inline-flex items-center gap-2 text-sm text-green-600'>
              <CheckCircle2 className='size-4' /> Annotated
            </span>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {details.byPrediction.map(({ prediction, feedback }, idx) => {
          const { displayName, emoji } = getVisualForClass(
            (prediction.class as string) ?? 'court'
          );
          const confidencePct = Math.round(
            (prediction.confidence as number) * 100
          );
          return (
            <Card key={String(prediction._id)}>
              <CardHeader>
                <CardTitle className='text-base flex items-center justify-between'>
                  <span className='flex items-center gap-2'>
                    <span>{emoji}</span>
                    <span>
                      {displayName}{' '}
                      <span className='text-muted-foreground'>#{idx + 1}</span>
                    </span>
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {confidencePct}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <ImageViewer
                  className='max-h-[300px]'
                  imageUrl={details.imageUrl}
                  imageWidth={1024}
                  imageHeight={1024}
                  bbox={{
                    x: prediction.x as number,
                    y: prediction.y as number,
                    width: prediction.width as number,
                    height: prediction.height as number,
                  }}
                />

                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='text-muted-foreground'>
                      <tr>
                        <th className='text-left font-medium py-1'>User</th>
                        <th className='text-left font-medium py-1'>Email</th>
                        <th className='text-left font-medium py-1'>Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.length === 0 && (
                        <tr>
                          <td
                            className='py-1 text-muted-foreground'
                            colSpan={3}
                          >
                            No feedback yet
                          </td>
                        </tr>
                      )}
                      {feedback.map((f) => {
                        const fb = f as any;
                        return (
                          <tr key={String(fb._id)}>
                            <td className='py-1'>
                              {String(fb.userId).slice(0, 6)}…
                            </td>
                            <td className='py-1'>{fb.userEmail ?? '—'}</td>
                            <td className='py-1 capitalize'>
                              {fb.userResponse}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
