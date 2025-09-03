// Map rendering thresholds
export const PINS_VISIBLE_FROM_ZOOM = 12;

// Map defaults
export const DEFAULT_MAP_CENTER: [number, number] = [-87.6952, 41.9442];
export const DEFAULT_MAP_ZOOM = 15;
export const MAP_STYLE_SATELLITE = 'mapbox://styles/mapbox/standard-satellite';
export const MAP_STYLE_STANDARD = 'mapbox://styles/mapbox/standard';

// Clustering
export const CLUSTER_MAX_ZOOM = 13;
export const CLUSTER_RADIUS = 50;

// Search / geocoding (Mapbox SearchBox handles querying internally)
export const SEARCH_FLY_TO_ZOOM = 14;
export const FLY_TO_DURATION_MS = 800;

// Confidence slider
export const CONFIDENCE_SLIDER_STEP = 0.1;

// Navigation
export const NAVIGATION_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Map' },
  { to: '/scans', label: 'Scans' },
  { to: '/training', label: 'Training' },
  { to: '/training-data', label: 'Training Data' },
] as const;

// Visuals for court classes (emoji + explicit Tailwind classes)
export type CourtClassVisual = {
  emoji: string;
  bgClass: string;
  borderTopClass: string;
  displayName: string;
};

export const COURT_CLASS_VISUALS: Record<string, CourtClassVisual> = {
  'basketball-court': {
    emoji: '🏀',
    bgClass: 'bg-gray-300',
    borderTopClass: 'border-t-gray-300',
    displayName: 'Basketball Court',
  },
  'tennis-court': {
    emoji: '🎾',
    bgClass: 'bg-green-300',
    borderTopClass: 'border-t-green-300',
    displayName: 'Tennis Court',
  },
  'soccer-ball-field': {
    emoji: '⚽',
    bgClass: 'bg-red-300',
    borderTopClass: 'border-t-red-300',
    displayName: 'Soccer/Football Field',
  },
  'baseball-diamond': {
    emoji: '⚾',
    bgClass: 'bg-yellow-300',
    borderTopClass: 'border-t-yellow-300',
    displayName: 'Baseball Field',
  },
  'ground-track-field': {
    emoji: '🏃',
    bgClass: 'bg-blue-300',
    borderTopClass: 'border-t-blue-300',
    displayName: 'Track & Field',
  },
  'swimming-pool': {
    emoji: '🏊',
    bgClass: 'bg-cyan-300',
    borderTopClass: 'border-t-cyan-300',
    displayName: 'Swimming Pool',
  },
};

export function getVisualForClass(predictionClass: string): CourtClassVisual {
  return (
    COURT_CLASS_VISUALS[predictionClass] || {
      emoji: '❓',
      bgClass: 'bg-blue-500',
      borderTopClass: 'border-t-blue-500',
      displayName: `${predictionClass
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())}`,
    }
  );
}

// Mapbox API configuration
export const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;
