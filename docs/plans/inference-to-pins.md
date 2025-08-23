## Plan: Convert Roboflow inferences to lon/lat and render with react-mapbox-gl

### Goal

Transform Roboflow inference pixel coordinates into geographic coordinates tied to Mapbox style tiles (z/x/y), expose them via Convex, and render markers on the client using `react-mapbox-gl`.

### Context

- We already fetch imagery via Mapbox style tiles at zoom and z/x/y, not bbox static images [[memory:6677183]].
- Relevant utilities exist in `packages/backend/convex/lib/tiles.ts` for z/x/y math and tile URL generation.
- Roboflow returns predictions with pixel-space centers and sizes: `{ x, y, width, height }` plus the processed image `{ width, height }`.
- Our tile URLs use `tileSize = 512` and append `@2x`, so downloaded images are typically 1024×1024 while the logical tile base is 512 px.

### Roboflow response shape

- image: `{ width: number, height: number }` in pixels. Use these as `W` and `H` for normalization.
- predictions: array of objects with:
  - `x`, `y`: center point in pixels within the image (origin at top-left).
  - `width`, `height`: bounding box size in pixels.
  - `class`, `class_id`, `confidence`, `detection_id`.
- Use floating-point math throughout; do not round. The sample shows `W = H = 1024`, matching our `512@2x` tile download size.
- Bounding box corners (for optional polygon):
  - `left = x - width / 2`, `right = x + width / 2`
  - `top = y - height / 2`, `bottom = y + height / 2`
  - Convert each corner via the same normalization and lon/lat conversion.

### Coordinate conversion design

1. Definitions

- n = 2^z
- Base tile pixel size per tile: basePx = 512 (match the `tileSize` parameter we request from Mapbox style tiles)
- Image pixel width/height from Roboflow: W, H (often W = H = 1024 when requesting 512@2x)
- Tile index: (z, xTile, yTile)
- Roboflow pixel center: (px, py) in the image (origin top-left)

2. Normalize Roboflow pixels into base tile pixels

- pxBase = px \* (basePx / W)
- pyBase = py \* (basePx / H)

3. Convert to world tile fraction and then lon/lat

- lon = ((xTile + pxBase / basePx) / n) \* 360 - 180
- mercY = (yTile + pyBase / basePx) / n
- latRad = atan(sinh(PI _ (1 - 2 _ mercY)))
- lat = latRad \* 180 / PI

Notes:

- Pixel origin is top-left; `py` increases downward. The formula above already accounts for Web Mercator's Y direction.
- Make sure to convert radians to degrees for latitude.

4. Bounding box corners (optional for polygons)

- Define left/right = px ± width/2, top/bottom = py ± height/2
- Convert the four corners with the same normalization to get a polygon overlay

5. Clamp latitude to Web Mercator bounds (±85.05112878) where applicable

6. Tile bounds (useful for validation and spatial filters)

- west = (xTile / n) \* 360 - 180
- east = ((xTile + 1) / n) \* 360 - 180
- northRad = atan(sinh(PI _ (1 - 2 _ (yTile / n))))
- southRad = atan(sinh(PI _ (1 - 2 _ ((yTile + 1) / n))))
- north = northRad \* 180 / PI
- south = southRad \* 180 / PI

### Backend tasks (Convex)

- `packages/backend/convex/lib/tiles.ts`
  - Add helpers:
    - `tileToLngLatBounds(z, x, y)` → `{ west, south, east, north }`
    - `pixelOnTileToLngLat(z, x, y, px, py, imageW, imageH, basePx = 512)` → `{ lon, lat }`
    - `predictionToFeature(z, x, y, prediction, imageW, imageH)` → GeoJSON Point (center) and optionally Polygon (bounds)
- `packages/backend/convex/inferences.ts`
  - New query: `featuresByViewport({ bbox, zoom, model, version })`
    - Compute intersecting tiles for `bbox` at `zoom` using existing tile math
    - Fetch latest inference docs per tile (existing `getLatestByTile`)
    - For each prediction in each tile, convert to GeoJSON Point features
    - Return a `FeatureCollection`
  - Optional: during `upsert`, precompute and store features to avoid recompute on read
  - Optional: also expose `featuresByTile({ z, x, y, model, version })` returning features for a specific tile (useful for debugging/tests)

Data notes:

- Persist and read `response.image.width`/`response.image.height` for each tile when converting predictions, to ensure proper normalization from Roboflow pixels → base tile pixels.

### Client tasks (web)

- Install and wire map component
  - Add dependencies: `react-mapbox-gl`, `mapbox-gl`, CSS import per docs
  - Create a `Map` component using `ReactMapboxGl({ accessToken })`
  - Cite: react-mapbox-gl usage from the repository docs [`alex3165/react-mapbox-gl`](https://github.com/alex3165/react-mapbox-gl)
- Fetch and render features
  - On map move/end, derive viewport bbox and current zoom (snap/ceil to tile zoom you inferenced at)
  - Call Convex query `featuresByViewport` to get a GeoJSON `FeatureCollection`
  - Add a `Source`/`Layer` or `GeoJSONLayer` for points (e.g., a symbol layer) and render
  - Optionally add a second layer for polygons if we compute bounding boxes

Zoom strategy:

- If inferences are generated at a fixed zoom (e.g., 15), fetch/render features at that zoom. For lower zooms, consider clustering or thinning to reduce overdraw.

### Minimal API shapes

- Query: `inferences.featuresByViewport({ bbox: { minLat, minLng, maxLat, maxLng }, zoom, model, version }) -> FeatureCollection`
- Feature properties: `{ id, confidence, class, z, x, y }` for filtering/styling

### Validation and QA

- Unit tests for conversion:
  - Known tile center should map close to expected lon/lat
  - Pixel (0,0) maps to tile NW corner; pixel (W,H) maps to SE corner
  - Consistency across W/H = 512 vs 1024 (with proper normalization)
- Visual validation: render features atop the tiles; markers should sit centered on detected objects

Test harnesses:

- Update/ensure `poc/roboflow-inference.ts` logs and stores `image.width`/`image.height` with predictions for later conversion.
- Add a small script to convert a few hand-picked predictions and print lon/lat; verify in a map tool the points land on expected objects.

### Edge cases

- Imagery scale mismatches (ensure we always pass `image.width`/`image.height` from Roboflow)
- Dateline crossing when building viewports (split bbox if needed)
- Latitude clamping near poles
- Multiple zoom levels: only request features at the zoom that matches inference tiles, or implement multi-zoom merging
- Off-by-one at tile borders: avoid flooring/ceiling normalized `pxBase`/`pyBase`; keep fractional positions to ensure continuity across tile edges.

### Rollout steps

1. Implement conversion helpers in `tiles.ts`
2. Implement `featuresByViewport` Convex query
3. Wire frontend map and feature fetching; render markers
4. Add unit tests for conversions; manual visual check on a few tiles
5. Optional optimizations: server-side caching of FeatureCollections per tile

### Notes

- Keep using style tiles (z/x/y) with 512 tile size and `@2x` for consistent, gapless coverage [[memory:6677183]].

Reference:

- `react-mapbox-gl` repository and docs: [`alex3165/react-mapbox-gl`](https://github.com/alex3165/react-mapbox-gl)
