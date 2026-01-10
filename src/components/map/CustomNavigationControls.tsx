import { useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Navigation, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomNavigationControlsProps {
  mapRef: React.MutableRefObject<MapRef | null>;
  className?: string;
  showCompass?: boolean;
  showZoom?: boolean;
  showLocate?: boolean;
}

export function CustomNavigationControls({
  mapRef,
  className,
  showCompass = true,
  showZoom = true,
  showLocate = true,
}: CustomNavigationControlsProps) {
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, [mapRef]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, [mapRef]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not get your location');
      }
    );
  }, [mapRef]);

  const handleResetBearing = useCallback(() => {
    mapRef.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 1000,
    });
  }, [mapRef]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLocate && (
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full shadow-md bg-background/90 backdrop-blur-sm"
          onClick={handleLocate}
          aria-label="Locate me"
        >
          <Navigation className="h-5 w-5 fill-current" />
        </Button>
      )}

      {showCompass && (
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full shadow-md bg-background/90 backdrop-blur-sm"
          onClick={handleResetBearing}
          aria-label="Reset bearing"
        >
          <Compass className="h-5 w-5" />
        </Button>
      )}

      {showZoom && (
        <div className="flex flex-col rounded-full shadow-md bg-background/90 backdrop-blur-sm overflow-hidden divide-y divide-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none hover:bg-background/80"
            onClick={handleZoomIn}
            aria-label="Zoom in"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none hover:bg-background/80"
            onClick={handleZoomOut}
            aria-label="Zoom out"
          >
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
