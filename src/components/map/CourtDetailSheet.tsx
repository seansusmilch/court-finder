import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Navigation } from 'lucide-react';
import type { CourtFeatureProperties } from '@/lib/types';
import { DistanceDisplay } from '@/components/map/DistanceDisplay';
import { useUserLocation } from '@/hooks/useUserLocation';
import { FavoriteButton } from '@/components/map/FavoriteButton';

interface CourtDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
}

export function CourtDetailSheet({
  open,
  onOpenChange,
  longitude,
  latitude,
  properties,
}: CourtDetailSheetProps) {
  const { location: userLocation, error: locationError, loading: locationLoading } = useUserLocation();
  const courtClass = properties.class ? String(properties.class) : '';
  const { emoji, displayName } = getVisualForClass(courtClass);
  const confidence = properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;

  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence === null) return '';
    if (confidence >= 80) return 'text-success bg-success/10 border-success/20';
    if (confidence >= 60) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl border-t-2"
        onPointerDownOutside={(e) => {
          // Allow closing by tapping outside
          onOpenChange(false);
        }}
        onEscapeKeyDown={() => {
          onOpenChange(false);
        }}
      >
        <div className="flex flex-col h-full">
          {/* Drag handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <SheetHeader className="px-2 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{emoji}</div>
                <div>
                  <SheetTitle className="text-xl">{displayName}</SheetTitle>
                  {confidence !== null && (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mt-1',
                      getConfidenceColor()
                    )}>
                      {confidence}% confidence
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Distance */}
          <div className="px-2 py-3">
            <DistanceDisplay
              userLocation={userLocation}
              latitude={latitude}
              longitude={longitude}
              loading={locationLoading}
              error={locationError}
            />
          </div>

          {/* Action buttons */}
          <div className="px-2 py-3 space-y-2">
            <Button
              onClick={openDirections}
              className="w-full"
              size="lg"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Get Directions
            </Button>

            <FavoriteButton courtId={properties.detection_id} />
          </div>

          {/* Details section */}
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Location</h3>
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>

            {properties.zoom_level != null && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Detection Details</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Detected at zoom level:</span>
                    <span className="font-mono">{String(properties.zoom_level)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="font-mono">{properties.model} v{properties.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detection ID:</span>
                    <span className="font-mono text-[10px]">{properties.detection_id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
