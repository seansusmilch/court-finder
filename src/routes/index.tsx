import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@backend/api';

export const Route = createFileRoute('/')({
  component: HomeComponent,
  beforeLoad: async ({ context }) => {},
});

function HomeComponent() {
  const healthCheck = useQuery(api.healthCheck.get);
  return (
    <div className='container mx-auto max-w-3xl px-4 py-2'>
      <div className='grid gap-6'>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-2 font-medium'>API Status</h2>
          <div className='flex items-center gap-2'>
            <div
              className={`h-2 w-2 rounded-full ${
                healthCheck === 'OK'
                  ? 'bg-green-500'
                  : healthCheck === undefined
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              }`}
            />
            <span className='text-sm text-muted-foreground'>
              {healthCheck === undefined
                ? 'Checking...'
                : healthCheck === 'OK'
                ? 'Connected'
                : 'Error'}
            </span>
          </div>
        </section>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-2 font-medium'>Next steps</h2>
          <ul className='list-disc pl-5 text-sm text-muted-foreground'>
            <li>
              <Link to='/scans' className='text-primary underline'>
                Run a scan
              </Link>
            </li>
            <li>
              <Link to={'/map' as any} className='text-primary underline'>
                View detections on a map
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
