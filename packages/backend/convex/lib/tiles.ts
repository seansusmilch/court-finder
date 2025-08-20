export const MAPBOX_TILE_DEFAULTS = {
  username: 'mapbox',
  styleId: 'satellite-v9',
  tileSize: 512 as 256 | 512,
  zoom: 15,
} as const;

export type TileCoordinate = {
  z: number;
  x: number;
  y: number;
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
