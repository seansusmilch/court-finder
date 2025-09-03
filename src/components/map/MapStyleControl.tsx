import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MAP_STYLE_SATELLITE, MAP_STYLE_STANDARD } from '@/lib/constants';

interface MapStyleControlProps {
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
}

export function MapStyleControl({
  mapStyle,
  onMapStyleChange,
}: MapStyleControlProps) {
  const isSatellite = mapStyle === MAP_STYLE_SATELLITE;

  const handleStyleChange = (isSatellite: boolean) => {
    const newStyle = isSatellite ? MAP_STYLE_SATELLITE : MAP_STYLE_STANDARD;
    onMapStyleChange(newStyle);
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
