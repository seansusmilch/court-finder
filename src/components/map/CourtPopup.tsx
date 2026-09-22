import { Popup } from 'react-map-gl/mapbox';
import { CircleAlert, CircleCheck, Navigation, X } from 'lucide-react';
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
  const { bgClass, displayName } = getVisualForClass(courtClass);
  const isVerified = properties.status === 'verified';
  const confidence = properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;
  const verificationLabel = isVerified
    ? 'Community verified'
    : properties.status === 'rejected'
      ? 'Community review disagrees'
      : 'Not yet verified';

  const getConfidenceColor = () => {
    if (confidence === null) return '';
    if (confidence >= 80) return 'border-primary/20 bg-primary/10 text-primary';
    if (confidence >= 60) return 'border-warning/30 bg-warning/20 text-foreground';
    return 'border-destructive/20 bg-destructive/10 text-destructive';
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
        <div
          className='relative flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-lg border border-border bg-card p-4 pr-12 shadow-lg'
          role='dialog'
          aria-label={`Possible ${displayName} details`}
        >
          <button
            type='button'
            onClick={onClose}
            className='absolute right-1 top-1 inline-flex min-h-12 min-w-12 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring'
            aria-label='Close possible facility details'
          >
            <X className='h-4 w-4' aria-hidden='true' />
          </button>

          <div className='flex items-start gap-2'>
            <span className={cn('mt-1 size-3 shrink-0 rounded-full ring-2 ring-background', bgClass)} aria-hidden='true' />
            <div className='min-w-0'>
              <h2 className='text-base font-semibold leading-tight'>Possible {displayName}</h2>
              <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                Satellite detection; confirm access before visiting.
              </p>
            </div>
          </div>

          <div className='grid gap-2 text-xs'>
            {confidence !== null && (
              <div className={cn('flex items-center justify-between gap-3 rounded-md border px-2.5 py-2', getConfidenceColor())}>
                <span className='font-normal'>Model confidence</span>
                <span className='font-semibold'>{confidence}%</span>
              </div>
            )}
            <div className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-2 font-medium',
              isVerified
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground'
            )}>
              {isVerified ? <CircleCheck className='h-3.5 w-3.5' aria-hidden='true' /> : <CircleAlert className='h-3.5 w-3.5' aria-hidden='true' />}
              <span>{verificationLabel}</span>
            </div>
          </div>

          <div className='space-y-1 text-xs'>
            <div className='text-muted-foreground'>Location</div>
            <div className='font-mono text-foreground'>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>

          {isVerified && properties.totalFeedbackCount != null && (
            <div className='text-xs text-muted-foreground'>
              Community signal:{' '}
              <span className='font-medium text-foreground'>
                {properties.positiveFeedbackCount ?? 0}/{properties.totalFeedbackCount} matching reviews
              </span>
            </div>
          )}
          {(properties.zoom_level != null || properties.model != null) && (
            <div className='grid gap-1 text-xs text-muted-foreground'>
              {properties.zoom_level != null && (
                <div className='flex justify-between gap-3'>
                  <span>Detected at zoom</span>
                  <span className='font-mono text-foreground'>{String(properties.zoom_level)}</span>
                </div>
              )}
              {properties.model != null && (
                <div className='flex justify-between gap-3'>
                  <span>Model</span>
                  <span className='font-mono text-foreground'>
                    {properties.model}{properties.version != null ? ` v${properties.version}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}
          <Button asChild size='lg' variant='default' className='mt-1 min-h-12 w-full'>
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
              aria-label='Open possible facility in maps'
            >
              <Navigation className='h-4 w-4' aria-hidden='true' />
              <span>Open in Maps</span>
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
