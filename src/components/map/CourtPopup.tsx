import { Popup } from 'react-map-gl/mapbox';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CourtPopupProps {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
  onClose: () => void;
}

export function CourtPopup({
  longitude,
  latitude,
  properties,
  onClose,
}: CourtPopupProps) {
  const courtClass = properties.class ? String(properties.class) : '';
  const { emoji, displayName } = getVisualForClass(courtClass);

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
    >
      <div className='flex flex-col items-center justify-center'>
        <div className='max-w-xs rounded-md border border-border bg-background shadow-sm p-3 space-y-2 flex flex-col'>
          <div className='flex items-center gap-2'>
            <span className='text-base' aria-hidden>
              {emoji}
            </span>
            <div className='text-sm font-semibold'>{displayName}</div>
          </div>

          <div className='space-y-1'>
            <div className='text-xs text-muted-foreground'>Location</div>
            <div className='text-xs'>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>

          {properties.confidence != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Confidence:</span>
              <span className='ml-1 text-green-700 dark:text-green-400'>
                {Math.round(Number(properties.confidence) * 100)}%
              </span>
            </div>
          )}
          {properties.class != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Type:</span>
              <span className='ml-1'>{displayName}</span>
            </div>
          )}
          {properties.zoom_level != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Detected at zoom:</span>
              <span className='ml-1'>{String(properties.zoom_level)}</span>
            </div>
          )}
          <Button asChild size='sm' variant='secondary' className='mt-1'>
            <a
              href={`https://maps.google.com/maps?q=${latitude},${longitude}`}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => {
                e.preventDefault();
                const geoUrl = `geo:${latitude},${longitude}`;

                try {
                  window.open(geoUrl, '_blank');
                  setTimeout(() => {
                    window.open(
                      `https://maps.google.com/maps?q=${latitude},${longitude}`,
                      '_blank'
                    );
                  }, 250);
                } catch (error) {
                  window.open(
                    `https://maps.google.com/maps?q=${latitude},${longitude}`,
                    '_blank'
                  );
                }
              }}
              title='Open in default map application'
            >
              <Navigation className='size-3.5' />
              Open in Maps
            </a>
          </Button>
        </div>
        <div
          className={cn(
            'w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent -mt-[1px] border-t-background'
          )}
          aria-hidden
        />
      </div>
    </Popup>
  );
}
