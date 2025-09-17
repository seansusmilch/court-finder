# Marker Deduplication Plan (Practical and Implementable)

Goal: when two or more detections of the same sport fall within a small distance, render just one marker at high zoom. This removes obvious duplicates like “two ⚾ pins on the same infield” while keeping distinct neighboring courts.

This rewrite abandons the complex cross-zoom cross-model canonicalization and focuses on a small, reliable server-side grouping step inside `featuresByViewport`, with an optional lightweight client fallback.

## Problem (summarized)
- Detections are stored per tile (`inference_predictions` → `tiles`).
- When areas are scanned multiple times or sit on tile borders, multiple detections map to almost the same lat/lng.
- Frontend renders all unclustered points at high zoom, so duplicates show as separate pins.

## What we will do
Perform proximity-based grouping by class on the server right before returning GeoJSON, using a simple grid-and-neighbor check measured in meters. Keep it deterministic and fast.

---

## Algorithm (server)
1) Build raw points
   - For tiles intersecting the viewport, convert each prediction to a point using `predictionToFeature(z, x, y, ...)`. Attach properties: `class`, `confidence`, `model`, `version`, and the tile `z`.

2) Grid bucket in meters
   - Compute grid cell size from a radius in meters (default 12 m). Convert meters→degrees using the viewport center latitude: `latDeg = meters / 111320`, `lngDeg = meters / (111320 * cos(centerLat))`.
   - For each point, compute a cell key by `floor(lat / latDeg)` and `floor(lng / lngDeg)`.

3) Neighbor merge by class
   - For each point, look in its cell and the 8 neighboring cells for existing groups of the same `class`.
   - If any group’s representative is within `radiusMeters` by haversine distance, attach the point to that group; otherwise start a new group.

4) Pick group representative
   - Primary: highest `confidence`.
   - Tie within 0.05 confidence: prefer higher `z` (more precise position).
   - Final tie: first encountered for stability.
   - Representative coordinates are those of the chosen member.

5) Output
   - Return only representatives as GeoJSON points.
   - Add aggregated properties for transparency and optional UI:
     - `sourceCount` (number of detections merged)
     - `maxConfidence`, `avgConfidence`
     - `models` (unique set) and `zRange` (min/max)

This is O(n) with a small constant because each point checks at most 9 buckets.

### Parameters
- `DEDUP_RADIUS_METERS` (default 12)
- Optional per-class overrides:
  - basketball 10, tennis 12, soccer/football 16, baseball 16, pool/track 16
- `CONFIDENCE_TIE_EPSILON` (default 0.05)

---

## Implementation plan

### 1) Add spatial helpers (`convex/lib/spatial.ts`)
Minimal functions that avoid external deps and are easy to test:

```ts
export function metersToLatDegrees(meters: number) {
  return meters / 111_320;
}

export function metersToLngDegrees(meters: number, atLat: number) {
  return meters / (111_320 * Math.max(0.01, Math.cos((atLat * Math.PI) / 180)));
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000; // meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
```

### 2) Update `featuresByViewport` (server)
- After building `features` (as done today), run the grouping pass described above:
  - Compute center latitude from `args.bbox`.
  - Choose `radiusMeters` per class (or default).
  - Bucket points, merge by neighbor check and class, then select representatives using the tie rules.
- Return the reduced set. Keep clustering on the client unchanged.

Properties to include on each representative:
```ts
{
  class: string,
  confidence: number, // of representative
  model?: string,
  version?: string,
  z?: number,
  sourceCount: number,
  maxConfidence: number,
  avgConfidence: number,
  models?: string[],
  zRange?: [number, number],
}
```

### 3) Constants (`convex/lib/constants.ts`)
Add:
```ts
export const DEDUP_RADIUS_METERS = 12;
export const CONFIDENCE_TIE_EPSILON = 0.05;
export const DEDUP_PER_CLASS: Record<string, number> = {
  basketball: 10,
  'tennis-court': 12,
  soccer: 16,
  football: 16,
  baseball: 16,
  pool: 16,
  track: 16,
};
```
If a class key is missing, fall back to `DEDUP_RADIUS_METERS`.

### 4) Optional client safeguard
At very high zooms, we can keep Mapbox clustering enabled with a tiny radius (e.g., 12 px) to catch any leftover duplicates without changing the pin look. This is optional once server dedup is in place.

---

## Testing
- Unit tests for `haversineMeters`, meters→degrees conversion, and the grouping logic with synthetic data.
- Visual QA on known duplicate areas (like the example baseball diamond) to verify only one pin remains.
- Ensure performance: typical viewport (hundreds of points) should group in a few milliseconds.

---

## Notes on data model
The existing schema (`inference_predictions` joined to `tiles`) already carries everything needed for this approach. No table changes are required.

---

## Rollout
1) Implement the helpers and the grouping step behind a flag if desired.
2) Ship to staging and compare pin counts before/after on duplicate hotspots.
3) Enable in production.

This plan is intentionally small and targeted so we can deliver an immediate improvement: close-together markers of the same type will collapse into one marker without changing the broader architecture.
