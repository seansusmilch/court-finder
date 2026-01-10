import { MapPin, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapSectionConfig } from '../shared/types';

export interface CourtCountSectionProps {
  courtCount: number;
  isZoomSufficient: boolean;
  showZoomWarning?: boolean;
  className?: string;
}

export function CourtCountSection({
  courtCount,
  isZoomSufficient,
  showZoomWarning = true,
  className,
}: CourtCountSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Court count stat - prominent */}
      <div className='flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20'>
        <div>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            Courts in view
          </p>
          <p className={cn(
            'font-display text-2xl font-bold tracking-tight mt-0.5',
            isZoomSufficient ? 'text-foreground' : 'text-muted-foreground/50'
          )}>
            {courtCount.toLocaleString()}
          </p>
        </div>
        <div className={cn(
          'flex size-12 items-center justify-center rounded-full transition-colors',
          isZoomSufficient
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          <MapPin className='h-5 w-5' />
        </div>
      </div>

      {showZoomWarning && !isZoomSufficient && (
        <div className='rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-start gap-2'>
          <SlidersHorizontal className='h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0' />
          <p className='text-xs text-amber-700 dark:text-amber-400'>
            Zoom in to reveal court pins
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Creates a section config for the court count section
 */
export function createCourtCountSection(
  props: CourtCountSectionProps
): MapSectionConfig {
  return {
    id: 'court-count',
    order: 0,
    renderContent: () => <CourtCountSection {...props} />,
  };
}
