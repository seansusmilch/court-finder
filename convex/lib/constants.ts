// Environment variable names used by backend actions
export const ENV_VARS = {
  MAPBOX_API_KEY: 'MAPBOX_API_KEY',
  ROBOFLOW_API_KEY: 'ROBOFLOW_API_KEY',
  ROBOFLOW_BATCH: 'ROBOFLOW_BATCH',
} as const;

export const PERMISSIONS = {
  SCANS: {
    PREFIX: 'scans',
    READ: 'scans.read',
    WRITE: 'scans.write',
    EXECUTE: 'scans.execute',
  },
  TRAINING: {
    PREFIX: 'training',
    READ: 'training.read',
    WRITE: 'training.write',
  },
  ADMIN: {
    PREFIX: 'admin',
    ACCESS: 'admin.access',
  },
};

export const DEFAULT_USER_PERMISSIONS = [
  PERMISSIONS.SCANS.READ,
  PERMISSIONS.SCANS.WRITE,
  PERMISSIONS.SCANS.EXECUTE,
  PERMISSIONS.TRAINING.READ,
  PERMISSIONS.TRAINING.WRITE,
];

export const DEFAULT_ANONYMOUS_PERMISSIONS = [
  PERMISSIONS.SCANS.READ,
  PERMISSIONS.TRAINING.READ,
];

// Roboflow model configuration
export const ROBOFLOW_MODEL_NAME = 'satellite-sports-facilities-bubrg';
export const ROBOFLOW_MODEL_VERSION = '10';

// Map tile coverage configuration
export const DEFAULT_TILE_RADIUS = 2;

// Mapbox tile configuration
export const MAPBOX_TILE_DEFAULTS = {
  username: 'mapbox',
  styleId: 'satellite-v9',
  tileSize: 512 as 256 | 512,
  zoom: 16,
} as const;

// Toggle for randomizing prediction feedback
export const RANDOMIZE_PREDICTION_FEEDBACK = true;

// Deduplication configuration
// Base proximity radius used when a class-specific radius isn't defined (meters)
export const MARKER_DEDUP_BASE_RADIUS_M = 20;
// Confidence delta at or below which we consider two confidences a tie
export const MARKER_DEDUP_CONFIDENCE_TIE_EPSILON = 0.05;
// Per-class proximity radius overrides (meters)
export const MARKER_DEDUP_RADIUS_BY_CLASS_M: Record<string, number> = {
  'basketball-court': 10,
  'tennis-court': 8,
  'soccer-ball-field': 16,
  'baseball-diamond': 32,
  'ground-track-field': 16,
};
