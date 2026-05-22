import { describe, expect, it } from 'vitest';
import { haversineMeters, metersToLatDegrees, metersToLngDegrees } from './spatial';

describe('spatial helpers', () => {
  it('converts meters to latitude degrees using the configured approximation', () => {
    expect(metersToLatDegrees(111_320)).toBe(1);
  });

  it('converts meters to longitude degrees relative to latitude', () => {
    expect(metersToLngDegrees(111_320, 0)).toBeCloseTo(1);
    expect(metersToLngDegrees(111_320, 60)).toBeCloseTo(2);
  });

  it('calculates haversine distance in meters', () => {
    const meters = haversineMeters(
      { lat: 41.8781, lng: -87.6298 },
      { lat: 42.0451, lng: -87.6877 }
    );

    expect(meters).toBeGreaterThan(18_000);
    expect(meters).toBeLessThan(20_000);
  });
});
