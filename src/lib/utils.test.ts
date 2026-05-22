import { describe, expect, it } from 'vitest';
import { calculateDistance, cn, formatDistance } from './utils';

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2 text-sm', false && 'hidden', 'px-4')).toBe('text-sm px-4');
  });
});

describe('calculateDistance', () => {
  it('returns zero for the same coordinate', () => {
    expect(calculateDistance(41.8781, -87.6298, 41.8781, -87.6298)).toBe(0);
  });

  it('calculates an approximate distance between Chicago and Evanston', () => {
    const distanceKm = calculateDistance(41.8781, -87.6298, 42.0451, -87.6877);

    expect(distanceKm).toBeGreaterThan(18);
    expect(distanceKm).toBeLessThan(20);
  });
});

describe('formatDistance', () => {
  it('formats short imperial distances in feet', () => {
    expect(formatDistance(0.03, 'imperial')).toBe('98 ft away');
  });

  it('formats longer imperial distances in miles', () => {
    expect(formatDistance(5, 'imperial')).toBe('3.1 mi away');
  });

  it('formats short metric distances in meters', () => {
    expect(formatDistance(0.04, 'metric')).toBe('40 m away');
  });

  it('formats longer metric distances in kilometers', () => {
    expect(formatDistance(1.234, 'metric')).toBe('1.2 km away');
  });
});
