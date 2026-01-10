import { useCallback, type ReactNode } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Button } from '@/components/ui/button';
import { Navigation, Compass, Settings2, Radar } from 'lucide-react';
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
    >
      {renderIcon ? renderIcon(icon) : icon}
    </Button>
  );
}

export interface DefaultButtonFactoriesOptions {
  onSettingsClick?: () => void;
  onScanClick?: () => void;
  isScanning?: boolean;
  isLocating?: boolean;
  onLocateStart?: () => void;
  onLocateEnd?: () => void;
}

export function createDefaultButtons(
  mapRef: React.MutableRefObject<MapRef | null>,
  options: DefaultButtonFactoriesOptions = {}
): MapControlButtonConfig[] {
  const {
    onSettingsClick,
    onScanClick,
    isScanning = false,
    isLocating = false,
    onLocateStart,
    onLocateEnd,
  } = options;

  const handleLocate = useCallback(() => {
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
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not get your location');
        onLocateEnd?.();
      }
    );
  }, [mapRef, onLocateStart, onLocateEnd]);

  const handleResetBearing = useCallback(() => {
    mapRef.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 1000,
    });
  }, [mapRef]);

  return [
    {
      id: 'scan',
      icon: <Radar className="h-5 w-5" />,
      label: 'Scan this area',
      variant: 'default',
      onClick: onScanClick ?? (() => {}),
      disabled: isScanning,
      show: false,
      order: 1,
      className: 'bg-orange-500 border-orange-500 hover:bg-orange-600 text-white',
      renderIcon: (icon) => (
        <span className={isScanning ? 'animate-spin' : ''}>{icon}</span>
      ),
    },
    {
      id: 'settings',
      icon: <Settings2 className="h-5 w-5" />,
      label: 'Open map controls',
      onClick: onSettingsClick ?? (() => {}),
      show: false,
      order: 2,
    },
    {
      id: 'locate',
      icon: <Navigation className="h-5 w-5 fill-current" />,
      label: 'Locate me',
      onClick: handleLocate,
      disabled: isLocating,
      show: true,
      order: 3,
      renderIcon: (icon) => (
        <span className={isLocating ? 'animate-pulse' : ''}>{icon}</span>
      ),
    },
    {
      id: 'compass',
      icon: <Compass className="h-5 w-5" />,
      label: 'Reset bearing',
      onClick: handleResetBearing,
      show: true,
      order: 4,
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
  isLocating?: boolean;
  onLocateStart?: () => void;
  onLocateEnd?: () => void;
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
  isLocating = false,
  onLocateStart,
  onLocateEnd,
  useDefaultButtons = true,
}: CustomNavigationControlsProps) {
  const defaultButtons = useDefaultButtons
    ? createDefaultButtons(mapRef, {
        onSettingsClick,
        onScanClick,
        isScanning,
        isLocating,
        onLocateStart,
        onLocateEnd,
      })
    : [];

  const configuredDefaults = defaultButtons.map((btn) => {
    switch (btn.id) {
      case 'compass':
        return { ...btn, show: showCompass };
      case 'locate':
        return { ...btn, show: showLocate, disabled: isLocating };
      case 'settings':
        return { ...btn, show: showSettings };
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
      className={cn(layoutStyles[layout], className)}
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
