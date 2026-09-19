import { describe, expect, it } from 'vitest';
import {
  pixelOnTileToLngLat,
  pointToTile,
  predictionToFeature,
  styleTileUrl,
  tileCenterLatLng,
  tileToLngLatBounds,
  tilesInRadiusFromTile,
  tilesInRadiusFromPoint,
  tilesIntersectingBbox,
} from './tiles';

describe('Convex tile helpers', () => {
  it('converts coordinates to a web mercator tile with latitude clamping', () => {
    expect(pointToTile(0, 0, 1)).toEqual({ z: 1, x: 1, y: 1 });
    expect(pointToTile(90, 0, 1)).toEqual({ z: 1, x: 1, y: 0 });
  });

  it('builds Mapbox style tile URLs and requires a token', () => {
    expect(
      styleTileUrl(1, 2, 3, {
        username: 'mapbox',
        styleId: 'satellite-v9',
        tileSize: 512,
        accessToken: 'token',
      })
    ).toBe(
      'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/1/2/3@2x?access_token=token'
    );

    expect(() => styleTileUrl(1, 2, 3, { accessToken: '' })).toThrow(
      'Mapbox access token is required'
    );
  });

  it('enumerates tiles around a center tile without crossing world bounds', () => {
    expect(
      tilesInRadiusFromTile(
        { z: 1, x: 0, y: 0 },
        1,
        { accessToken: 'token' }
      ).tiles.map(({ x, y }) => ({ x, y }))
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('enumerates tiles around a point', () => {
    const result = tilesInRadiusFromPoint(0, 0, 0, 1, { accessToken: 'token' });

    expect(result).toMatchObject({
      zoom: 1,
      cols: 1,
      rows: 1,
      tiles: [{ z: 1, x: 1, y: 1 }],
    });
  });

  it('returns tile bounds and center coordinates', () => {
    expect(tileToLngLatBounds(1, 0, 0)).toMatchObject({
      west: -180,
      east: 0,
    });
    expect(tileCenterLatLng(0, 0, 0)).toEqual({ lat: 0, lng: 0 });
  });

  it('converts pixels on a tile into geographic coordinates', () => {
    const point = pixelOnTileToLngLat(0, 0, 0, 256, 256, 512, 512, 512);

    expect(point.lon).toBeCloseTo(0);
    expect(point.lat).toBeCloseTo(0);
  });

  it('converts predictions into point and polygon GeoJSON features', () => {
    const feature = predictionToFeature(
      0,
      0,
      0,
      {
        x: 256,
        y: 256,
        width: 128,
        height: 128,
        confidence: 0.9,
        class: 'tennis-court',
        class_id: 1,
        detection_id: 'prediction-1',
      },
      512,
      512,
      { includePolygon: true, basePx: 512 }
    );

    expect(feature.point.geometry.coordinates[0]).toBeCloseTo(0);
    expect(feature.point.properties).toMatchObject({
      class: 'tennis-court',
      confidence: 0.9,
    });
    expect(feature.polygon?.geometry.coordinates[0]).toHaveLength(5);
  });

  it('enumerates tiles intersecting ordinary and dateline-crossing bboxes', () => {
    expect(
      tilesIntersectingBbox(
        { minLat: -1, minLng: -1, maxLat: 1, maxLng: 1 },
        1
      )
    ).toEqual([
      { z: 1, x: 0, y: 0 },
      { z: 1, x: 0, y: 1 },
      { z: 1, x: 1, y: 0 },
      { z: 1, x: 1, y: 1 },
    ]);

    expect(
      tilesIntersectingBbox(
        { minLat: -1, minLng: 179, maxLat: 1, maxLng: -179 },
        1
      )
    ).toEqual(expect.arrayContaining([{ z: 1, x: 0, y: 0 }]));
  });
});
