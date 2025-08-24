import { useMemo } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ConfidenceSlider } from './ConfidenceSlider';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  className?: string;
  mapRef: React.MutableRefObject<MapRef | null>;
  accessToken: string;
  zoomLevel: number;
  pinsVisibleFromZoom: number;
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  courtCount: number;
  availableZoomLevels?: number[];
  isZoomSufficient: boolean;
  canScan?: boolean;
  onScan?: () => void;
  isScanning?: boolean;
}

function ControlsBody({
  accessToken,
  mapRef,
  zoomLevel,
  pinsVisibleFromZoom,
  confidenceThreshold,
  onConfidenceChange,
  courtCount,
  availableZoomLevels,
  isZoomSufficient,
  canScan,
  onScan,
  isScanning,
}: Omit<MapControlsProps, 'className'>) {
  return (
    <div className='space-y-3'>
      {/* @ts-expect-error - SearchBox is not typed */}
      <div className='w-full'>
        <SearchBox
          accessToken={accessToken as string}
          onRetrieve={(res: any) => {
            const feature = res?.features?.[0];
            const coords =
              (feature?.geometry?.coordinates as
                | [number, number]
                | undefined) ??
              (feature?.properties?.coordinates as
                | [number, number]
                | undefined);
            if (coords && mapRef.current) {
              mapRef.current.easeTo({
                center: coords,
                zoom: 14,
                duration: 800,
              });
            }
          }}
          className='w-full'
        />
      </div>

      <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
        <div>Zoom: {Math.round(zoomLevel)}</div>
        <div className='text-right'>Pins from {pinsVisibleFromZoom}+</div>
      </div>

      <ConfidenceSlider
        confidenceThreshold={confidenceThreshold}
        onConfidenceChange={onConfidenceChange}
      />

      {isZoomSufficient ? (
        <div className='space-y-1 text-xs'>
          <div className='text-green-700 dark:text-green-400'>
            {courtCount} courts found
          </div>
          <div className='text-green-700 dark:text-green-400'>
            Showing all available data
          </div>
          {availableZoomLevels && availableZoomLevels.length > 0 && (
            <div className='text-muted-foreground'>
              Data from zooms: {availableZoomLevels.join(', ')}
            </div>
          )}
        </div>
      ) : (
        <div className='text-xs text-destructive'>
          Zoom in to see court pins
        </div>
      )}

      {canScan && (
        <div className='pt-1'>
          <Button
            variant='default'
            onClick={onScan}
            disabled={isScanning}
            className='w-full'
          >
            {isScanning ? 'Scanning…' : 'Scan this area'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Mapbox SearchBox import must be after ts references
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SearchBox } from '@mapbox/search-js-react';

export function MapControls({
  className,
  mapRef,
  accessToken,
  zoomLevel,
  pinsVisibleFromZoom,
  confidenceThreshold,
  onConfidenceChange,
  courtCount,
  availableZoomLevels,
  isZoomSufficient,
  canScan,
  onScan,
  isScanning,
}: MapControlsProps) {
  const card = (
    <Card className='bg-background/90 backdrop-blur shadow-sm w-80 max-w-[92vw]'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>Map Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <ControlsBody
          accessToken={accessToken}
          mapRef={mapRef}
          zoomLevel={zoomLevel}
          pinsVisibleFromZoom={pinsVisibleFromZoom}
          confidenceThreshold={confidenceThreshold}
          onConfidenceChange={onConfidenceChange}
          courtCount={courtCount}
          availableZoomLevels={availableZoomLevels}
          isZoomSufficient={isZoomSufficient}
          canScan={canScan}
          onScan={onScan}
          isScanning={isScanning}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className={cn(className)}>
      {/* Desktop/tablet: show fixed card bottom-left */}
      <div className='hidden md:block absolute bottom-4 left-4 z-50 pointer-events-auto'>
        {card}
      </div>

      {/* Mobile: FAB + bottom sheet */}
      <div className='md:hidden pointer-events-auto'>
        <Sheet>
          <SheetTrigger asChild>
            <button
              aria-label='Open map controls'
              className='fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center'
            >
              ≡
            </button>
          </SheetTrigger>
          <SheetContent side='bottom' className='h-[70vh]'>
            <SheetHeader>
              <SheetTitle>Map Controls</SheetTitle>
            </SheetHeader>
            <div className='pt-4'>
              <ControlsBody
                accessToken={accessToken}
                mapRef={mapRef}
                zoomLevel={zoomLevel}
                pinsVisibleFromZoom={pinsVisibleFromZoom}
                confidenceThreshold={confidenceThreshold}
                onConfidenceChange={onConfidenceChange}
                courtCount={courtCount}
                availableZoomLevels={availableZoomLevels}
                isZoomSufficient={isZoomSufficient}
                canScan={canScan}
                onScan={onScan}
                isScanning={isScanning}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default MapControls;
