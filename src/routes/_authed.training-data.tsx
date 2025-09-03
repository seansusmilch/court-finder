import { createFileRoute, redirect } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/_authed/training-data')({
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({
        to: '/login',
        search: { redirect: '/_authed/training-data' },
      });
  },
  loader: async ({ context }) => {
    const data = await context.convex.query(
      api.upload_batches.getPendingBatches,
      {}
    );
    return { data };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = Route.useLoaderData();

  return (
    <div className='p-4'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {data.map((item, idx) => {
          const { tile, predictionsCount, covered, missing, coveragePct } =
            item;
          const locationLabel = item.tile.reverseGeocode;

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
