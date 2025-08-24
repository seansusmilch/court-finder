import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
  redirect,
} from '@tanstack/react-router';
import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import type { Id } from '@court-finder/backend/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type ScanListItem = {
  _id: string;
  centerLat: number;
  centerLong: number;
  createdAt: number;
  tileCount: number;
};

type ScanResult = {
  scanId: string;
  zoom: number | null;
  cols: number;
  rows: number;
  tiles: Array<{
    z: number;
    x: number;
    y: number;
    url: string;
    detections: unknown;
  }>;
};

export const Route = createFileRoute('/scans')({
  component: ScansPage,
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({ to: '/login', search: { redirect: location.href } });
  },
});

function ScansPage() {
  const scanArea = useAction(api.actions.scanArea);
  const navigate = useNavigate();
  const search = useSearch({ from: '/scans' }) as { scanId?: string };
  const scanId = (search.scanId as Id<'scans'> | undefined) ?? undefined;
  const loaded = useQuery(
    api.scanResults.getByScanId,
    scanId ? { scanId } : 'skip'
  ) as ScanResult | undefined;
  const scans = useQuery(api.scans.listAll, {});

  const [latitude, setLatitude] = useState<string>('41.9442');
  const [longitude, setLongitude] = useState<string>('-87.6952');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<ScanResult | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setModalIndex(null);
    setIsSubmitting(true);
    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('Please enter valid numeric coordinates');
      }
      const result = await scanArea({ latitude: lat, longitude: lon });
      setData(result as ScanResult);
      if ((result as any).scanId) {
        void navigate({
          to: '/scans',
          search: { scanId: (result as any).scanId },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className='container mx-auto max-w-5xl px-4 py-4'>
      <h1 className='mb-4 text-2xl font-semibold'>Satellite Imagery Scanner</h1>

      {/* Scan Form */}
      <Card className='mb-6 p-4'>
        <h2 className='mb-4 text-lg font-medium'>New Scan</h2>
        <form
          onSubmit={handleSubmit}
          className='grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]'
        >
          <div>
            <label className='mb-1 block text-sm text-muted-foreground'>
              Latitude
            </label>
            <Input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder='e.g. 41.9442'
              type='text'
              inputMode='decimal'
            />
          </div>
          <div>
            <label className='mb-1 block text-sm text-muted-foreground'>
              Longitude
            </label>
            <Input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder='e.g. -87.6952'
              type='text'
              inputMode='decimal'
            />
          </div>
          <div className='flex items-end'>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Scanning…' : 'Scan'}
            </Button>
          </div>
        </form>

        {error && (
          <div className='mt-3 rounded-md border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300'>
            {error}
          </div>
        )}
      </Card>

      {/* Scan Results */}
      {(loaded || data) &&
        (() => {
          const payload = (loaded ?? data)!;
          const items = payload.tiles;
          // Slippy tiles: y increases southwards, x increases eastwards
          const numCols = payload.cols || 1;
          const sorted = items.slice().sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y; // north→south
            return a.x - b.x; // west→east
          });

          return (
            <div className='mb-8 grid gap-4'>
              <Card className='p-3 text-sm'>
                <div className='flex flex-wrap gap-4'>
                  <div>
                    <div className='text-muted-foreground'>Zoom</div>
                    <div>{payload.zoom ?? '—'}</div>
                  </div>
                  <div>
                    <div className='text-muted-foreground'>Grid</div>
                    <div>
                      {payload.rows} × {payload.cols}
                    </div>
                  </div>
                  <div>
                    <div className='text-muted-foreground'>Images</div>
                    <div>{items.length}</div>
                  </div>
                </div>
              </Card>

              <div
                className='grid gap-0'
                style={{
                  gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                }}
              >
                {sorted.map((item, idx) => (
                  <div
                    key={`${item.z}/${item.x}/${item.y}`}
                    className='group relative overflow-hidden'
                  >
                    <button
                      type='button'
                      className='block w-full'
                      onClick={() => setModalIndex(idx)}
                      title='Click to view detections'
                    >
                      <img
                        src={item.url}
                        alt={`Sub-image ${idx + 1}`}
                        className='block h-auto w-full select-none border-2 border-red-500'
                      />
                      <span className='pointer-events-none absolute inset-0 ring-0 transition-all group-hover:ring-2 group-hover:ring-primary' />
                    </button>
                  </div>
                ))}
              </div>

              {modalIndex !== null && sorted[modalIndex] && (
                <div
                  className='fixed inset-0 z-50 grid place-items-center bg-black/60 p-4'
                  onClick={() => setModalIndex(null)}
                >
                  <div
                    className='max-h-[85vh] w-full max-w-3xl overflow-auto rounded-md border bg-background p-4 shadow-lg'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className='mb-3 flex items-center justify-between'>
                      <h2 className='text-lg font-semibold'>
                        Detection Response
                      </h2>
                      <Button
                        variant='secondary'
                        onClick={() => setModalIndex(null)}
                      >
                        Close
                      </Button>
                    </div>
                    <div className='mb-3'>
                      <img
                        src={sorted[modalIndex].url}
                        alt='Selected image'
                        className='max-h-64 w-full object-contain'
                      />
                    </div>
                    <div className='mb-3 text-sm'>
                      <div className='text-muted-foreground'>Tile</div>
                      <div>
                        z/x/y: {sorted[modalIndex].z}/{sorted[modalIndex].x}/
                        {sorted[modalIndex].y}
                      </div>
                    </div>
                    <pre className='whitespace-pre-wrap break-words text-xs'>
                      {JSON.stringify(sorted[modalIndex].detections, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* Previous Scans List */}
      <Card className='p-4'>
        <h2 className='mb-4 text-lg font-medium'>Previous Scans</h2>

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
                    <span className='text-sm text-muted-foreground'>
                      Center:
                    </span>{' '}
                    <span>
                      {s.centerLat.toFixed(5)}, {s.centerLong.toFixed(5)}
                    </span>
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <Link
                  to='/scans'
                  search={{ scanId: s._id }}
                  className='text-primary underline underline-offset-2'
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
