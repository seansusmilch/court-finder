export const MAPBOX_DEFAULTS = {
  username: 'mapbox',
  styleId: 'satellite-v9',
  zoom: 15,
  bearing: 0,
  pitch: 0,
  width: 640,
  height: 640,
  accessToken: process.env.MAPBOX_API_KEY,
};

interface MapboxStaticImageOptions {
  // Required: Either center coordinates OR bounding box (but not both)
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

  // Optional: Map view settings (only used with center)
  view?: {
    zoom?: number;
    bearing?: number;
    pitch?: number;
  };

  // Optional: Image dimensions
  size?: {
    width?: number;
    height?: number;
    retina?: boolean;
  };

  // Optional: Map style and overlays
  style?: {
    username?: string;
    styleId?: string;
    overlay?: string;
  };

  // Optional: Advanced options
  advanced?: {
    auto?: boolean;
  };

  // Optional: Override access token
  accessToken?: string;
}

// Helper function to validate input options
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

// Helper function to build center-based coordinates string
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

// Helper function to build bounding box coordinates string
function buildBboxCoordinates(bbox: {
  minLat: number;
  minLong: number;
  maxLat: number;
  maxLong: number;
}): string {
  const { minLong, minLat, maxLong, maxLat } = bbox;
  return `[${minLong},${minLat},${maxLong},${maxLat}]`;
}

// Helper function to build the base URL components
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

// Helper function to build dimensions string
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

// Helper function to build bounds string
function buildBounds(auto: boolean): string {
  return auto ? '|auto' : '';
}

export function generateMapboxStaticImageUrl(
  options: MapboxStaticImageOptions
): string {
  // Extract and validate options
  const {
    center,
    bbox,
    view = {},
    size = {},
    style = {},
    advanced = {},
    accessToken = MAPBOX_DEFAULTS.accessToken,
  } = options;

  // Validate input
  validateOptions({ ...options, accessToken });

  // Build URL components
  const baseUrl = buildBaseUrl(style);
  const dimensions = buildDimensions(size);
  const bounds = buildBounds(advanced.auto || false);
  const auth = `?access_token=${accessToken}`;

  // Build coordinates based on input type
  let coordinates: string;
  if (center) {
    coordinates = buildCenterCoordinates(center, view);
  } else {
    coordinates = buildBboxCoordinates(bbox!);
  }

  // Combine all parts
  return `${baseUrl}/${coordinates}${bounds}${dimensions}${auth}`;
}

if (require.main === module) {
  // Example with center
  const centerImageUrl = generateMapboxStaticImageUrl({
    center: {
      latitude: 41.9442,
      longitude: -87.6952,
    },
  });

  console.log('Center-based URL:', centerImageUrl);

  // Example with bounding box
  const bboxImageUrl = generateMapboxStaticImageUrl({
    bbox: {
      minLat: 41.94,
      minLong: -87.7,
      maxLat: 41.95,
      maxLong: -87.69,
    },
  });

  console.log('Bounding box URL:', bboxImageUrl);
}
