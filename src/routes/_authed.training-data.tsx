import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { api } from '@backend/_generated/api';
import type { Id } from '@backend/_generated/dataModel';
import { reverseGeocode } from '@/lib/geocoding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type UploadBatchTile = {
  tile: { _id: Id<'tiles'>; x: number; y: number; z: number };
  predictions: Array<{
    prediction: unknown;
    feedback: unknown[];
    feedbackCount: number;
  }>;
  predictionsCount: number;
  feedbackCount: number;
};

function tileCenterLatLng(z: number, x: number, y: number) {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y / n))));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ((y + 1) / n))));
  const north = (northRad * 180) / Math.PI;
  const south = (southRad * 180) / Math.PI;
  return { lat: (north + south) / 2, lng: (west + east) / 2 };
}

export const Route = createFileRoute('/_authed/training-data')({
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({
        to: '/login',
        search: { redirect: '/_authed/training-data' },
      });
  },
  loader: async ({ context }) => {
    const data = (await context.convex.query(
      api.upload_batches.getPendingBatches,
      {}
    )) as UploadBatchTile[];
    return { data };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = Route.useLoaderData();

  const withCoverage: Array<
    UploadBatchTile & { covered: number; missing: number; coveragePct: number }
  > = data
    .map((item: UploadBatchTile) => {
      const covered = item.predictions.filter(
        (p) => p.feedbackCount > 0
      ).length;
      const coveragePct =
        item.predictionsCount > 0
          ? Math.round((covered / item.predictionsCount) * 100)
          : 0;
      const missing = item.predictionsCount - covered;
      return { ...item, covered, missing, coveragePct };
    })
    .sort((a, b) => a.coveragePct - b.coveragePct)
    .reverse();

  const geocodeQueries = useQueries({
    queries: withCoverage.map((item) => {
      const { lat, lng } = tileCenterLatLng(
        item.tile.z,
        item.tile.x,
        item.tile.y
      );
      return {
        queryKey: ['geocode', item.tile._id],
        queryFn: () => reverseGeocode(lat, lng),
        staleTime: 1000 * 60 * 60, // 1h
      };
    }),
  });

  return (
    <div className='p-4'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {withCoverage.map((item, idx) => {
          const { tile, predictionsCount, covered, missing, coveragePct } =
            item;
          const locationLabel = geocodeQueries[idx]?.data ?? 'Locating…';

          return (
            <Card key={tile._id} className='h-full'>
              <CardHeader className='flex flex-row items-center justify-between py-3'>
                <CardTitle className='text-base'>{locationLabel}</CardTitle>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
