import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import {
  MAP_STYLE_SATELLITE,
  MAP_STYLE_STANDARD_LIGHT,
  MAP_STYLE_STANDARD_DARK,
} from '@/lib/constants';

interface MapStyleControlProps {
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
}

export function MapStyleControl({
  mapStyle,
  onMapStyleChange,
}: MapStyleControlProps) {
  const { theme, resolvedTheme } = useTheme();
  const isSatellite = mapStyle === MAP_STYLE_SATELLITE;

  // Update map style when theme changes if satellite is off
  useEffect(() => {
    if (isSatellite) return; // Don't change if satellite is on

    const effectiveTheme = resolvedTheme || theme;
    if (effectiveTheme === 'dark') {
      onMapStyleChange(MAP_STYLE_STANDARD_DARK);
    } else {
      onMapStyleChange(MAP_STYLE_STANDARD_LIGHT);
    }
  }, [theme, resolvedTheme, isSatellite, onMapStyleChange]);

  const handleStyleChange = (isSatellite: boolean) => {
    if (isSatellite) {
      onMapStyleChange(MAP_STYLE_SATELLITE);
    } else {
      // Use the current theme to determine which standard style to use
      const effectiveTheme = resolvedTheme || theme;
      onMapStyleChange(
        effectiveTheme === 'dark'
          ? MAP_STYLE_STANDARD_DARK
          : MAP_STYLE_STANDARD_LIGHT
      );
    }
  };

  return (
    <div className='flex items-center justify-between'>
      <Label htmlFor='map-style-switch'>Satellite View</Label>
      <Switch
        id='map-style-switch'
        checked={isSatellite}
        onCheckedChange={handleStyleChange}
      />
    </div>
  );
}
