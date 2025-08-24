import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import type { Id } from '@backend/dataModel';
import { Button } from '../ui/button';

type ScanListItemProps = {
  scan: {
    _id: Id<'scans'>;
    centerLat: number;
    centerLong: number;
    createdAt: number;
    tileCount: number;
  };
  locationName: string;
};

export function ScanListItem({ scan, locationName }: ScanListItemProps) {
  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0'>
            <CardTitle className='text-base truncate'>{locationName}</CardTitle>
          </div>
          <Badge variant='secondary' className='ml-2'>
            {scan.tileCount} tiles
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-between'>
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <MapPin className='h-4 w-4' />
              <span>
                {scan.centerLat.toFixed(4)}, {scan.centerLong.toFixed(4)}
              </span>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Calendar className='h-4 w-4' />
              <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
              <span>{new Date(scan.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <Link
            to='/scans'
            search={{ scanId: scan._id }}
            className='inline-block'
          >
            <Button variant='default' size='sm'>
              View Details →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
