// Map rendering thresholds
export const PINS_VISIBLE_FROM_ZOOM = 12;

// Map defaults
export const DEFAULT_MAP_CENTER: [number, number] = [-87.6952, 41.9442];
export const DEFAULT_MAP_ZOOM = 15;
export const MAP_STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-v9';

// Clustering
export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_RADIUS = 50;

// Search / geocoding (Mapbox SearchBox handles querying internally)
export const SEARCH_FLY_TO_ZOOM = 14;
export const FLY_TO_DURATION_MS = 800;

// Inference
export const INFER_MODEL = 'satellite-sports-facilities-bubrg';
export const INFER_VERSION = '4';

// Confidence slider
export const CONFIDENCE_SLIDER_STEP = 0.1;

// Navigation
export const NAVIGATION_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Map' },
  { to: '/scans', label: 'Scans' },
] as const;

// Visuals for court classes (emoji + tailwind color token e.g. "orange-500")
export type CourtClassVisual = { emoji: string; color: string };

export const COURT_CLASS_VISUALS: Record<string, CourtClassVisual> = {
  'basketball-court': { emoji: '🏀', color: 'orange-500' },
  'tennis-court': { emoji: '🎾', color: 'green-500' },
  'soccer-ball-field': { emoji: '⚽', color: 'emerald-500' },
  'baseball-diamond': { emoji: '⚾', color: 'red-500' },
  'ground-track-field': { emoji: '🏃', color: 'amber-500' },
  'swimming-pool': { emoji: '🏊', color: 'cyan-500' },
};

export function getVisualForClass(predictionClass: string): CourtClassVisual {
  return (
    COURT_CLASS_VISUALS[predictionClass] || { emoji: '🏟️', color: 'blue-500' }
  );
}
