import { Popup } from 'react-map-gl/mapbox';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CourtFeatureProperties } from '@/lib/types';

interface CourtPopupProps {
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
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
  const isVerified = properties.status === 'verified';
  const confidence = !isVerified && properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;

  const getConfidenceColor = () => {
    if (confidence === null) return '';
    if (confidence >= 80) return 'text-success font-semibold';
    if (confidence >= 60) return 'text-warning font-medium';
    return 'text-destructive font-medium';
  };

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
    >
      <div className='flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200'>
        <div className='max-w-xs rounded-lg border border-border bg-card shadow-lg p-4 space-y-3 flex flex-col'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-lg' aria-hidden>
                {emoji}
              </span>
              <div className='text-base font-semibold'>{displayName}</div>
            </div>
            {isVerified && (
              <span className='text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded'>
                Verified
              </span>
            )}
          </div>

          <div className='space-y-1'>
            <div className='text-xs text-muted-foreground'>Location</div>
            <div className='text-xs font-mono'>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>

          {!isVerified && confidence !== null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Confidence:</span>
              <span className={cn('ml-1', getConfidenceColor())}>
                {confidence}%
              </span>
            </div>
          )}
          {properties.class != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Type:</span>
              <span className='ml-1'>{displayName}</span>
            </div>
          )}
          {isVerified && properties.totalFeedbackCount != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Verified by</span>
              <span className='ml-1 font-medium'>
                {properties.positiveFeedbackCount}/{properties.totalFeedbackCount} users
              </span>
            </div>
          )}
          {properties.zoom_level != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Detected at zoom:</span>
              <span className='ml-1'>{String(properties.zoom_level)}</span>
            </div>
          )}
          {properties.model != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Model:</span>
              <span className='text-muted-foreground'>
                {` v${properties.version}`}
              </span>
            </div>
          )}
          <Button asChild size='sm' variant='default' className='mt-2 w-full'>
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
          className='w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent -mt-[1px] border-t-card'
          aria-hidden
        />
      </div>
    </Popup>
  );
}
