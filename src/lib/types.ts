// Court feature types for map components
export interface CourtFeatureProperties {
  // Core prediction data
  class: string;
  class_id: number;
  confidence: number;
  detection_id: string;

  // Tile coordinates
  z: number;
  x: number;
  y: number;

  // Model information
  model: string;
  version: string;

  // Optional zoom level information
  zoom_level?: number;

  // Allow additional properties from the convex query
  [key: string]: unknown;
}

// GeoJSON feature types
export interface GeoJSONPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: CourtFeatureProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONPointFeature[];
}

// Selected pin state
export interface SelectedPin {
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
}

// Map view state
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

// Bounding box for viewport queries
export interface ViewportBbox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

// Court image data for satellite tile display
export interface CourtImageData {
  tileZ: number;
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
  tileUrl: string;
  class: string;
  confidence: number;
}

// Adjacent tile info for stitching
export interface AdjacentTile {
  z: number;
  x: number;
  y: number;
  url: string;
  offsetX: number; // Position in stitched canvas (x offset)
  offsetY: number; // Position in stitched canvas (y offset)
}
