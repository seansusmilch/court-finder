export const MAPBOX_DEFAULTS = {
  username: 'mapbox',
  styleId: 'satellite-v9',
  zoom: 15,
  bearing: 0,
  pitch: 0,
  width: 640,
  height: 640,
} as const;

export interface MapboxStaticImageOptions {
  center?: {
    longitude: number;
    latitude: number;
  };
  bbox?: {
    minLat: number;
    minLong: number;
    maxLat: number;
    maxLong: number;
  };
  view?: {
    zoom?: number;
    bearing?: number;
    pitch?: number;
  };
  size?: {
    width?: number;
    height?: number;
    retina?: boolean;
  };
  style?: {
    username?: string;
    styleId?: string;
    overlay?: string;
  };
  advanced?: {
    auto?: boolean;
  };
  // required: pass the access token explicitly from the caller (Convex env)
  accessToken: string;
}

function validateOptions(options: MapboxStaticImageOptions): void {
  const { center, bbox, accessToken } = options;
  if (!accessToken) {
    throw new Error('Mapbox access token is required');
  }
  if (!center && !bbox) {
    throw new Error('Either center or bbox must be provided');
  }
  if (center && bbox) {
    throw new Error(
      'Cannot provide both center and bbox - use one or the other'
    );
  }
}

function buildCenterCoordinates(
  center: { longitude: number; latitude: number },
  view: { zoom?: number; bearing?: number; pitch?: number }
): string {
  const { longitude, latitude } = center;
  const {
    zoom = MAPBOX_DEFAULTS.zoom,
    bearing = MAPBOX_DEFAULTS.bearing,
    pitch = MAPBOX_DEFAULTS.pitch,
  } = view;
  return `${longitude},${latitude},${zoom},${bearing},${pitch}`;
}

function buildBboxCoordinates(bbox: {
  minLat: number;
  minLong: number;
  maxLat: number;
  maxLong: number;
}): string {
  const { minLong, minLat, maxLong, maxLat } = bbox;
  return `[${minLong},${minLat},${maxLong},${maxLat}]`;
}

function buildBaseUrl(style: {
  username?: string;
  styleId?: string;
  overlay?: string;
}): string {
  const {
    username = MAPBOX_DEFAULTS.username,
    styleId = MAPBOX_DEFAULTS.styleId,
    overlay,
  } = style;
  const baseUrl = `https://api.mapbox.com/styles/v1/${username}/${styleId}/static`;
  const overlayPath = overlay ? `/${overlay}` : '';
  return `${baseUrl}${overlayPath}`;
}

function buildDimensions(size: {
  width?: number;
  height?: number;
  retina?: boolean;
}): string {
  const {
    width = MAPBOX_DEFAULTS.width,
    height = MAPBOX_DEFAULTS.height,
    retina = false,
  } = size;
  return `/${width}x${height}${retina ? '@2x' : ''}`;
}

function buildBounds(auto: boolean): string {
  return auto ? '|auto' : '';
}

export function generateMapboxStaticImageUrl(
  options: MapboxStaticImageOptions
): string {
  const {
    center,
    bbox,
    view = {},
    size = {},
    style = {},
    advanced = {},
    accessToken,
  } = options;
  validateOptions(options);
  const baseUrl = buildBaseUrl(style);
  const dimensions = buildDimensions(size);
  const bounds = buildBounds(advanced.auto || false);
  const auth = `?access_token=${accessToken}`;
  const coordinates = center
    ? buildCenterCoordinates(center, view)
    : buildBboxCoordinates(bbox!);
  return `${baseUrl}/${coordinates}${bounds}${dimensions}${auth}`;
}
