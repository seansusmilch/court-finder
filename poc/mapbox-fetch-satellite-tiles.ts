export const MAPBOX_TILE_DEFAULTS = {
  username: 'mapbox',
  styleId: 'satellite-v9',
  tileSize: 512,
  zoom: 15,
  accessToken: process.env.MAPBOX_API_KEY!,
} as const;

export type BBox = {
  minLat: number;
  minLong: number;
  maxLat: number;
  maxLong: number;
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
 * Convert bounding box to tile range at given zoom level
 */
export function bboxToTileRange(bbox: BBox, zoom = MAPBOX_TILE_DEFAULTS.zoom) {
  const minLat = clampLat(bbox.minLat);
  const maxLat = clampLat(bbox.maxLat);
  const minX = lon2tileX(bbox.minLong, zoom);
  const maxX = lon2tileX(bbox.maxLong, zoom);
  const minY = lat2tileY(maxLat, zoom); // note: y grows southward
  const maxY = lat2tileY(minLat, zoom);
  return { zoom, minX, minY, maxX, maxY };
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
  return `https://api.mapbox.com/styles/v1/${username}/${styleId}/tiles/${tileSize}/${z}/${x}/${y}@2x?access_token=${accessToken}`;
}

/**
 * Generate all tiles needed to cover a bounding box at given zoom
 */
export function tilesForBBox(bbox: BBox, zoom = MAPBOX_TILE_DEFAULTS.zoom) {
  const { minX, minY, maxX, maxY } = bboxToTileRange(bbox, zoom);
  const tiles: Array<{ z: number; x: number; y: number; url: string }> = [];

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({
        z: zoom,
        x,
        y,
        url: styleTileUrl(zoom, x, y),
      });
    }
  }

  return {
    zoom,
    tiles,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    bbox: { minX, minY, maxX, maxY },
  };
}

/**
 * Get tile coordinates for a specific point at given zoom
 */
export function pointToTile(
  lat: number,
  lon: number,
  zoom = MAPBOX_TILE_DEFAULTS.zoom
) {
  return {
    x: lon2tileX(lon, zoom),
    y: lat2tileY(lat, zoom),
    z: zoom,
  };
}

/**
 * Get tile bounds in lat/lon coordinates
 */
export function tileToBBox(x: number, y: number, z: number): BBox {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const north =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const south =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;

  return {
    minLong: west,
    maxLong: east,
    minLat: south,
    maxLat: north,
  };
}

if (require.main === module) {
  // Example: Generate tiles for Chicago area
  const chicagoBBox: BBox = {
    minLat: 41.94,
    minLong: -87.7,
    maxLat: 41.95,
    maxLong: -87.69,
  };

  console.log('Chicago bbox:', chicagoBBox);
  const tileCoverage = tilesForBBox(chicagoBBox, 15);
  console.log('Tile coverage:', tileCoverage);

  // Show first few tile URLs
  tileCoverage.tiles.slice(0, 3).forEach((tile) => {
    console.log(`Tile ${tile.z}/${tile.x}/${tile.y}:`, tile.url);
  });
}
