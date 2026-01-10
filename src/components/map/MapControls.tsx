import { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  createCourtCountSection,
  createConfidenceSection,
  createMapStyleSection,
  createActionButtonsSection,
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

  // Map style
  mapStyle: string;
  onMapStyleChange: (style: string) => void;

  // Actions
  scan?: {
    onScan: () => void;
    isScanning?: boolean;
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
  /**
   * If true, renders a collapsible panel instead of always visible card
   */
  collapsible?: boolean;
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
    createConfidenceSection({
      confidenceThreshold: settings.confidenceThreshold,
      onConfidenceChange: settings.onConfidenceChange,
      showPercentage: true,
    }),
    createMapStyleSection({
      mapStyle: settings.mapStyle,
      onMapStyleChange: settings.onMapStyleChange,
    }),
    ...(settings.scan || settings.upload
      ? [
          createActionButtonsSection({
            scan: settings.scan,
            upload: settings.upload,
          }),
        ]
      : []),
  ];
}

function ControlsBody({ sections }: { sections: MapSectionConfig[] }) {
  const visibleSections = filterSections(sections);
  const orderedSections = sortSections(visibleSections);

  return (
    <div className='flex flex-col gap-6 pb-4'>
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

  const { scan } = settings;

  const controlsCard = (
    <Card className='bg-background/90 backdrop-blur shadow-sm w-80 max-w-[92vw] no-zoom'>
      <CardContent>
        <ControlsBody sections={sections} />
      </CardContent>
    </Card>
  );

  return (
    <div className={cn(className)}>
      {/* Desktop/tablet: show fixed card above zoom controls */}
      <div className='hidden md:block absolute bottom-[22rem] right-4 z-50 pointer-events-auto no-zoom'>
        {controlsCard}
      </div>

      {/* Mobile: FAB + drawer */}
      <div className='md:hidden no-zoom'>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <CustomNavigationControls
            mapRef={mapRef}
            showSettings={!!settings.scan}
            showScan={!!settings.scan}
            onScanClick={settings.scan?.onScan}
            isScanning={settings.scan?.isScanning}
            isLocating={settings.locate?.isLocating}
            onLocateStart={settings.locate?.onLocateStart}
            onLocateEnd={settings.locate?.onLocateEnd}
            onSettingsClick={() => setDrawerOpen(true)}
            className='fixed bottom-24 right-4 pointer-events-auto'
          />
          <DrawerContent className='h-[75vh] no-zoom'>
            <DrawerHeader className='px-6 pt-6 pb-4 border-b text-left'>
              <DrawerTitle className='font-display text-xl font-bold tracking-tight'>
                Map Settings
              </DrawerTitle>
              <DrawerDescription>
                Customize your view
              </DrawerDescription>
            </DrawerHeader>
            <div className='px-6 pt-6 overflow-y-auto'>
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
