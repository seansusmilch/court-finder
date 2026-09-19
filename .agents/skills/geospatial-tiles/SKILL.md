---
name: geospatial-tiles
description: Court Finder geospatial tile guidance. Use when working with Web Mercator tiles, Mapbox satellite tile URLs, tile/image pixel conversions, viewport bounding boxes, court prediction coordinates, spatial math, or deduplication.
---

# Geospatial Tiles

Use this skill for tile, coordinate, and court-location work.

## Core Files

- `convex/lib/tiles.ts`: Web Mercator tile conversion, Mapbox URL generation, pixel-to-lng/lat conversion, GeoJSON conversion, viewport tile enumeration.
- `convex/lib/spatial.ts`: haversine distance and meters-to-degree helpers.
- `convex/lib/constants.ts`: `MAPBOX_TILE_DEFAULTS`, default radius, model config, bbox threshold, and legacy deduplication radii.
- `convex/inferences.ts`: viewport feature output for courts.
- `convex/inference_predictions.ts`, `convex/courts.ts`, and `convex/lib/bbox.ts`: current prediction-to-court linking through pixel bbox overlap.
- `convex/scans.ts` and `convex/actions.ts`: scan lifecycle and tile processing.

## Tile System

- Coordinates use Web Mercator `z/x/y`.
- Default zoom is `MAPBOX_TILE_DEFAULTS.zoom` (`16`).
- Mapbox satellite defaults are `username: "mapbox"`, `styleId: "satellite-v9"`, and `tileSize: 512`.
- Mapbox URLs request `@2x`, so a 512 base tile is downloaded as a 1024px image.
- Clamp latitude to Web Mercator limits before converting to tile Y.

## Utility Patterns

```ts
import {
  pointToTile,
  tileToLngLatBounds,
  tileCenterLatLng,
  pixelOnTileToLngLat,
  predictionToFeature,
  tilesIntersectingBbox,
  styleTileUrl,
} from './lib/tiles';
```

- Use `pointToTile(lat, lng, zoom)` for lat/lng to tile coordinates.
- Use `tileToLngLatBounds(z, x, y)` for tile bounds.
- Use `tileCenterLatLng(z, x, y)` for geocoding or display centers.
- Use `tilesIntersectingBbox(bbox, zoom)` for viewport coverage; it handles dateline crossing.
- Use `styleTileUrl(z, x, y, { accessToken })` for Mapbox satellite images.

## Prediction Pixels

Roboflow predictions are pixel coordinates on the downloaded tile image. For Mapbox defaults, pass:

```ts
predictionToFeature(z, x, y, prediction, 1024, 1024, {
  includePolygon: false,
  basePx: 512,
});
```

Use `[lng, lat]` ordering in GeoJSON coordinates.

## Court Linking And Spatial Behavior

- Distances use meters and haversine math.
- Longitude degrees vary by latitude; use `metersToLngDegrees(meters, lat)` rather than a fixed conversion.
- Current prediction linking happens during `inference_predictions.upsert`: find an existing same-tile, same-class court whose pixel bounding box overlaps by `BBOX_OVERLAP_THRESHOLD` (`0.75`), otherwise create a pending court from the prediction.
- The proximity deduplication constants in `convex/lib/constants.ts` still exist but should be treated as legacy or migration-related unless current call sites require them.
- Current viewport features are emitted from court records and filtered by status, bbox, confidence threshold, and available tile linkage.

## Verification

Run focused spatial tests first:

```bash
bun run test convex/lib/tiles.test.ts convex/lib/spatial.test.ts src/lib/tiles.test.ts
bun check-types
```
