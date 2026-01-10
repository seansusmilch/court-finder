import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapStyleControl } from '../MapStyleControl';
import type { MapSectionConfig } from '../shared/types';

export interface MapStyleSectionProps {
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  className?: string;
}

export function MapStyleSection({
  mapStyle,
  onMapStyleChange,
  className,
}: MapStyleSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center gap-2'>
        <SlidersHorizontal className='h-4 w-4 text-muted-foreground' />
        <h3 className='font-display text-sm font-semibold tracking-tight'>
          Map Style
        </h3>
      </div>
      <MapStyleControl
        mapStyle={mapStyle}
        onMapStyleChange={onMapStyleChange}
      />
    </div>
  );
}

/**
 * Creates a section config for the map style section
 */
export function createMapStyleSection(
  props: MapStyleSectionProps
): MapSectionConfig {
  return {
    id: 'map-style',
    order: 3,
    renderContent: () => <MapStyleSection {...props} />,
  };
}
