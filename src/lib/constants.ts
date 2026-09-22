import { env } from "@/env";

// Map rendering thresholds
export const PINS_VISIBLE_FROM_ZOOM = 10;

// Map defaults
export const DEFAULT_MAP_CENTER: [number, number] = [-93.09, 44.9537];
export const DEFAULT_MAP_ZOOM = 15;
export const MAP_STYLE_SATELLITE = 'mapbox://styles/mapbox/standard-satellite';
export const MAP_STYLE_STANDARD_LIGHT = 'mapbox://styles/mapbox/standard';
export const MAP_STYLE_STANDARD_DARK = 'mapbox://styles/mapbox/dark-v11';

// Clustering
export const CLUSTER_MAX_ZOOM = 12;
export const CLUSTER_RADIUS = 50;

// Search / geocoding (Mapbox SearchBox handles querying internally)
export const SEARCH_FLY_TO_ZOOM = 14;
export const FLY_TO_DURATION_MS = 800;

// Confidence slider
export const CONFIDENCE_SLIDER_STEP = 0.1;

// Navigation
export const NAVIGATION_LINKS = [
  { to: '/map', label: 'Map' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/admin', label: 'Admin' },
] as const;

// Visuals for court classes and their semantic color ramps.
export type CourtClassVisual = {
  /** Emoji used across compact map and feedback surfaces. */
  emoji: string;
  bgClass: string;
  borderClass: string;
  displayName: string;
  colorLight: string; // OKLCH color for light mode
  colorDark: string; // OKLCH color for dark mode
  colorLightMuted: string; // Muted variant for light mode
  colorDarkMuted: string; // Muted variant for dark mode
};

export const COURT_CLASS_VISUALS: Record<string, CourtClassVisual> = {
  'basketball-court': {
    emoji: '🏀',
    bgClass: 'bg-primary',
    borderClass: 'border-primary',
    displayName: 'Basketball Court',
    colorLight: 'oklch(0.68 0.19 35)',
    colorDark: 'oklch(0.72 0.21 35)',
    colorLightMuted: 'oklch(0.63 0.07 35)',
    colorDarkMuted: 'oklch(0.58 0.06 35)',
  },
  'tennis-court': {
    emoji: '🎾',
    bgClass: 'bg-primary',
    borderClass: 'border-primary',
    displayName: 'Tennis Court',
    colorLight: 'oklch(0.68 0.19 35)',
    colorDark: 'oklch(0.72 0.21 35)',
    colorLightMuted: 'oklch(0.63 0.07 35)',
    colorDarkMuted: 'oklch(0.58 0.06 35)',
  },
  'soccer-ball-field': {
    emoji: '⚽',
    bgClass: 'bg-primary',
    borderClass: 'border-primary',
    displayName: 'Soccer/Football Field',
    colorLight: 'oklch(0.68 0.19 35)',
    colorDark: 'oklch(0.72 0.21 35)',
    colorLightMuted: 'oklch(0.63 0.07 35)',
    colorDarkMuted: 'oklch(0.58 0.06 35)',
  },
  'baseball-diamond': {
    emoji: '⚾',
    bgClass: 'bg-primary',
    borderClass: 'border-primary',
    displayName: 'Baseball Field',
    colorLight: 'oklch(0.68 0.19 35)',
    colorDark: 'oklch(0.72 0.21 35)',
    colorLightMuted: 'oklch(0.63 0.07 35)',
    colorDarkMuted: 'oklch(0.58 0.06 35)',
  },
  'ground-track-field': {
    emoji: '🏃',
    bgClass: 'bg-primary',
    borderClass: 'border-primary',
    displayName: 'Track & Field',
    colorLight: 'oklch(0.68 0.19 35)',
    colorDark: 'oklch(0.72 0.21 35)',
    colorLightMuted: 'oklch(0.63 0.07 35)',
    colorDarkMuted: 'oklch(0.58 0.06 35)',
  },
};

export function getVisualForClass(predictionClass: string): CourtClassVisual {
  return (
    COURT_CLASS_VISUALS[predictionClass] || {
      emoji: '•',
      bgClass: 'bg-primary',
      borderClass: 'border-primary',
      displayName: `${predictionClass
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())}`,
      colorLight: 'oklch(0.68 0.19 35)',
      colorDark: 'oklch(0.72 0.21 35)',
      colorLightMuted: 'oklch(0.63 0.07 35)',
      colorDarkMuted: 'oklch(0.58 0.06 35)',
    }
  );
}

// Mapbox API configuration
export const MAPBOX_API_KEY = env.VITE_MAPBOX_API_KEY;

// localStorage keys
export const LOCALSTORAGE_KEYS = {
  MAP_VIEW_STATE: 'map.viewState',
  MAP_SETTINGS: 'map.settings',
  ADMIN_REVIEW_ADVANCED_VIEW: 'admin-review-advanced-view',
  ADMIN_REVIEW_SELECTED_CLASSES: 'admin-review-selected-classes',
  ADMIN_REVIEW_SELECTED_ZOOM_LEVELS: 'admin-review-selected-zoom-levels',
} as const;
