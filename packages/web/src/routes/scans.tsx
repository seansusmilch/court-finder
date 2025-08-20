import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';

type ScanListItem = {
  _id: string;
  centerLat: number;
  centerLong: number;
  query: string;
  createdAt: number;
};

export const Route = createFileRoute('/scans')({
  component: ScansPage,
});

function ScansPage() {
  const scans = useQuery(api.scans.listAll, {});

  return (
    <div className='container mx-auto max-w-4xl px-4 py-4'>
      <h1 className='mb-4 text-2xl font-semibold'>Scans</h1>

      {!scans && <div>Loading…</div>}

      {scans && scans.length === 0 && (
        <div className='text-muted-foreground'>No scans found.</div>
      )}

      {scans && scans.length > 0 && (
        <ul className='space-y-2'>
          {scans.map((s: ScanListItem) => (
            <li key={s._id} className='flex items-center justify-between'>
              <div className='flex min-w-0 flex-col'>
                <div className='truncate'>
                  <span className='text-sm text-muted-foreground'>Center:</span>{' '}
                  <span>
                    {s.centerLat.toFixed(5)}, {s.centerLong.toFixed(5)}
                  </span>
                </div>
                <div className='text-xs text-muted-foreground'>
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              <Link
                to='/scan'
                search={{ scanId: s._id }}
                className='text-primary underline underline-offset-2'
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
