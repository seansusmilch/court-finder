import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Grid3X3, Eye, ArrowLeft } from 'lucide-react';

type ScanDetailsProps = {
  scanResult: {
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
};

export function ScanDetails({ scanResult }: ScanDetailsProps) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  return (
    <div className='container mx-auto max-w-7xl px-4 py-4'>
      <div className='mb-6 flex items-center gap-4'>
        <Link
          to='/admin/scans'
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Scans
        </Link>
      </div>

      <div className='mb-6'>
        <h1 className='text-3xl font-bold mb-2'>Scan Details</h1>
        <div className='flex flex-wrap gap-4 text-sm text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4' />
            <span>
              {scanResult.tiles[0]?.z
                ? `Zoom Level ${scanResult.tiles[0].z}`
                : 'Unknown Zoom'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Grid3X3 className='h-4 w-4' />
            <span>
              {scanResult.rows} × {scanResult.cols} Grid
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Eye className='h-4 w-4' />
            <span>{scanResult.tiles.length} Images</span>
          </div>
        </div>
      </div>

      {/* Scan Results Grid */}
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Satellite Images</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const items = scanResult.tiles;
              const numCols = scanResult.cols || 1;
              const sorted = items.slice().sort((a, b) => {
                if (a.y !== b.y) return a.y - b.y; // north→south
                return a.x - b.x; // west→east
              });

              return (
                <div
                  className='grid gap-1'
                  style={{
                    gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                  }}
                >
                  {sorted.map((item, idx) => (
                    <div
                      key={`${item.z}/${item.x}/${item.y}`}
                      className='group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-colors'
                    >
                      <button
                        type='button'
                        className='block w-full'
                        onClick={() => setModalIndex(idx)}
                        title='Click to view detections'
                      >
                        <img
                          src={item.url}
                          alt={`Satellite image ${idx + 1}`}
                          className='block h-auto w-full select-none'
                        />
                        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors' />
                        <div className='absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity'>
                          {item.x}, {item.y}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Detection Modal */}
        {modalIndex !== null &&
          (() => {
            const items = scanResult.tiles;
            const sorted = items.slice().sort((a, b) => {
              if (a.y !== b.y) return a.y - b.y; // north→south
              return a.x - b.x; // west→east
            });
            const selectedTile = sorted[modalIndex];

            if (!selectedTile) return null;

            return (
              <div
                className='fixed inset-0 z-50 grid place-items-center bg-black/90 p-2'
                onClick={() => setModalIndex(null)}
              >
                <div
                  className='max-h-[95vh] w-full max-w-[95vw] overflow-auto rounded-lg border bg-background shadow-xl'
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className='p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <h2 className='text-xl font-semibold'>Image Analysis</h2>
                      <Button
                        variant='outline'
                        onClick={() => setModalIndex(null)}
                      >
                        Close
                      </Button>
                    </div>

                    <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
                      {/* Large satellite image - takes up most of the space */}
                      <div className='xl:col-span-2'>
                        <img
                          src={selectedTile.url}
                          alt='Selected satellite image'
                          className='w-full h-auto max-h-[70vh] object-contain rounded-lg border'
                        />
                        <div className='mt-3 text-sm text-muted-foreground'>
                          <div>
                            Tile Coordinates: z={selectedTile.z}, x=
                            {selectedTile.x}, y=
                            {selectedTile.y}
                          </div>
                        </div>
                      </div>

                      {/* Detection results sidebar */}
                      <div className='xl:col-span-1'>
                        <h3 className='font-medium mb-3'>Detection Results</h3>
                        <div className='bg-muted rounded-lg p-4 max-h-[60vh] overflow-auto'>
                          <pre className='whitespace-pre-wrap break-words text-sm'>
                            {JSON.stringify(selectedTile.detections, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
