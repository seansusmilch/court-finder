import {
  pointToTile,
  styleTileUrl,
  MAPBOX_TILE_DEFAULTS,
} from './mapbox-fetch-satellite-tiles';

type TileUrl = { z: number; x: number; y: number; url: string };

export function getTileUrlsForZooms(
  latitude: number,
  longitude: number,
  zoomLevels: number[],
  accessToken = process.env.MAPBOX_API_KEY ?? MAPBOX_TILE_DEFAULTS.accessToken
): TileUrl[] {
  if (!accessToken) {
    throw new Error('MAPBOX_API_KEY is not set in the environment');
  }

  return zoomLevels.map((z) => {
    const { x, y } = pointToTile(latitude, longitude, z);
    const url = styleTileUrl(z, x, y, { accessToken });
    return { z, x, y, url };
  });
}

function parseZooms(arg?: string): number[] {
  if (!arg || arg.trim() === '') {
    return [12, 13, 14, 15, 16, 17, 18];
  }
  const trimmed = arg.trim();
  if (/^\d+-\d+$/.test(trimmed)) {
    const [startStr, endStr] = trimmed.split('-');
    const start = Number(startStr);
    const end = Number(endStr);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      throw new Error(`Invalid zoom range: "${arg}"`);
    }
    const levels: number[] = [];
    for (let z = start; z <= end; z++) levels.push(z);
    return levels;
  }
  if (/^\d+(,\d+)*$/.test(trimmed)) {
    return trimmed.split(',').map((z) => Number(z));
  }
  const single = Number(trimmed);
  if (Number.isFinite(single)) return [single];
  throw new Error(`Could not parse zoom levels from: "${arg}"`);
}

function main() {
  const [, , latArg, lonArg, zoomArg] = process.argv;
  const latitude = latArg ? Number(latArg) : 44.899547;
  // Default: St. Paul
  const longitude = lonArg ? Number(lonArg) : -93.098951;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.error('Latitude and longitude must be numbers');
    process.exit(1);
  }

  let zooms: number[];
  try {
    zooms = parseZooms(zoomArg);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
    return;
  }

  const token = process.env.MAPBOX_API_KEY ?? MAPBOX_TILE_DEFAULTS.accessToken;
  if (!token) {
    console.error('Missing MAPBOX_API_KEY in environment');
    process.exit(1);
  }

  const results = getTileUrlsForZooms(latitude, longitude, zooms, token);

  console.log(`Point: lat=${latitude}, lon=${longitude}`);
  for (const { z, x, y, url } of results) {
    console.log(`z=${z} x=${x} y=${y} -> ${url}`);
  }
}

if (require.main === module) {
  main();
}
