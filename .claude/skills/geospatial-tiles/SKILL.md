---
name: geospatial-tiles
description: Tile coordinate system and geospatial math for this project. Use when working with map tiles, converting between lat/lng and tile coordinates, processing ML predictions, or implementing spatial queries and deduplication.
---

# Geospatial and Tile Coordinate System

This skill documents the Web Mercator tile coordinate system and geospatial utilities used in this project. Understanding these concepts is essential for working with map tiles, ML predictions, and spatial queries.

## Tile Coordinate System

The project uses **Web Mercator** tile coordinates with a z/x/y system:
- **z** (zoom level): Integer from 0-22, determines tile resolution
- **x** (column): Tile column number at zoom level z
- **y** (row): Tile row number at zoom level z

At zoom level z, there are 2^z × 2^z tiles covering the world.

### Default Configuration

- Default zoom level: **16** (defined in `MAPBOX_TILE_DEFAULTS.zoom`)
- Tile size: **512px** at 2x resolution = **1024px** downloaded images
- Mapbox style: `satellite-v9`

## Core Conversion Functions

All tile utilities are in `convex/lib/tiles.ts`.

### Lat/Lng to Tile Coordinates

```typescript
import { pointToTile } from './lib/tiles';

const tile = pointToTile(latitude, longitude, zoom);
// Returns: { z: number, x: number, y: number }
```

If zoom is omitted, uses default zoom level (16).

### Tile to Geographic Bounds

```typescript
import { tileToLngLatBounds } from './lib/tiles';

const bounds = tileToLngLatBounds(z, x, y);
// Returns: { west: number, south: number, east: number, north: number }
```

### Tile Center Point

```typescript
import { tileCenterLatLng } from './lib/tiles';

const center = tileCenterLatLng(z, x, y);
// Returns: { lat: number, lng: number }
```

## Pixel to Geographic Conversion

When working with ML predictions, bounding boxes are in **pixel coordinates** on the tile image. Convert to lat/lng using:

```typescript
import { pixelOnTileToLngLat } from './lib/tiles';

const { lon, lat } = pixelOnTileToLngLat(
  z,           // tile zoom
  x,           // tile x
  y,           // tile y
  px,          // pixel x on image
  py,          // pixel y on image
  imageW,      // image width (typically 1024)
  imageH,      // image height (typically 1024)
  basePx       // base tile size (256 or 512, default 512)
);
```

**Important**: Downloaded images are 1024px (512@2x), but the base tile size is 512px. Always pass `imageW: 1024, imageH: 1024, basePx: 512` when converting ML prediction pixels.

## ML Prediction to GeoJSON

Convert Roboflow predictions (pixel coordinates) to GeoJSON features:

```typescript
import { predictionToFeature } from './lib/tiles';

const { point, polygon } = predictionToFeature(
  z,                    // tile zoom
  x,                    // tile x
  y,                    // tile y
  prediction,           // RoboflowPrediction with x, y, width, height, class, confidence
  1024,                 // image width
  1024,                 // image height
  { 
    includePolygon: false,  // set true to include bbox polygon
    basePx: 512             // base tile size
  }
);
```

Returns a GeoJSON Point feature (and optionally a Polygon feature for the bounding box).

## Tile Generation

### Generate Tiles in Radius

Generate all tiles within a radius of a center point:

```typescript
import { tilesInRadiusFromPoint } from './lib/tiles';

const coverage = tilesInRadiusFromPoint(
  latitude,
  longitude,
  radius,        // number of tiles radius (e.g., 2 = 5x5 grid)
  zoom,          // optional, defaults to 16
  { accessToken: mapboxToken }  // optional Mapbox config
);

// Returns:
// {
//   zoom: number,
//   tiles: Array<{ z, x, y, url }>,
//   cols: number,
//   rows: number
// }
```

### Find Tiles Intersecting Viewport

Find all tiles that intersect a bounding box:

```typescript
import { tilesIntersectingBbox } from './lib/tiles';

const tiles = tilesIntersectingBbox(
  {
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number
  },
  zoom
);
// Returns: Array<{ z: number, x: number, y: number }>
```

Handles dateline crossing automatically by splitting into two ranges if `minLng > maxLng`.

## Distance Calculations

Spatial utilities are in `convex/lib/spatial.ts`.

### Haversine Distance

Calculate great-circle distance between two lat/lng points:

```typescript
import { haversineMeters } from './lib/spatial';

const distanceMeters = haversineMeters(
  { lat: 37.7749, lng: -122.4194 },
  { lat: 40.7128, lng: -74.0060 }
);
// Returns distance in meters
```

Uses Earth mean radius R = 6,371,000 meters.

### Meters to Degrees

Convert meters to latitude/longitude degrees:

```typescript
import { metersToLatDegrees, metersToLngDegrees } from './lib/spatial';

const latDegrees = metersToLatDegrees(meters);
// Returns: meters / 111,320

const lngDegrees = metersToLngDegrees(meters, atLatitude);
// Returns: meters / (111,320 * cos(latitude))
// Note: longitude degrees vary by latitude
```

## Deduplication Algorithm

The project uses a sophisticated proximity-based deduplication algorithm for clustering nearby ML predictions. See `convex/inferences.ts` for the full implementation.

### Key Concepts

1. **Per-class radii**: Different court types have different deduplication radii (defined in `MARKER_DEDUP_RADIUS_BY_CLASS_M`)
2. **Confidence tie-breaking**: When confidences are within `MARKER_DEDUP_CONFIDENCE_TIE_EPSILON` (0.05), prefer higher zoom level
3. **Spatial hashing**: Uses a grid-based approach for efficient neighbor lookup
4. **Two-pass clustering**: 
   - First pass: Build groups incrementally as features are processed
   - Second pass: Merge groups whose centroids are still within radius

### Configuration

```typescript
// From convex/lib/constants.ts

MARKER_DEDUP_BASE_RADIUS_M = 20;  // Default radius in meters
MARKER_DEDUP_CONFIDENCE_TIE_EPSILON = 0.05;

MARKER_DEDUP_RADIUS_BY_CLASS_M = {
  'basketball-court': 10,      // meters
  'tennis-court': 8,
  'soccer-ball-field': 16,
  'baseball-diamond': 32,
  'ground-track-field': 16,
};
```

### Algorithm Steps

1. Convert all predictions to GeoJSON Point features
2. Build spatial hash grid using max radius (to ensure neighbor search doesn't miss larger radii)
3. For each feature:
   - Find candidate groups in current cell and 8 neighbors
   - Check if feature is within class-specific radius of any group centroid
   - If yes, attach to closest group and update aggregates
   - If no, create new group
4. Final consolidation pass: Merge groups of same class whose centroids are within radius

### Group Aggregates

Each deduplicated group tracks:
- `sourceCount`: Number of original predictions merged
- `maxConfidence`: Highest confidence among sources
- `avgConfidence`: Average confidence
- `centroidLat/Lng`: Centroid of all source points
- `representative`: Best representative point (highest confidence, or highest zoom on tie)
- `models`: Set of model names that contributed
- `zRange`: [minZoom, maxZoom] of sources

## Tile URL Generation

Generate Mapbox tile URLs:

```typescript
import { styleTileUrl } from './lib/tiles';

const url = styleTileUrl(z, x, y, {
  username: 'mapbox',
  styleId: 'satellite-v9',
  tileSize: 512,
  accessToken: mapboxToken
});
```

Defaults are in `MAPBOX_TILE_DEFAULTS` constant.

## Common Patterns

### Processing Predictions for a Tile

```typescript
// 1. Get tile coordinates
const tile = pointToTile(lat, lng, zoom);

// 2. Get predictions from database (already stored with pixel coords)
const predictions = await ctx.db
  .query('inference_predictions')
  .withIndex('by_tile', (q) => q.eq('tileId', tileId))
  .collect();

// 3. Convert each to GeoJSON
for (const pred of predictions) {
  const { point } = predictionToFeature(
    tile.z,
    tile.x,
    tile.y,
    {
      x: pred.x,
      y: pred.y,
      width: pred.width,
      height: pred.height,
      class: pred.class,
      confidence: pred.confidence,
      detection_id: pred.roboflowDetectionId,
    },
    1024,  // image width
    1024,  // image height
    { basePx: 512 }
  );
  // Use point.geometry.coordinates for [lng, lat]
}
```

### Finding Tiles in Viewport

```typescript
// User's map viewport
const bbox = {
  minLat: 37.7,
  minLng: -122.5,
  maxLat: 37.8,
  maxLng: -122.4,
};

// Find all tiles at zoom 16 that intersect viewport
const tiles = tilesIntersectingBbox(bbox, 16);

// Query predictions for these tiles
for (const tile of tiles) {
  const tileRecord = await ctx.db
    .query('tiles')
    .withIndex('by_tile', (q) => 
      q.eq('x', tile.x).eq('y', tile.y).eq('z', tile.z)
    )
    .unique();
  
  if (tileRecord) {
    // Process predictions for this tile
  }
}
```

## Key Files

- `convex/lib/tiles.ts` - Core tile coordinate utilities
- `convex/lib/spatial.ts` - Distance and unit conversion utilities
- `convex/lib/constants.ts` - Deduplication configuration and defaults
- `convex/inferences.ts` - Deduplication algorithm implementation

## Coordinate System Notes

- **Latitude**: Clamped to Web Mercator limits (-85.05112878 to 85.05112878)
- **Longitude**: -180 to 180 degrees
- **Tile bounds**: Use `tileToLngLatBounds()` for accurate bounds (accounts for Mercator projection)
- **Pixel coordinates**: ML predictions use pixel coordinates where (0,0) is top-left of the image
