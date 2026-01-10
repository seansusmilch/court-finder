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

// ============================================================================
// Button Component
// ============================================================================

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

// ============================================================================
// Default Button Factories
// ============================================================================

export interface DefaultButtonFactoriesOptions {
  onSettingsClick?: () => void;
  onScanClick?: () => void;
  isScanning?: boolean;
}

export function createDefaultButtons(
  mapRef: React.MutableRefObject<MapRef | null>,
  options: DefaultButtonFactoriesOptions = {}
): MapControlButtonConfig[] {
  const { onSettingsClick, onScanClick, isScanning = false } = options;

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
        <span className={isScanning ? 'animate-pulse' : ''}>{icon}</span>
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
      show: true,
      order: 3,
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

// ============================================================================
// Main Controls Container
// ============================================================================

export interface CustomNavigationControlsProps {
  mapRef: React.MutableRefObject<MapRef | null>;
  className?: string;
  // Layout options
  layout?: MapControlLayout;
  position?: MapControlPosition;
  // Button configuration
  buttons?: MapControlButtonConfig[];
  // Convenience props for common buttons
  showCompass?: boolean;
  showLocate?: boolean;
  showSettings?: boolean;
  showScan?: boolean;
  onSettingsClick?: () => void;
  onScanClick?: () => void;
  isScanning?: boolean;
  // Advanced: override default button factories
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
  useDefaultButtons = true,
}: CustomNavigationControlsProps) {
  // Create default buttons (or use custom factory)
  const defaultButtons = useDefaultButtons
    ? createDefaultButtons(mapRef, {
        onSettingsClick,
        onScanClick,
        isScanning,
      })
    : [];

  // Override show flags for default buttons based on props
  const configuredDefaults = defaultButtons.map((btn) => {
    switch (btn.id) {
      case 'compass':
        return { ...btn, show: showCompass };
      case 'locate':
        return { ...btn, show: showLocate };
      case 'settings':
        return { ...btn, show: showSettings };
      case 'scan':
        return { ...btn, show: showScan, disabled: isScanning };
      default:
        return btn;
    }
  });

  // Merge custom buttons with defaults (custom buttons take precedence)
  const buttonMap = new Map(
    [...configuredDefaults, ...(customButtons ?? [])].map((btn) => [btn.id, btn])
  );

  // Sort by order if provided, then filter hidden buttons
  const buttons = sortSections(
    Array.from(buttonMap.values()).filter((btn) => btn.show !== false)
  );

  // Layout styles
  const layoutStyles: Record<MapControlLayout, string> = {
    vertical: 'flex flex-col gap-2',
    horizontal: 'flex flex-row gap-2',
    grid: 'grid grid-cols-2 gap-2',
  };

  // Position styles (if provided)
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

// ============================================================================
// Preset Configurations
// ============================================================================

export namespace MapControlPresets {
  /**
   * Standard navigation controls (compass + locate)
   */
  export function standard(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).filter(
      (btn) => btn.id === 'compass' || btn.id === 'locate'
    );
  }

  /**
   * Full navigation controls (compass + locate + settings)
   */
  export function withSettings(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).map((btn) =>
      btn.id === 'settings' ? { ...btn, show: true } : btn
    );
  }

  /**
   * Scan controls (locate + scan)
   */
  export function scanMode(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options)
      .filter((btn) => btn.id === 'locate' || btn.id === 'scan')
      .map((btn) => (btn.id === 'scan' ? { ...btn, show: true } : btn));
  }

  /**
   * Minimal controls (compass only)
   */
  export function minimal(
    mapRef: React.MutableRefObject<MapRef | null>,
    options?: DefaultButtonFactoriesOptions
  ): MapControlButtonConfig[] {
    return createDefaultButtons(mapRef, options).filter(
      (btn) => btn.id === 'compass'
    );
  }
}
