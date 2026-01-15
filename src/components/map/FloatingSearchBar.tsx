import type { MapRef } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import { CustomSearchBar } from '@/components/map/CustomSearchBar';

interface FloatingSearchBarProps {
  accessToken: string;
  mapRef: React.MutableRefObject<MapRef | null>;
  className?: string;
}

export function FloatingSearchBar({
  accessToken,
  mapRef,
  className,
}: FloatingSearchBarProps) {
  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md no-zoom md:top-[4.5rem] md:z-50',
        className
      )}
    >
      <CustomSearchBar accessToken={accessToken} mapRef={mapRef} />
    </div>
  );
}
