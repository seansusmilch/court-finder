import { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  createCourtCountSection,
  createConfidenceSection,
  createMapStyleSection,
  createActionButtonsSection,
  createStatusFilterSection,
} from './sections';
import { CustomNavigationControls } from './CustomNavigationControls';
import { cn } from '@/lib/utils';
import type { MapSectionConfig } from './shared/types';
import { sortSections, filterSections } from './shared/types';

// ============================================================================
// Settings Types
// ============================================================================

export interface MapControlsSettings {
  // Court display
  courtCount: number;
  isZoomSufficient: boolean;

  // Filters
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  verifiedOnly?: boolean;
  onVerifiedOnlyChange?: (value: boolean) => void;

  // Map style
  mapStyle: string;
  onMapStyleChange: (style: string) => void;

  // Actions
  scan?: {
    onScan: () => void;
    isScanning?: boolean;
    scanProgress?: import('./CustomNavigationControls').ScanProgress | null;
  };
  upload?: {
    onUpload: () => void;
    isUploading?: boolean;
    uploadSuccess?: boolean;
  };
  locate?: {
    isLocating?: boolean;
    onLocateStart?: () => void;
    onLocateEnd?: () => void;
  };
}

// ============================================================================
// Main MapControls Component
// ============================================================================

export interface MapControlsProps {
  className?: string;
  mapRef: React.MutableRefObject<MapRef | null>;
  settings: MapControlsSettings;
  // Section customization
  sections?: MapSectionConfig[];
}

/**
 * Creates the default set of map control sections
 */
export function createDefaultSections(settings: MapControlsSettings): MapSectionConfig[] {
  return [
    createCourtCountSection({
      courtCount: settings.courtCount,
      isZoomSufficient: settings.isZoomSufficient,
      showZoomWarning: true,
    }),
    createStatusFilterSection({
      verifiedOnly: settings.verifiedOnly ?? false,
      onVerifiedOnlyChange: settings.onVerifiedOnlyChange ?? (() => {}),
    }),
    createConfidenceSection({
      confidenceThreshold: settings.confidenceThreshold,
      onConfidenceChange: settings.onConfidenceChange,
      showPercentage: true,
    }),
    createMapStyleSection({
      mapStyle: settings.mapStyle,
      onMapStyleChange: settings.onMapStyleChange,
    }),
    ...(settings.upload
      ? [createActionButtonsSection({ upload: settings.upload })]
      : []),
  ];
}

function ControlsBody({ sections }: { sections: MapSectionConfig[] }) {
  const visibleSections = filterSections(sections);
  const orderedSections = sortSections(visibleSections);

  return (
    <div className='flex flex-col gap-5 pb-1'>
      {orderedSections.map((section) => (
        <section key={section.id} className={section.className}>
          {section.renderContent()}
        </section>
      ))}
    </div>
  );
}

export function MapControls({
  className,
  mapRef,
  settings,
  sections: customSections,
}: MapControlsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Use custom sections or fall back to defaults
  const sections = customSections ?? createDefaultSections(settings);

  const controlsCard = (
    <Card
      role='region'
      aria-label='Map filters and display'
      className='w-80 max-w-[92vw] gap-0 overflow-hidden rounded-xl border-0 bg-card py-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] no-zoom transition-none hover:translate-y-0 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
    >
      <div className='border-b border-border/70 px-4 py-3'>
        <h2 className='font-display text-sm font-semibold tracking-tight'>
          Map filters and display
        </h2>
        <p className='mt-1 text-xs leading-4 text-muted-foreground'>
          Choose which possible facilities appear and how the map looks.
        </p>
      </div>
      <CardContent className='max-h-[calc(100dvh-7rem)] overflow-y-auto px-4 py-4 md:max-h-[calc(100dvh-16rem)] xl:max-h-[calc(100dvh-7rem)]'>
        <ControlsBody sections={sections} />
      </CardContent>
    </Card>
  );

  return (
    <div className={cn(className)}>
      {/* Desktop/tablet: keep settings below the search and type filters */}
      <div className='pointer-events-auto absolute right-4 top-4 z-50 hidden no-zoom md:top-[12rem] md:block xl:top-4'>
        {controlsCard}
      </div>

      {/* Desktop: quick map actions */}
      <div className='hidden md:block no-zoom'>
        <CustomNavigationControls
          mapRef={mapRef}
          showLocate
          showCompass
          showScan={!!settings.scan}
          onScanClick={settings.scan?.onScan}
          isScanning={settings.scan?.isScanning}
          scanProgress={settings.scan?.scanProgress}
          isLocating={settings.locate?.isLocating}
          onLocateStart={settings.locate?.onLocateStart}
          onLocateEnd={settings.locate?.onLocateEnd}
          className='pointer-events-auto fixed bottom-4 right-4 z-40'
        />
      </div>

      {/* Mobile: compact actions + drawer */}
      <div className='md:hidden no-zoom'>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <CustomNavigationControls
            mapRef={mapRef}
            layout='grid'
            showSettings
            showScan={!!settings.scan}
            showLocate
            showCompass
            onScanClick={settings.scan?.onScan}
            isScanning={settings.scan?.isScanning}
            scanProgress={settings.scan?.scanProgress}
            isLocating={settings.locate?.isLocating}
            onLocateStart={settings.locate?.onLocateStart}
            onLocateEnd={settings.locate?.onLocateEnd}
            onSettingsClick={() => setDrawerOpen(true)}
            className='pointer-events-auto fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40'
          />
          <DrawerContent className='h-[min(75dvh,42rem)] rounded-t-2xl no-zoom'>
            <DrawerHeader className='border-b border-border/70 px-5 pb-4 pt-5 text-left'>
              <DrawerTitle className='font-display text-xl font-semibold tracking-tight'>
                Map filters and display
              </DrawerTitle>
              <DrawerDescription>
                Choose which possible facilities appear and how the map looks.
              </DrawerDescription>
            </DrawerHeader>
            <div className='overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5'>
              <ControlsBody sections={sections} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

/**
 * A simplified version that renders only the controls body (for embedding in other components)
 */
export function MapControlsBody({
  sections,
  className,
}: {
  sections: MapSectionConfig[];
  className?: string;
}) {
  return (
    <div className={className}>
      <ControlsBody sections={sections} />
    </div>
  );
}

export default MapControls;
