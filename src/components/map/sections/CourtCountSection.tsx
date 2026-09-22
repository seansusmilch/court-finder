import { AlertCircle, MapPin } from 'lucide-react';
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
      {/* Possible facility count - prominent */}
      <div className='flex items-center justify-between'>
        <div>
          <p className='font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground'>
            Possible facilities in view
          </p>
          <p className={cn(
            'mt-1 font-display text-3xl font-semibold tracking-tight',
            isZoomSufficient ? 'text-foreground' : 'text-muted-foreground/50'
          )}>
            {courtCount.toLocaleString()}
          </p>
        </div>
        <div className={cn(
          'flex size-10 items-center justify-center rounded-lg transition-colors',
          isZoomSufficient
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          <MapPin className='h-5 w-5' />
        </div>
      </div>

      {showZoomWarning && !isZoomSufficient && (
        <div className='rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-start gap-2'>
          <AlertCircle className='mt-0.5 size-4 flex-shrink-0 text-amber-600 dark:text-amber-400' />
          <p className='text-xs leading-5 text-amber-700 dark:text-amber-300'>
            Zoom in to reveal possible facilities.
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
