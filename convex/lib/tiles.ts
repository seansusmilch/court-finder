import type { RoboflowPrediction } from './roboflow';
import { MAPBOX_TILE_DEFAULTS } from './constants';

export type TileCoordinate = {
  z: number;
  x: number;
  y: number;
};

export type LngLatBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ViewportBbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/**
 * Convert longitude to tile X coordinate at given zoom level
 */
function lon2tileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

/**
 * Convert latitude to tile Y coordinate at given zoom level
 */
function lat2tileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
  );
}

/**
 * Clamp latitude to Web Mercator limits
 */
function clampLat(lat: number): number {
  // Web Mercator max latitude
  return Math.max(Math.min(lat, 85.05112878), -85.05112878);
}

/**
 * Convert a point (lat, lon) to tile coordinates at given zoom level
 */
export function pointToTile(
  lat: number,
  lon: number,
  zoom = MAPBOX_TILE_DEFAULTS.zoom
): TileCoordinate {
  const clampedLat = clampLat(lat);
  return {
    x: lon2tileX(lon, zoom),
    y: lat2tileY(clampedLat, zoom),
    z: zoom,
  };
}

/**
 * Generate Mapbox style tile URL
 */
export function styleTileUrl(
  z: number,
  x: number,
  y: number,
  opts?: Partial<{
    username: string;
    styleId: string;
    tileSize: 256 | 512;
    accessToken: string;
  }>
): string {
  const { username, styleId, tileSize, accessToken } = {
    ...MAPBOX_TILE_DEFAULTS,
    ...opts,
  };
  if (!accessToken) throw new Error('Mapbox access token is required');
  return `https://api.mapbox.com/styles/v1/${username}/${styleId}/tiles/${tileSize}/${z}/${x}/${y}@2x?access_token=${accessToken}`;
}

/**
 * Generate all tiles in a radius around a center tile
 */
export function tilesInRadiusFromTile(
  center: TileCoordinate,
  radius: number,
  opts?: Partial<{
    username: string;
    styleId: string;
    tileSize: 256 | 512;
    accessToken: string;
  }>
) {
  const { z, x: centerX, y: centerY } = center;
  const maxTile = Math.pow(2, z) - 1;
  const tiles: Array<TileCoordinate & { url: string }> = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = centerX + dx;
      const y = centerY + dy;

      if (x < 0 || x > maxTile || y < 0 || y > maxTile) continue;

      tiles.push({
        z,
        x,
        y,
        url: styleTileUrl(z, x, y, opts),
      });
    }
  }

  return {
    zoom: z,
    tiles,
    cols: radius * 2 + 1,
    rows: radius * 2 + 1,
  };
}

/**
 * Convenience: generate tiles in a radius from a center point (lat/lon)
 */
export function tilesInRadiusFromPoint(
  lat: number,
  lon: number,
  radius: number,
  zoom = MAPBOX_TILE_DEFAULTS.zoom,
  opts?: Partial<{
    username: string;
    styleId: string;
    tileSize: 256 | 512;
    accessToken: string;
  }>
) {
  const center = pointToTile(lat, lon, zoom);
  return tilesInRadiusFromTile(center, radius, opts);
}

/**
 * Compute geographic bounds (west, south, east, north) for a tile z/x/y
 */
export function tileToLngLatBounds(
  z: number,
  x: number,
  y: number
): LngLatBounds {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y / n))));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ((y + 1) / n))));
  const north = (northRad * 180) / Math.PI;
  const south = (southRad * 180) / Math.PI;
  return { west, south, east, north };
}

/**
 * Given a pixel position within a downloaded tile image, convert to lon/lat.
 * The downloaded image may be larger than the base tile size (e.g., 512@2x → 1024).
 */
export function pixelOnTileToLngLat(
  z: number,
  x: number,
  y: number,
  px: number,
  py: number,
  imageW: number,
  imageH: number,
  basePx: 256 | 512 = MAPBOX_TILE_DEFAULTS.tileSize
): { lon: number; lat: number } {
  const n = Math.pow(2, z);
  const pxBase = (px * basePx) / imageW;
  const pyBase = (py * basePx) / imageH;
  const tileFracX = (x + pxBase / basePx) / n;
  const tileFracY = (y + pyBase / basePx) / n;
  const lon = tileFracX * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileFracY)));
  const lat = (latRad * 180) / Math.PI;
  return { lon, lat };
}

export type GeoJSONPointFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export type GeoJSONPolygonFeature = {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  properties: Record<string, unknown>;
};

/**
 * Convert a Roboflow prediction into GeoJSON features w.r.t. tile z/x/y and image size.
 * Returns a Point feature for the center and, optionally, a Polygon for the bbox.
 */
export function predictionToFeature(
  z: number,
  x: number,
  y: number,
  prediction: RoboflowPrediction,
  imageW: number,
  imageH: number,
  opts?: { includePolygon?: boolean; basePx?: 256 | 512 }
): { point: GeoJSONPointFeature; polygon?: GeoJSONPolygonFeature } {
  const { includePolygon = false, basePx = MAPBOX_TILE_DEFAULTS.tileSize } =
    opts || {};

  const { x: px, y: py, width, height } = prediction;
  const { lon, lat } = pixelOnTileToLngLat(
    z,
    x,
    y,
    px,
    py,
    imageW,
    imageH,
    basePx
  );

  const properties: Record<string, unknown> = {
    z,
    x,
    y,
    class: prediction.class,
    class_id: prediction.class_id,
    confidence: prediction.confidence,
    detection_id: prediction.detection_id,
  };

  const point: GeoJSONPointFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties,
  };

  if (!includePolygon) {
    return { point };
  }

  // Compute bbox polygon corners using the same normalization
  const left = px - width / 2;
  const right = px + width / 2;
  const top = py - height / 2;
  const bottom = py + height / 2;
  const nw = pixelOnTileToLngLat(z, x, y, left, top, imageW, imageH, basePx);
  const ne = pixelOnTileToLngLat(z, x, y, right, top, imageW, imageH, basePx);
  const se = pixelOnTileToLngLat(
    z,
    x,
    y,
    right,
    bottom,
    imageW,
    imageH,
    basePx
  );
  const sw = pixelOnTileToLngLat(z, x, y, left, bottom, imageW, imageH, basePx);
  const polygon: GeoJSONPolygonFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [nw.lon, nw.lat],
          [ne.lon, ne.lat],
          [se.lon, se.lat],
          [sw.lon, sw.lat],
          [nw.lon, nw.lat],
        ],
      ],
    },
    properties,
  };
  return { point, polygon };
}

/**
 * Enumerate all tiles that intersect a bbox at a given zoom.
 * Handles dateline crossing by splitting if minLng > maxLng.
 */
export function tilesIntersectingBbox(
  bbox: ViewportBbox,
  zoom: number
): TileCoordinate[] {
  const parts: Array<{
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  }> = [];
  if (bbox.minLng <= bbox.maxLng) {
    parts.push(bbox);
  } else {
    // Dateline crossing: split into two ranges
    parts.push({
      minLat: bbox.minLat,
      minLng: -180,
      maxLat: bbox.maxLat,
      maxLng: bbox.maxLng,
    });
    parts.push({
      minLat: bbox.minLat,
      minLng: bbox.minLng,
      maxLat: bbox.maxLat,
      maxLng: 180,
    });
  }

  const tiles: TileCoordinate[] = [];
  for (const part of parts) {
    const minY = lat2tileY(clampLat(part.maxLat), zoom); // north
    const maxY = lat2tileY(clampLat(part.minLat), zoom); // south
    const minX = lon2tileX(part.minLng, zoom);
    const maxX = lon2tileX(part.maxLng, zoom);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
  }
  return tiles;
}
