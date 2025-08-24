import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin, Search } from 'lucide-react';
import { ScanListItem } from './ScanListItem';
import type { Id } from '@backend/dataModel';

type ScanListProps = {
  scans: Array<{
    _id: Id<'scans'>;
    centerLat: number;
    centerLong: number;
    createdAt: number;
    tileCount: number;
  }>;
  filteredScans: Array<{
    _id: Id<'scans'>;
    centerLat: number;
    centerLong: number;
    createdAt: number;
    tileCount: number;
  }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locationNames: Record<string, string>;
  isLoading: boolean;
};

export function ScanList({
  scans,
  filteredScans,
  searchQuery,
  onSearchChange,
  locationNames,
  isLoading,
}: ScanListProps) {
  return (
    <div className='container mx-auto max-w-4xl px-4 py-4'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold mb-2'>
          Satellite Scans ({scans.length})
        </h1>
        <p className='text-muted-foreground'>
          View and analyze your satellite imagery scans
        </p>
      </div>

      {/* Search and Filter */}
      {scans.length > 0 && (
        <div className='mb-4'>
          <div className='relative max-w-md'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search scans...'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className='pl-10'
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className='flex items-center justify-center py-12'>
          <div className='text-muted-foreground'>Loading scans...</div>
        </div>
      )}

      {!isLoading && scans.length === 0 && (
        <Card className='p-12 text-center'>
          <div className='text-muted-foreground'>
            <MapPin className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium mb-2'>No scans found</h3>
            <p>You haven't created any satellite scans yet.</p>
          </div>
        </Card>
      )}

      {!isLoading && scans.length > 0 && filteredScans.length === 0 && (
        <Card className='p-12 text-center'>
          <div className='text-muted-foreground'>
            <Search className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium mb-2'>No matching scans</h3>
            <p>Try adjusting your search terms.</p>
          </div>
        </Card>
      )}

      {!isLoading && filteredScans.length > 0 && (
        <div className='space-y-3'>
          {filteredScans.map((scan) => {
            const locationKey = `${scan.centerLat},${scan.centerLong}`;
            const locationName =
              locationNames[locationKey] || 'Loading location...';

            return (
              <ScanListItem
                key={scan._id}
                scan={scan}
                locationName={locationName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
