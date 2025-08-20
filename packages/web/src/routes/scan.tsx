import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/scan')({
  component: ScanComponent,
});

type ScanResult = {
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
  const [latitude, setLatitude] = useState<string>('41.9442');
  const [longitude, setLongitude] = useState<string>('-87.6952');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<ScanResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSelectedIndex(null);
    setIsSubmitting(true);
    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('Please enter valid numeric coordinates');
      }
      const result = await scanArea({ latitude: lat, longitude: lon });
      setData(result as ScanResult);
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

      {data && (
        <div className='grid gap-4'>
          <Card className='p-3 text-sm'>
            <div className='flex flex-wrap gap-4'>
              <div>
                <div className='text-muted-foreground'>Bounding Box</div>
                <div>
                  [{data.bbox.minLat.toFixed(4)}, {data.bbox.minLong.toFixed(4)}
                  ] → [{data.bbox.maxLat.toFixed(4)},{' '}
                  {data.bbox.maxLong.toFixed(4)}]
                </div>
              </div>
              <div>
                <div className='text-muted-foreground'>Sub-boxes</div>
                <div>{data.subBoxes.length}</div>
              </div>
              <div>
                <div className='text-muted-foreground'>Images</div>
                <div>{data.results.length}</div>
              </div>
            </div>
          </Card>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
            {data.results.map((r, idx) => (
              <Card
                key={r.url}
                className={`overflow-hidden ${
                  selectedIndex === idx ? 'ring-2 ring-primary' : ''
                }`}
              >
                <button
                  type='button'
                  className='block w-full'
                  onClick={() =>
                    setSelectedIndex(idx === selectedIndex ? null : idx)
                  }
                  title='Click to view detections'
                >
                  <img
                    src={r.url}
                    alt={`Sub-image ${idx + 1}`}
                    className='block h-auto w-full'
                  />
                </button>
                {selectedIndex === idx && (
                  <div className='max-h-64 overflow-auto border-t p-2'>
                    <pre className='whitespace-pre-wrap break-words text-xs'>
                      {JSON.stringify(r.detections, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
