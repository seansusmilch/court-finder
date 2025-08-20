import {
  createFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import type { Id } from '@court-finder/backend/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/scan')({
  component: ScanComponent,
});

type ScanResult = {
  scanId: string;
  bbox: {
    minLong: number;
    minLat: number;
    maxLong: number;
    maxLat: number;
  };
  subBoxes: Array<{
    minLong: number;
    minLat: number;
    maxLong: number;
    maxLat: number;
  }>;
  results: Array<{
    url: string;
    detections: unknown;
  }>;
};

function ScanComponent() {
  const scanArea = useAction(api.actions.scanArea);
  const navigate = useNavigate();
  const search = useSearch({ from: '/scan' }) as { scanId?: string };
  const scanId = (search.scanId as Id<'scans'> | undefined) ?? undefined;
  const loaded = useQuery(
    api.scanResults.getByScanId,
    scanId ? { scanId } : 'skip'
  ) as ScanResult | undefined;
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
          to: '/scan',
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
      <h1 className='mb-4 text-2xl font-semibold'>Scan Satellite Imagery</h1>

      <form
        onSubmit={handleSubmit}
        className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]'
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
        <div className='mb-4 rounded-md border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300'>
          {error}
        </div>
      )}

      {(loaded || data) &&
        (() => {
          const payload = (loaded ?? data)!;
          const items = payload.results.map((r, i) => ({
            url: r.url,
            detections: r.detections,
            bbox: payload.subBoxes[i],
          }));
          // Determine grid order: rows north→south (higher lat to lower), cols west→east (lower long to higher)
          const uniqueLongs = Array.from(
            new Set(items.map((i) => i.bbox.minLong))
          ).sort((a, b) => a - b);
          const uniqueLats = Array.from(
            new Set(items.map((i) => i.bbox.minLat))
          ).sort((a, b) => b - a);
          const numCols = uniqueLongs.length || 1;
          const sorted = items.slice().sort((a, b) => {
            if (a.bbox.minLat !== b.bbox.minLat)
              return b.bbox.minLat - a.bbox.minLat;
            return a.bbox.minLong - b.bbox.minLong;
          });

          return (
            <div className='grid gap-4'>
              <Card className='p-3 text-sm'>
                <div className='flex flex-wrap gap-4'>
                  <div>
                    <div className='text-muted-foreground'>Bounding Box</div>
                    <div>
                      [{payload.bbox.minLat.toFixed(4)},{' '}
                      {payload.bbox.minLong.toFixed(4)}] → [
                      {payload.bbox.maxLat.toFixed(4)},{' '}
                      {payload.bbox.maxLong.toFixed(4)}]
                    </div>
                  </div>
                  <div>
                    <div className='text-muted-foreground'>Grid</div>
                    <div>
                      {uniqueLats.length} × {uniqueLongs.length}
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
                    key={item.url}
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
                    <pre className='whitespace-pre-wrap break-words text-xs'>
                      {JSON.stringify(sorted[modalIndex].detections, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
