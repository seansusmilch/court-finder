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
export const ROBOFLOW_MODEL_VERSION = '4';

// Map tile coverage configuration
export const DEFAULT_TILE_RADIUS_KM = 1;

// Environment variable names used by backend actions
export const ENV_VARS = {
  MAPBOX_API_KEY: 'MAPBOX_API_KEY',
  ROBOFLOW_API_KEY: 'ROBOFLOW_API_KEY',
} as const;
