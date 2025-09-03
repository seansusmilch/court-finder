
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MapStyleControlProps {
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
}

export function MapStyleControl({ mapStyle, onMapStyleChange }: MapStyleControlProps) {
  const isSatellite = mapStyle.includes('satellite');

  const handleStyleChange = (isSatellite: boolean) => {
    const newStyle = isSatellite ? 'mapbox://styles/mapbox/standard-satellite' : 'mapbox://styles/mapbox/standard';
    onMapStyleChange(newStyle);
  };

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="map-style-switch">Satellite View</Label>
      <Switch
        id="map-style-switch"
        checked={isSatellite}
        onCheckedChange={handleStyleChange}
      />
    </div>
  );
}
