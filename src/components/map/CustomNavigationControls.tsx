import { type ReactNode } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Button } from '@/components/ui/button';
import { Compass, Layers3, Navigation2, Radar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  MapControlButtonConfig,
  MapControlButtonVariant,
  MapControlLayout,
  MapControlPosition,
} from './shared/types';
import {
  mapControlButtonClassName,
  mapControlIconClassName,
  combineClasses,
  sortSections,
} from './shared/types';

interface MapControlButtonProps {
  icon: ReactNode;
  label: string;
  variant?: MapControlButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  renderIcon?: (icon: ReactNode) => ReactNode;
  className?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
}

export function MapControlButton({
  icon,
  label,
  variant = 'ghost',
  onClick,
  disabled = false,
  renderIcon,
  className,
  ariaLabel,
  ariaExpanded,
}: MapControlButtonProps) {
  return (
    <Button
      variant={variant}
      size="icon"
      className={combineClasses(
        mapControlButtonClassName,
        variant === 'default' && 'border-primary',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-expanded={ariaExpanded}
      title={ariaLabel ?? label}
      type="button"
    >
      {renderIcon ? renderIcon(icon) : icon}
    </Button>
  );
}

export interface ScanProgress {
  totalTiles: number;
  tilesProcessed: number;
  predictionsFound: number;
  isComplete: boolean;
}

export interface DefaultButtonFactoriesOptions {
  onSettingsClick?: () => void;
  onScanClick?: () => void;
  isScanning?: boolean;
  scanProgress?: ScanProgress | null;
  isLocating?: boolean;
  onLocateStart?: () => void;
  onLocateEnd?: () => void;
  bearing?: number;
  settingsOpen?: boolean;
}

export function createDefaultButtons(
  mapRef: React.MutableRefObject<MapRef | null>,
  options: DefaultButtonFactoriesOptions = {}
): MapControlButtonConfig[] {
  const {
    onSettingsClick,
    onScanClick,
    isScanning = false,
    scanProgress,
    isLocating = false,
    onLocateStart,
    onLocateEnd,
    bearing = 0,
    settingsOpen = false,
  } = options;

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    onLocateStart?.();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
        });
        onLocateEnd?.();
      },
      () => {
        toast.error('Could not get your location');
        onLocateEnd?.();
      }
    );
  };

  const handleResetBearing = () => {
    mapRef.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 250,
    });
  };

  const getScanButtonLabel = () => {
    if (!isScanning || !scanProgress) return 'Scan this area';
    const { totalTiles, tilesProcessed } = scanProgress;
    return `Scanning area: ${tilesProcessed} of ${totalTiles} tiles`;
  };

  const getScanButtonIcon = () => {
    if (!isScanning || !scanProgress) {
      return <Radar className='size-5 text-primary-foreground' aria-hidden='true' />;
    }
    return null;
  };

  return [
    {
      id: 'scan',
      icon: getScanButtonIcon(),
      label: getScanButtonLabel(),
      variant: 'default',
      onClick: onScanClick ?? (() => {}),
      disabled: isScanning,
      show: false,
      order: 4,
      className:
        'border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90 dark:!bg-primary dark:!text-primary-foreground disabled:!bg-primary disabled:!text-primary-foreground disabled:!opacity-100 disabled:cursor-wait',
      renderIcon: (icon) => {
        if (!isScanning || !scanProgress || scanProgress.totalTiles === 0) {
          return <span className={isScanning ? 'animate-scan-spin' : ''}>{icon}</span>;
        }
        const progress = (scanProgress.tilesProcessed / scanProgress.totalTiles) * 100;
        return (
          <span className="font-mono text-base font-bold leading-none tracking-tight text-primary-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        );
      },
    },
    {
      id: 'settings',
      icon: <Layers3 className={mapControlIconClassName} aria-hidden='true' />,
      label: settingsOpen ? 'Close map filters' : 'Open map filters',
      onClick: onSettingsClick ?? (() => {}),
      show: false,
      order: 1,
      ariaExpanded: settingsOpen,
    },
    {
      id: 'locate',
      icon: <Navigation2 className={mapControlIconClassName} aria-hidden='true' />,
      label: 'Locate me',
      onClick: handleLocate,
      disabled: isLocating,
      show: true,
      order: 3,
      renderIcon: (icon) => (
        <span className={isLocating ? 'animate-locating' : ''}>{icon}</span>
      ),
    },
    {
      id: 'compass',
      icon: (
        <Compass
          className={`${mapControlIconClassName} transition-transform duration-200 motion-reduce:transition-none`}
          style={{ transform: `rotate(${-bearing}deg)` }}
          aria-hidden='true'
        />
      ),
      label: 'Reset bearing',
      onClick: handleResetBearing,
      show: true,
      order: 2,
    },
  ];
}

export interface CustomNavigationControlsProps {
  mapRef: React.MutableRefObject<MapRef | null>;
  className?: string;
  layout?: MapControlLayout;
  position?: MapControlPosition;
  buttons?: MapControlButtonConfig[];
  showCompass?: boolean;
  showLocate?: boolean;
  showSettings?: boolean;
  showScan?: boolean;
  onSettingsClick?: () => void;
  onScanClick?: () => void;
  isScanning?: boolean;
  scanProgress?: ScanProgress | null;
  isLocating?: boolean;
  onLocateStart?: () => void;
  onLocateEnd?: () => void;
  bearing?: number;
  settingsOpen?: boolean;
  useDefaultButtons?: boolean;
}

export function CustomNavigationControls({
  mapRef,
  className,
  layout = 'vertical',
  position,
  buttons: customButtons,
  showCompass = true,
  showLocate = true,
  showSettings = false,
  showScan = false,
  onSettingsClick,
  onScanClick,
  isScanning = false,
  scanProgress,
  isLocating = false,
  onLocateStart,
  onLocateEnd,
  bearing = 0,
  settingsOpen = false,
  useDefaultButtons = true,
}: CustomNavigationControlsProps) {
  const defaultButtons = useDefaultButtons
    ? createDefaultButtons(mapRef, {
        onSettingsClick,
        onScanClick,
        isScanning,
        scanProgress,
        isLocating,
        onLocateStart,
        onLocateEnd,
        bearing,
        settingsOpen,
      })
    : [];

  const configuredDefaults = defaultButtons.map((btn) => {
    switch (btn.id) {
      case 'compass':
        return { ...btn, show: showCompass };
      case 'locate':
        return { ...btn, show: showLocate, disabled: isLocating };
      case 'settings':
        return { ...btn, show: showSettings, ariaExpanded: settingsOpen };
      case 'scan':
        return { ...btn, show: showScan, disabled: isScanning };
      default:
        return btn;
    }
  });

  const buttonMap = new Map(
    [...configuredDefaults, ...(customButtons ?? [])].map((btn) => [btn.id, btn])
  );

  const buttons = sortSections(
    Array.from(buttonMap.values()).filter((btn) => btn.show !== false)
  );

  const layoutStyles: Record<MapControlLayout, string> = {
    vertical: 'flex flex-col gap-2',
    horizontal: 'flex flex-row gap-2',
    grid: 'grid grid-cols-2 gap-2',
  };

  const positionStyle = position
    ? {
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
      }
    : {};

  return (
    <div
      className={cn(layoutStyles[layout], 'no-zoom', className)}
      role="group"
      aria-label="Map controls"
      style={Object.keys(positionStyle).length > 0 ? positionStyle : undefined}
    >
      {buttons.map((button) => (
        <MapControlButton key={button.id} {...button} />
      ))}
    </div>
  );
}

export namespace MapControlPresets {
  export function standard(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).filter(
      (btn) => btn.id === 'compass' || btn.id === 'locate'
    );
  }

  export function withSettings(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).map((btn) =>
      btn.id === 'settings' ? { ...btn, show: true } : btn
    );
  }

  export function scanMode(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options)
      .filter((btn) => btn.id === 'locate' || btn.id === 'scan')
      .map((btn) => (btn.id === 'scan' ? { ...btn, show: true } : btn));
  }

  export function minimal(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).filter(
      (btn) => btn.id === 'compass'
    );
  }
}
