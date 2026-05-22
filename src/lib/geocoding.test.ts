import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocode } from './geocoding';

describe('reverseGeocode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first place name from Mapbox results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          features: [{ place_name: 'Chicago, Illinois, United States' }],
        }),
      })
    );

    await expect(reverseGeocode(41.8781, -87.6298)).resolves.toBe('Chicago');
  });

  it('falls back to formatted coordinates when no feature exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ features: [] }),
      })
    );

    await expect(reverseGeocode(41.87814, -87.62982)).resolves.toBe(
      '41.8781, -87.6298'
    );
  });

  it('falls back to formatted coordinates when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    await expect(reverseGeocode(41.87814, -87.62982)).resolves.toBe(
      '41.8781, -87.6298'
    );
  });
});
