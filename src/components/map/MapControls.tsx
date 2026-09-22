import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  createCourtCountSection,
  createConfidenceSection,
  createMapStyleSection,
  createActionButtonsSection,
  createStatusFilterSection,
  createCategoryFilterSection,
} from './sections';
import { CustomNavigationControls } from './CustomNavigationControls';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import type { MapSectionConfig } from './shared/types';
import { sortSections, filterSections } from './shared/types';
import { X } from 'lucide-react';

// ============================================================================
// Settings Types
// ============================================================================

export interface MapControlsSettings {
  // Court display
  courtCount: number;
  isZoomSufficient: boolean;

  // Filters
  categories: string[];
  enabledCategories: string[] | null;
  onCategoriesChange: (categories: string[] | null) => void;
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

  // Orientation
  bearing?: number;
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
  const actionSections =
    settings.scan || settings.upload
      ? [
          createActionButtonsSection({
            scan: settings.scan,
            upload: settings.upload,
          }),
        ]
      : [];

  return [
    createCategoryFilterSection({
      categories: settings.categories,
      enabledCategories: settings.enabledCategories ?? settings.categories,
      onCategoriesChange: (categories) => {
        settings.onCategoriesChange(
          categories.length === settings.categories.length ? null : categories
        );
      },
    }),
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
    ...actionSections,
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
  const isMobile = useIsMobile();
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const desktopControlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!desktopPanelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      // The mobile drawer owns its own dismissal behavior. This listener only
      // applies to the anchored desktop panel.
      if (window.innerWidth < 768) return;
      if (!desktopControlsRef.current?.contains(event.target as Node)) {
        setDesktopPanelOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (window.innerWidth >= 768 && event.key === 'Escape') {
        setDesktopPanelOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopPanelOpen]);

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
      {/* Desktop: unified rail with an anchored filter panel */}
      {!isMobile && (
        <div ref={desktopControlsRef} className='no-zoom'>
          {desktopPanelOpen && (
            <div className='pointer-events-auto fixed bottom-4 right-[4.5rem] z-40'>
              {controlsCard}
            </div>
          )}
          <CustomNavigationControls
            mapRef={mapRef}
            showLocate
            showCompass
            showSettings
            showScan={false}
            settingsOpen={desktopPanelOpen}
            bearing={settings.bearing}
            onSettingsClick={() => setDesktopPanelOpen((open) => !open)}
            isLocating={settings.locate?.isLocating}
            onLocateStart={settings.locate?.onLocateStart}
            onLocateEnd={settings.locate?.onLocateEnd}
            className='pointer-events-auto fixed bottom-4 right-4 z-40'
          />
        </div>
      )}

      {/* Mobile: the same rail with a bottom filter drawer */}
      {isMobile && (
        <div className='no-zoom'>
          <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <CustomNavigationControls
              mapRef={mapRef}
              layout='vertical'
              showSettings
              showScan={false}
              showLocate
              showCompass
              settingsOpen={mobileDrawerOpen}
              bearing={settings.bearing}
              isLocating={settings.locate?.isLocating}
              onLocateStart={settings.locate?.onLocateStart}
              onLocateEnd={settings.locate?.onLocateEnd}
              onSettingsClick={() => setMobileDrawerOpen(true)}
              className='pointer-events-auto fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40'
            />
            <DrawerContent className='h-[min(75dvh,42rem)] rounded-t-2xl no-zoom'>
              <DrawerHeader className='border-b border-border/70 px-5 pb-4 pt-5 text-left'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <DrawerTitle className='font-display text-xl font-semibold tracking-tight'>
                      Map filters and display
                    </DrawerTitle>
                    <DrawerDescription>
                      Choose which possible facilities appear and how the map looks.
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <button
                      type='button'
                      aria-label='Close map filters and display'
                      className='inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    >
                      <X className='size-5' aria-hidden='true' />
                    </button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className='overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5'>
                <ControlsBody sections={sections} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
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
