import { useMemo, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ConfidenceSlider } from './ConfidenceSlider';
import { MapStyleControl } from './MapStyleControl';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { getVisualForClass } from '@/lib/constants';
import { Check } from 'lucide-react';

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
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  categories: string[];
  enabledCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  canUpload?: boolean;
  onUpload?: () => void;
  isUploading?: boolean;
  uploadSuccess?: boolean;
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
  mapStyle,
  onMapStyleChange,
  categories,
  enabledCategories,
  onCategoriesChange,
  canUpload,
  onUpload,
  isUploading,
  uploadSuccess,
  shouldBlurSearchOnMount,
}: Omit<MapControlsProps, 'className'> & {
  shouldBlurSearchOnMount?: boolean;
}) {
  const searchBoxContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shouldBlurSearchOnMount) return;
    // Defer to allow any internal focus to occur, then blur
    const t = setTimeout(() => {
      const input = searchBoxContainerRef.current?.querySelector('input');
      if (input && document.activeElement === input) {
        (input as HTMLInputElement).blur();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [shouldBlurSearchOnMount]);

  const allSelected = enabledCategories.length === categories.length;

  return (
    <div className='space-y-3'>
      <div className='w-full' ref={searchBoxContainerRef}>
        {/* SearchBox from @mapbox/search-js-react */}
        <SearchBox
          accessToken={accessToken as string}
          onRetrieve={(res) => {
            const feature = (res as any)?.features?.[0];
            let coords: [number, number] | undefined;
            const geomCoords = feature?.geometry?.coordinates;
            if (Array.isArray(geomCoords) && geomCoords.length >= 2) {
              coords = [Number(geomCoords[0]), Number(geomCoords[1])];
            }
            const propCoords = feature?.properties?.coordinates;
            if (
              !coords &&
              Array.isArray(propCoords) &&
              propCoords.length >= 2
            ) {
              coords = [Number(propCoords[0]), Number(propCoords[1])];
            }
            if (coords && mapRef.current) {
              mapRef.current.easeTo({
                center: coords,
                zoom: 14,
                duration: 800,
              });
            }
          }}
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

      <MapStyleControl
        mapStyle={mapStyle}
        onMapStyleChange={onMapStyleChange}
      />

      <div className='space-y-2'>
        <div className='text-xs font-medium'>Filter categories</div>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='secondary'
            onClick={() => onCategoriesChange(categories)}
            disabled={categories.length === 0 || allSelected}
          >
            Select all
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onClick={() => onCategoriesChange([])}
            disabled={enabledCategories.length === 0}
          >
            Clear all
          </Button>
        </div>
        <div className='max-h-44 overflow-auto rounded border p-2'>
          <div className='grid grid-cols-2 gap-2'>
            {categories.map((cat) => {
              const checked = enabledCategories.includes(cat);
              const visual = getVisualForClass(cat);
              return (
                <label key={cat} className='flex items-center gap-2 text-xs'>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(val) => {
                      const isChecked = Boolean(val);
                      if (isChecked && !checked) {
                        onCategoriesChange([...enabledCategories, cat]);
                      } else if (!isChecked && checked) {
                        onCategoriesChange(
                          enabledCategories.filter((c) => c !== cat)
                        );
                      }
                    }}
                  />
                  <span className='truncate'>{visual.displayName}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {isZoomSufficient ? (
        <div className='space-y-1 text-xs'>
          <div className='text-success font-semibold'>
            {courtCount} courts found
          </div>
          <div className='text-success'>
            Showing all available data
          </div>
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

      {canUpload && (
        <div className='pt-1'>
          <Button
            variant={uploadSuccess ? 'default' : 'outline'}
            onClick={onUpload}
            disabled={isUploading || uploadSuccess}
            className={cn(
              'w-full transition-colors',
              uploadSuccess && 'bg-success text-success-foreground hover:bg-success/90'
            )}
          >
            {uploadSuccess ? (
              <div className='flex items-center gap-2'>
                <Check className='size-4' />
                Uploaded successfully!
              </div>
            ) : isUploading ? (
              'Uploading…'
            ) : (
              'Upload center tile'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Mapbox SearchBox import must be after ts references
import { SearchBox } from '@mapbox/search-js-react';
import { Search } from 'lucide-react';

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
  mapStyle,
  onMapStyleChange,
  categories,
  enabledCategories,
  onCategoriesChange,
  canUpload,
  onUpload,
  isUploading,
  uploadSuccess,
}: MapControlsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const card = (
    <Card className='bg-background/90 backdrop-blur shadow-sm w-80 max-w-[92vw]'>
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
          mapStyle={mapStyle}
          onMapStyleChange={onMapStyleChange}
          categories={categories}
          enabledCategories={enabledCategories}
          onCategoriesChange={onCategoriesChange}
          canUpload={canUpload}
          onUpload={onUpload}
          isUploading={isUploading}
          uploadSuccess={uploadSuccess}
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
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          {!sheetOpen && (
            <SheetTrigger asChild>
              <Button
                aria-label='Open map controls'
                className='fixed bottom-20 right-4 z-[60] h-12 w-12 rounded-full shadow-lg flex items-center justify-center'
                size='icon'
                variant='default'
              >
                <Search className='size-6' aria-hidden='true' />
              </Button>
            </SheetTrigger>
          )}
          <SheetContent side='bottom' className='h-[70vh]'>
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
                mapStyle={mapStyle}
                onMapStyleChange={onMapStyleChange}
                categories={categories}
                enabledCategories={enabledCategories}
                onCategoriesChange={onCategoriesChange}
                canUpload={canUpload}
                onUpload={onUpload}
                isUploading={isUploading}
                uploadSuccess={uploadSuccess}
                shouldBlurSearchOnMount={sheetOpen}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default MapControls;
