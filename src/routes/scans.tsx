import {
  createFileRoute,
  Link,
  useSearch,
  redirect,
} from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@backend/api';
import type { Id } from '@backend/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  MapPin,
  Grid3X3,
  Eye,
  ArrowLeft,
  Search,
} from 'lucide-react';

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

// Geocoding function to convert coordinates to readable location
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${
        import.meta.env.VITE_MAPBOX_API_KEY
      }&types=place&limit=5`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      // Look for the most general location (city, neighborhood, etc.)
      for (const feature of data.features) {
        const placeName = feature.place_name;
        const parts = placeName.split(', ');

        // Return the first part (most general location)
        if (parts.length > 0) {
          return parts[0];
        }
      }

      // Fallback to first feature's main name
      return data.features[0].place_name.split(',')[0];
    }

    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export const Route = createFileRoute('/scans')({
  component: ScansPage,
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({ to: '/login', search: { redirect: location.href } });
  },
});

function ScansPage() {
  const search = useSearch({ from: '/scans' }) as { scanId?: string };
  const scanId = (search.scanId as Id<'scans'> | undefined) ?? undefined;
  const scanResult = useQuery(
    api.scanResults.getByScanId,
    scanId ? { scanId } : 'skip'
  ) as ScanResult | undefined;
  const scans = useQuery(api.scans.listAll, {});
  const [searchQuery, setSearchQuery] = useState('');
  const [locationNames, setLocationNames] = useState<Record<string, string>>(
    {}
  );

  const [modalIndex, setModalIndex] = useState<number | null>(null);

  // Geocode scan locations
  useEffect(() => {
    if (scans) {
      scans.forEach(async (scan) => {
        const key = `${scan.centerLat},${scan.centerLong}`;
        if (!locationNames[key]) {
          const locationName = await reverseGeocode(
            scan.centerLat,
            scan.centerLong
          );
          setLocationNames((prev) => ({ ...prev, [key]: locationName }));
        }
      });
    }
  }, [scans, locationNames]);

  // Filter scans based on search query
  const filteredScans = useMemo(() => {
    if (!scans || !searchQuery.trim()) return scans;

    const query = searchQuery.toLowerCase();
    return scans.filter(
      (scan) =>
        scan.centerLat.toString().includes(query) ||
        scan.centerLong.toString().includes(query) ||
        scan.tileCount.toString().includes(query) ||
        new Date(scan.createdAt)
          .toLocaleDateString()
          .toLowerCase()
          .includes(query) ||
        (locationNames[`${scan.centerLat},${scan.centerLong}`] || '')
          .toLowerCase()
          .includes(query)
    );
  }, [scans, searchQuery, locationNames]);

  // If viewing a specific scan, show scan details
  if (scanId) {
    if (!scanResult) {
      return (
        <div className='container mx-auto max-w-7xl px-4 py-4'>
          <div className='mb-6 flex items-center gap-4'>
            <Link
              to='/scans'
              className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'
            >
              <ArrowLeft className='h-4 w-4' />
              Back to Scans
            </Link>
          </div>
          <div className='flex items-center justify-center py-12'>
            <div className='text-muted-foreground'>Loading scan details...</div>
          </div>
        </div>
      );
    }

    return (
      <div className='container mx-auto max-w-7xl px-4 py-4'>
        <div className='mb-6 flex items-center gap-4'>
          <Link
            to='/scans'
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
          {modalIndex !== null && scanResult.tiles[modalIndex] && (
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
                        src={scanResult.tiles[modalIndex].url}
                        alt='Selected satellite image'
                        className='w-full h-auto max-h-[70vh] object-contain rounded-lg border'
                      />
                      <div className='mt-3 text-sm text-muted-foreground'>
                        <div>
                          Tile Coordinates: z={scanResult.tiles[modalIndex].z},
                          x={scanResult.tiles[modalIndex].x}, y=
                          {scanResult.tiles[modalIndex].y}
                        </div>
                      </div>
                    </div>

                    {/* Detection results sidebar */}
                    <div className='xl:col-span-1'>
                      <h3 className='font-medium mb-3'>Detection Results</h3>
                      <div className='bg-muted rounded-lg p-4 max-h-[60vh] overflow-auto'>
                        <pre className='whitespace-pre-wrap break-words text-sm'>
                          {JSON.stringify(
                            scanResult.tiles[modalIndex].detections,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main scans list view
  return (
    <div className='container mx-auto max-w-6xl px-4 py-4'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Satellite Scans</h1>
        <p className='text-muted-foreground'>
          View and analyze your satellite imagery scans
        </p>
      </div>

      {/* Search and Filter */}
      {scans && scans.length > 0 && (
        <div className='mb-6'>
          <div className='relative max-w-md'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search scans...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
        </div>
      )}

      {!scans && (
        <div className='flex items-center justify-center py-12'>
          <div className='text-muted-foreground'>Loading scans...</div>
        </div>
      )}

      {scans && scans.length === 0 && (
        <Card className='p-12 text-center'>
          <div className='text-muted-foreground'>
            <MapPin className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium mb-2'>No scans found</h3>
            <p>You haven't created any satellite scans yet.</p>
          </div>
        </Card>
      )}

      {scans &&
        scans.length > 0 &&
        filteredScans &&
        filteredScans.length === 0 && (
          <Card className='p-12 text-center'>
            <div className='text-muted-foreground'>
              <Search className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <h3 className='text-lg font-medium mb-2'>No matching scans</h3>
              <p>Try adjusting your search terms.</p>
            </div>
          </Card>
        )}

      {filteredScans && filteredScans.length > 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredScans.map((scan: ScanListItem) => {
            const locationKey = `${scan.centerLat},${scan.centerLong}`;
            const locationName =
              locationNames[locationKey] || 'Loading location...';

            return (
              <Card
                key={scan._id}
                className='hover:shadow-md transition-shadow'
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <CardTitle className='text-base truncate'>
                        {locationName}
                      </CardTitle>
                      <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
                        <MapPin className='h-3 w-3' />
                        <span>
                          {scan.centerLat.toFixed(4)},{' '}
                          {scan.centerLong.toFixed(4)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mt-2 text-sm text-muted-foreground'>
                        <Calendar className='h-4 w-4' />
                        <span>
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant='secondary' className='ml-2'>
                      {scan.tileCount} tiles
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='flex items-center justify-between'>
                    <div className='text-xs text-muted-foreground'>
                      {new Date(scan.createdAt).toLocaleTimeString()}
                    </div>
                    <Link
                      to='/scans'
                      search={{ scanId: scan._id }}
                      className='text-primary hover:text-primary/80 text-sm font-medium'
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
