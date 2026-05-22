import { describe, expect, it } from 'vitest';
import { tileCenterLatLng } from './tiles';

describe('tileCenterLatLng', () => {
  it('returns the center of the world tile at zoom zero', () => {
    expect(tileCenterLatLng(0, 0, 0)).toEqual({ lat: 0, lng: 0 });
  });

  it('returns the center of a known web mercator tile', () => {
    const center = tileCenterLatLng(2, 1, 1);

    expect(center.lng).toBeCloseTo(-45);
    expect(center.lat).toBeCloseTo(33.2566, 4);
  });
});
